import path from "node:path";

import { decodeWavToFloat32, extractMonoWav } from "./audio";
import {
  cutClipWithCaptions,
  cutStructuredClip,
  type AspectRatio,
  type CaptionStylePreset,
  type ClipOverlay,
  type LayoutMode,
} from "./clip";
import { findHighlightWindows } from "./highlight";
import { planShortformStructure, type PlanSegment } from "./plan";
import { transcribeAudio, type TranscriptChunk } from "./transcribe";

const CLIP_COUNT = 3;

export interface PipelineClip {
  index: number;
  start: number;
  end: number;
  score: number;
  url: string;
}

export interface PipelineResult {
  transcript: string;
  transcriptChunks: TranscriptChunk[];
  plan?: PlanSegment[];
  contentType?: string;
  clips: PipelineClip[];
}

/** Runs the full shortform pipeline (transcribe -> highlight/plan -> caption+overlay burn-in) on an already-downloaded source video. */
export async function runShortformPipeline(options: {
  sourcePath: string;
  tempDir: string;
  outputDir: string;
  jobId: string;
  windowSeconds: number;
  aspectRatio: AspectRatio;
  usePlanning: boolean;
  overlay?: ClipOverlay;
  purpose?: string;
  layoutMode?: LayoutMode;
  captionStyle?: CaptionStylePreset;
}): Promise<PipelineResult> {
  const {
    sourcePath,
    tempDir,
    outputDir,
    jobId,
    windowSeconds,
    aspectRatio,
    usePlanning,
    overlay,
    purpose,
    layoutMode = "blur",
    captionStyle = "apple",
  } = options;

  const wavPath = path.join(tempDir, "audio.wav");
  await extractMonoWav(sourcePath, wavPath);

  const { samples, sampleRate } = await decodeWavToFloat32(wavPath);
  const transcript = await transcribeAudio(samples);
  const durationSec = samples.length / sampleRate;

  if (usePlanning) {
    const { contentType, segments } = await planShortformStructure(transcript.chunks, durationSec, windowSeconds, purpose);

    const outputPath = path.join(outputDir, "plan.mp4");
    const srtPath = path.join(tempDir, "plan.srt");
    await cutStructuredClip({
      sourcePath,
      outputPath,
      srtPath,
      segments,
      aspectRatio,
      transcriptChunks: transcript.chunks,
      overlay,
      overlaySrtPath: overlay ? path.join(tempDir, "plan-overlay.srt") : undefined,
      layoutMode,
      captionStyle,
    });

    return {
      transcript: transcript.text,
      transcriptChunks: transcript.chunks,
      plan: segments,
      contentType,
      clips: [
        {
          index: 1,
          start: segments[0].start,
          end: segments[segments.length - 1].end,
          score: 0,
          url: `/generated/${jobId}/plan.mp4`,
        },
      ],
    };
  }

  const windows = findHighlightWindows(samples, sampleRate, windowSeconds, CLIP_COUNT);
  const clips: PipelineClip[] = [];

  for (let i = 0; i < windows.length; i++) {
    const window = windows[i];
    const outputPath = path.join(outputDir, `clip-${i + 1}.mp4`);
    const srtPath = path.join(tempDir, `clip-${i + 1}.srt`);
    await cutClipWithCaptions({
      sourcePath,
      outputPath,
      srtPath,
      start: window.start,
      end: window.end,
      aspectRatio,
      transcriptChunks: transcript.chunks,
      overlay,
      overlaySrtPath: overlay ? path.join(tempDir, `clip-${i + 1}-overlay.srt`) : undefined,
      layoutMode,
      captionStyle,
    });
    clips.push({
      index: i + 1,
      start: window.start,
      end: window.end,
      score: window.score,
      url: `/generated/${jobId}/clip-${i + 1}.mp4`,
    });
  }

  return { transcript: transcript.text, transcriptChunks: transcript.chunks, clips };
}
