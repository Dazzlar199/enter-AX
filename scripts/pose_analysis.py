import json
import sys
import warnings

import cv2
import librosa
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from scipy.signal import find_peaks

warnings.filterwarnings("ignore")

MODEL_PATH = "assets/models/pose_landmarker_lite.task"
SAMPLE_FPS = 5
BEAT_SYNC_TOLERANCE_SEC = 0.25

# MediaPipe Pose landmark indices used for movement analysis.
LEFT_WRIST, RIGHT_WRIST = 15, 16
LEFT_ANKLE, RIGHT_ANKLE = 27, 28
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_HIP, RIGHT_HIP = 23, 24
TRACKED = [LEFT_WRIST, RIGHT_WRIST, LEFT_ANKLE, RIGHT_ANKLE]


def analyze_pose(video_path):
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(base_options=base_options, running_mode=vision.RunningMode.VIDEO)
    landmarker = vision.PoseLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = frame_count / fps if fps else 0
    sample_every = max(1, round(fps / SAMPLE_FPS))

    frames_data = []
    sampled = 0
    detected = 0
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % sample_every == 0:
            sampled += 1
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp_ms = int((frame_idx / fps) * 1000)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)
            if result.pose_landmarks:
                detected += 1
                landmarks = result.pose_landmarks[0]
                points = {i: (landmarks[i].x, landmarks[i].y) for i in TRACKED}
                shoulders = [(landmarks[i].x, landmarks[i].y) for i in (LEFT_SHOULDER, RIGHT_SHOULDER)]
                hips = [(landmarks[i].x, landmarks[i].y) for i in (LEFT_HIP, RIGHT_HIP)]
                torso = shoulders + hips
                torso_xs = [p[0] for p in torso]
                torso_ys = [p[1] for p in torso]
                frames_data.append({
                    "t": frame_idx / fps,
                    "points": points,
                    "frame_box": (min(torso_xs), min(torso_ys), max(torso_xs), max(torso_ys)),
                })
            else:
                frames_data.append({"t": frame_idx / fps, "points": {}, "frame_box": None})
        frame_idx += 1

    cap.release()

    detection_rate = detected / sampled if sampled else 0.0
    valid_frames = [f for f in frames_data if f["points"]]

    range_scores = []
    for idx in TRACKED:
        xs = [f["points"][idx][0] for f in valid_frames if idx in f["points"]]
        ys = [f["points"][idx][1] for f in valid_frames if idx in f["points"]]
        if len(xs) >= 2:
            range_scores.append((max(xs) - min(xs)) * (max(ys) - min(ys)))
    movement_range = float(np.clip(np.mean(range_scores) * 4, 0, 1)) if range_scores else 0.0

    # Per-timestamp instantaneous movement speed (used both for the speed score and beat-sync peak detection).
    speed_series = []  # (t, speed)
    prev = None
    for f in frames_data:
        if prev is not None and prev["points"] and f["points"]:
            deltas = []
            for idx in TRACKED:
                if idx in f["points"] and idx in prev["points"]:
                    dx = f["points"][idx][0] - prev["points"][idx][0]
                    dy = f["points"][idx][1] - prev["points"][idx][1]
                    deltas.append((dx ** 2 + dy ** 2) ** 0.5)
            if deltas:
                speed_series.append((f["t"], float(np.mean(deltas))))
        prev = f

    avg_speed = float(np.clip(np.mean([s for _, s in speed_series]) * 20, 0, 1)) if speed_series else 0.0

    def limb_amplitude(idx):
        xs = [f["points"][idx][0] for f in valid_frames if idx in f["points"]]
        ys = [f["points"][idx][1] for f in valid_frames if idx in f["points"]]
        if len(xs) < 2:
            return 0.0
        return ((max(xs) - min(xs)) ** 2 + (max(ys) - min(ys)) ** 2) ** 0.5

    left_amp = (limb_amplitude(LEFT_WRIST) + limb_amplitude(LEFT_ANKLE)) / 2
    right_amp = (limb_amplitude(RIGHT_WRIST) + limb_amplitude(RIGHT_ANKLE)) / 2
    symmetry = float(1 - abs(left_amp - right_amp) / max(left_amp, right_amp)) if max(left_amp, right_amp) > 0.001 else 0.0

    if valid_frames:
        box_areas = [(f["frame_box"][2] - f["frame_box"][0]) * (f["frame_box"][3] - f["frame_box"][1]) for f in valid_frames]
        framing_score = float(np.clip(np.mean(box_areas) * 6, 0, 1))
    else:
        framing_score = 0.0

    return {
        "durationSec": round(duration_sec, 1),
        "sampledFrames": sampled,
        "detectionRate": round(detection_rate, 3),
        "movementRange": round(movement_range, 3),
        "avgMovementSpeed": round(avg_speed, 3),
        "limbSymmetry": round(symmetry, 3),
        "framingScore": round(framing_score, 3),
    }, speed_series


def analyze_beat_sync(video_path, speed_series, max_duration=90):
    try:
        y, sr = librosa.load(video_path, sr=22050, duration=max_duration)
    except Exception:
        return {"tempoBpm": None, "beatSyncScore": None}

    if len(y) < sr * 2:
        return {"tempoBpm": None, "beatSyncScore": None}

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    tempo_value = float(tempo[0]) if hasattr(tempo, "__len__") else float(tempo)

    if len(beat_times) == 0:
        return {"tempoBpm": round(tempo_value, 1), "beatSyncScore": None}

    windowed = [(t, s) for t, s in speed_series if t <= max_duration]
    if len(windowed) < 5:
        return {"tempoBpm": round(tempo_value, 1), "beatSyncScore": None}

    times = np.array([t for t, _ in windowed])
    speeds = np.array([s for _, s in windowed])
    peak_indices, _ = find_peaks(speeds, distance=2)
    peak_times = times[peak_indices]

    if len(peak_times) == 0:
        return {"tempoBpm": round(tempo_value, 1), "beatSyncScore": 0.0}

    matched = 0
    for bt in beat_times:
        if np.any(np.abs(peak_times - bt) <= BEAT_SYNC_TOLERANCE_SEC):
            matched += 1
    beat_sync_score = matched / len(beat_times)

    return {"tempoBpm": round(tempo_value, 1), "beatSyncScore": round(float(beat_sync_score), 3)}


def main():
    video_path = sys.argv[1]
    pose_metrics, speed_series = analyze_pose(video_path)
    beat_metrics = analyze_beat_sync(video_path, speed_series)
    print(json.dumps({**pose_metrics, **beat_metrics}))


if __name__ == "__main__":
    main()
