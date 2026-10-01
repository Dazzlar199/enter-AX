import type { TranscriptChunk } from "./transcribe";

export interface RelativeCaption {
  start: number;
  end: number;
  text: string;
}

export interface MicroChunkOptions {
  maxWordsPerChunk?: number;
  maxDurationSec?: number;
}

/**
 * Splits text into rhythmic micro-chunks (2~4 words or up to ~1.8s) so subtitles
 * pace dynamically with the video, mimicking top viral YouTube Shorts / TikTok captions.
 */
export function microChunkRelativeCaptions(
  captions: RelativeCaption[],
  options: MicroChunkOptions = {},
): RelativeCaption[] {
  const maxWords = options.maxWordsPerChunk ?? 4;
  const maxDuration = options.maxDurationSec ?? 1.8;

  const result: RelativeCaption[] = [];

  for (const caption of captions) {
    const rawText = caption.text.trim();
    if (!rawText) continue;

    const duration = caption.end - caption.start;
    const words = rawText.split(/\s+/).filter(Boolean);

    // If already short enough, preserve as is
    if (words.length <= maxWords && duration <= maxDuration) {
      result.push({
        start: caption.start,
        end: caption.end,
        text: rawText,
      });
      continue;
    }

    // Group words into chunks of maxWords, respecting natural pauses at punctuation if present
    const chunks: string[] = [];
    let currentWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      currentWords.push(word);

      const hasPunctuation = /[,.!?~]$/.test(word);
      const isFull = currentWords.length >= maxWords;
      const isLast = i === words.length - 1;

      // Don't leave an awkward single word dangling at the very end if possible
      const nextIsLastAlone = i === words.length - 2 && currentWords.length >= maxWords - 1;

      if ((hasPunctuation || isFull || isLast) && !nextIsLastAlone) {
        chunks.push(currentWords.join(" "));
        currentWords = [];
      }
    }

    if (currentWords.length > 0) {
      if (chunks.length > 0 && currentWords.length === 1) {
        // Append dangling single word to previous chunk
        chunks[chunks.length - 1] += ` ${currentWords[0]}`;
      } else {
        chunks.push(currentWords.join(" "));
      }
    }

    if (chunks.length <= 1) {
      result.push({
        start: caption.start,
        end: caption.end,
        text: chunks[0] || rawText,
      });
      continue;
    }

    // Allocate time proportionally to character length
    const totalChars = chunks.reduce((sum, chunk) => sum + Math.max(1, chunk.length), 0);
    let currentStart = caption.start;

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const isFinal = i === chunks.length - 1;
      const chunkChars = Math.max(1, chunkText.length);
      const chunkDuration = isFinal
        ? Math.max(0.2, caption.end - currentStart)
        : (chunkChars / totalChars) * duration;

      const chunkEnd = isFinal ? caption.end : currentStart + chunkDuration;

      result.push({
        start: Number(currentStart.toFixed(3)),
        end: Number(chunkEnd.toFixed(3)),
        text: chunkText,
      });

      currentStart = chunkEnd;
    }
  }

  return result;
}

/** Keeps only chunks overlapping [clipStart, clipEnd] and shifts their times to be relative to clipStart. */
export function relativeCaptionsForClip(
  chunks: TranscriptChunk[],
  clipStart: number,
  clipEnd: number,
  options: MicroChunkOptions & { microChunk?: boolean } = { microChunk: true },
): RelativeCaption[] {
  const baseCaptions = chunks
    .filter((chunk) => chunk.end > clipStart && chunk.start < clipEnd)
    .map((chunk) => ({
      start: Math.max(0, chunk.start - clipStart),
      end: Math.max(0, chunk.end - clipStart),
      text: chunk.text,
    }));

  if (options.microChunk === false) {
    return baseCaptions;
  }

  return microChunkRelativeCaptions(baseCaptions, options);
}
