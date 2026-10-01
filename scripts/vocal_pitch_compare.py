import json
import sys
import warnings

import librosa
import numpy as np

warnings.filterwarnings("ignore")

SR = 22050
MAX_SECONDS = 60
FMIN = librosa.note_to_hz("C2")
FMAX = librosa.note_to_hz("C7")


def extract_relative_pitch_contour(audio_path):
    """Returns (times, cents_relative_to_own_median) for voiced frames only."""
    y, sr = librosa.load(audio_path, sr=SR, duration=MAX_SECONDS)
    f0, voiced_flag, _voiced_prob = librosa.pyin(y, fmin=FMIN, fmax=FMAX, sr=sr)
    times = librosa.times_like(f0, sr=sr)

    voiced_mask = voiced_flag & ~np.isnan(f0)
    if voiced_mask.sum() < 10:
        return None, None, 0.0

    voiced_f0 = f0[voiced_mask]
    voiced_times = times[voiced_mask]

    cents = 1200 * np.log2(voiced_f0 / 440.0)
    cents_relative = cents - np.median(cents)

    voiced_ratio = float(voiced_mask.sum() / len(voiced_mask))
    return voiced_times, cents_relative, voiced_ratio


def dtw_pitch_similarity(times_a, cents_a, times_b, cents_b):
    if times_a is None or times_b is None or len(cents_a) < 5 or len(cents_b) < 5:
        return None

    n, m = len(cents_a), len(cents_b)
    cost = np.abs(cents_a.reshape(-1, 1) - cents_b.reshape(1, -1))

    dtw = np.full((n + 1, m + 1), np.inf)
    dtw[0, 0] = 0
    for i in range(1, n + 1):
        row_cost = cost[i - 1]
        for j in range(1, m + 1):
            dtw[i, j] = row_cost[j - 1] + min(dtw[i - 1, j], dtw[i, j - 1], dtw[i - 1, j - 1])

    avg_cost_cents = dtw[n, m] / (n + m)
    avg_cost_semitones = avg_cost_cents / 100

    # 0 semitones off -> 1.0 similarity, >=2.5 semitones average error -> ~0.
    similarity = float(np.clip(1 - avg_cost_semitones / 2.5, 0, 1))
    return similarity


def main():
    reference_path = sys.argv[1]
    candidate_path = sys.argv[2]

    ref_times, ref_cents, ref_voiced_ratio = extract_relative_pitch_contour(reference_path)
    cand_times, cand_cents, cand_voiced_ratio = extract_relative_pitch_contour(candidate_path)

    similarity = dtw_pitch_similarity(ref_times, ref_cents, cand_times, cand_cents)

    print(json.dumps({
        "referenceVoicedRatio": round(ref_voiced_ratio, 3),
        "candidateVoicedRatio": round(cand_voiced_ratio, 3),
        "pitchMatchScore": round(similarity, 3) if similarity is not None else None,
    }))


if __name__ == "__main__":
    main()
