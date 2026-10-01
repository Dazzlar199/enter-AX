import json
import sys
import warnings

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

warnings.filterwarnings("ignore")

MODEL_PATH = "assets/models/pose_landmarker_lite.task"
SAMPLE_FPS = 8

# Joint triplets (a, b, c) used to compute the angle at joint b - these are invariant to
# the dancer's screen position/size, unlike raw x/y coordinates, so they can be compared
# across two different videos/cameras/framings.
ANGLE_TRIPLETS = {
    "left_elbow": (11, 13, 15),
    "right_elbow": (12, 14, 16),
    "left_shoulder": (23, 11, 13),
    "right_shoulder": (24, 12, 14),
    "left_hip": (11, 23, 25),
    "right_hip": (12, 24, 26),
    "left_knee": (23, 25, 27),
    "right_knee": (24, 26, 28),
}


def angle(a, b, c):
    ba = np.array(a) - np.array(b)
    bc = np.array(c) - np.array(b)
    denom = (np.linalg.norm(ba) * np.linalg.norm(bc)) or 1e-6
    cos_angle = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_angle)))


MAX_COMPARE_SECONDS = 45


def extract_angle_sequence(video_path, landmarker):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    sample_every = max(1, round(fps / SAMPLE_FPS))

    sequence = []  # list of dict(name -> angle) per sampled+detected frame
    frame_idx = 0
    while True:
        if frame_idx / fps > MAX_COMPARE_SECONDS:
            break
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % sample_every == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp_ms = int((frame_idx / fps) * 1000)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)
            if result.pose_landmarks:
                lm = result.pose_landmarks[0]
                frame_angles = {}
                for name, (a, b, c) in ANGLE_TRIPLETS.items():
                    pa = (lm[a].x, lm[a].y)
                    pb = (lm[b].x, lm[b].y)
                    pc = (lm[c].x, lm[c].y)
                    frame_angles[name] = angle(pa, pb, pc)
                sequence.append(frame_angles)
        frame_idx += 1
    cap.release()
    return sequence


def sequence_to_matrix(sequence):
    names = list(ANGLE_TRIPLETS.keys())
    return np.array([[f[n] for n in names] for f in sequence])


def dtw_similarity(seq_a, seq_b):
    """Dynamic Time Warping alignment cost between two angle-sequence matrices, normalized to a 0-1 similarity score."""
    a = sequence_to_matrix(seq_a)
    b = sequence_to_matrix(seq_b)
    if len(a) < 3 or len(b) < 3:
        return None

    n, m = len(a), len(b)
    # Per-frame cost = mean absolute angle difference (degrees) across tracked joints.
    cost = np.zeros((n, m))
    for i in range(n):
        cost[i] = np.mean(np.abs(b - a[i]), axis=1)

    dtw = np.full((n + 1, m + 1), np.inf)
    dtw[0, 0] = 0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            dtw[i, j] = cost[i - 1, j - 1] + min(dtw[i - 1, j], dtw[i, j - 1], dtw[i - 1, j - 1])

    path_len = n + m
    avg_cost_per_step = dtw[n, m] / path_len

    # avg_cost_per_step is in degrees of average joint-angle error along the best alignment path.
    # Map it to a 0-1 similarity score: 0 deg error -> 1.0, >=60 deg average error -> ~0.
    similarity = float(np.clip(1 - avg_cost_per_step / 60, 0, 1))
    return similarity


def main():
    reference_path = sys.argv[1]
    candidate_path = sys.argv[2]

    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(base_options=base_options, running_mode=vision.RunningMode.VIDEO)

    landmarker_ref = vision.PoseLandmarker.create_from_options(options)
    ref_sequence = extract_angle_sequence(reference_path, landmarker_ref)
    landmarker_ref.close()

    landmarker_cand = vision.PoseLandmarker.create_from_options(options)
    cand_sequence = extract_angle_sequence(candidate_path, landmarker_cand)
    landmarker_cand.close()

    similarity = dtw_similarity(ref_sequence, cand_sequence)

    print(json.dumps({
        "referenceFrames": len(ref_sequence),
        "candidateFrames": len(cand_sequence),
        "choreoMatchScore": round(similarity, 3) if similarity is not None else None,
    }))


if __name__ == "__main__":
    main()
