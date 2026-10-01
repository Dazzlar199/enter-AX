export interface HighlightWindow {
  start: number;
  end: number;
  score: number;
}

/**
 * Scores fixed-length sliding windows over the audio by RMS energy and
 * returns the top non-overlapping windows, ordered by start time.
 *
 * This is a signal-processing heuristic (loudness/energy), not a trained
 * ML model: it finds the loudest, most sonically dense moments in the
 * track as a proxy for a "killing part" / chorus-style highlight.
 */
export function findHighlightWindows(
  samples: Float32Array,
  sampleRate: number,
  windowSeconds: number,
  topN: number,
): HighlightWindow[] {
  const windowSize = Math.max(1, Math.floor(windowSeconds * sampleRate));
  const hopSize = Math.max(1, Math.floor(windowSize / 4));
  const totalDuration = samples.length / sampleRate;

  if (samples.length < windowSize) {
    return [{ start: 0, end: totalDuration, score: 0 }];
  }

  const candidates: HighlightWindow[] = [];
  for (let start = 0; start + windowSize <= samples.length; start += hopSize) {
    let sumSquares = 0;
    for (let i = start; i < start + windowSize; i++) {
      sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    candidates.push({
      start: start / sampleRate,
      end: (start + windowSize) / sampleRate,
      score: rms,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  const selected: HighlightWindow[] = [];
  for (const candidate of candidates) {
    const overlaps = selected.some(
      (picked) => candidate.start < picked.end && candidate.end > picked.start,
    );
    if (!overlaps) selected.push(candidate);
    if (selected.length >= topN) break;
  }

  return selected.sort((a, b) => a.start - b.start);
}
