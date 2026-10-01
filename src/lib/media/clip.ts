import { writeFile } from "node:fs/promises";
import path from "node:path";

import { relativeCaptionsForClip, microChunkRelativeCaptions, type RelativeCaption } from "./captions";
import { runFfmpeg } from "./ffmpeg";
import type { PlanSegment } from "./plan";
import type { TranscriptChunk } from "./transcribe";

const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");

export type AspectRatio = "9:16" | "1:1" | "16:9";
export type LayoutMode = "blur" | "crop";
export type CaptionStylePreset = "apple" | "pill" | "viral" | "classic";

export const ASPECT_TARGETS: Record<AspectRatio, { tw: number; th: number; outW: number; outH: number }> = {
  "9:16": { tw: 9, th: 16, outW: 1080, outH: 1920 },
  "1:1": { tw: 1, th: 1, outW: 1080, outH: 1080 },
  "16:9": { tw: 16, th: 9, outW: 1920, outH: 1080 },
};

export function formatSrtTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = Math.floor(clamped % 60);
  const millis = Math.round((clamped - Math.floor(clamped)) * 1000);
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

function buildSrt(chunks: TranscriptChunk[], clipStart: number, clipEnd: number): string {
  const relevant = relativeCaptionsForClip(chunks, clipStart, clipEnd);
  return relevant
    .map((chunk, index) => {
      const start = formatSrtTime(chunk.start);
      const end = formatSrtTime(chunk.end);
      return `${index + 1}\n${start} --> ${end}\n${chunk.text}\n`;
    })
    .join("\n");
}

export function escapeFfmpegFilterPath(path: string): string {
  return path.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

/**
 * YouTube Shorts / Reels / TikTok mobile safe-zone caption presets:
 * - Alignment=2: bottom-center
 * - MarginV=380: avoids bottom title & subscribe bar (Y:1540+) and human faces (Y:1150-)
 * - MarginL=90, MarginR=200: avoids right-side action buttons (Like, Dislike, Comment, Share)
 */
export const CAPTION_PRESETS: Record<CaptionStylePreset, string> = {
  apple:
    "FontName=Apple SD Gothic Neo,FontSize=20,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00111111,BorderStyle=1,Outline=1.6,Shadow=1.5,ShadowColour=&H80000000,Alignment=2,MarginV=380,MarginL=90,MarginR=200",
  pill:
    "FontName=Apple SD Gothic Neo,FontSize=19,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H99111111,BorderStyle=3,Outline=4,Shadow=0,Alignment=2,MarginV=380,MarginL=90,MarginR=200",
  viral:
    "FontName=Black Han Sans,FontSize=22,Bold=1,PrimaryColour=&H0000E5FF,OutlineColour=&H00000000,BorderStyle=1,Outline=2.8,Shadow=1.2,ShadowColour=&H80000000,Alignment=2,MarginV=380,MarginL=90,MarginR=200",
  classic:
    "FontName=Black Han Sans,FontSize=21,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H0000A5FF,BorderStyle=1,Outline=2.5,Shadow=0,Alignment=2,MarginV=380,MarginL=90,MarginR=200",
};

export const CAPTION_STYLE = CAPTION_PRESETS.apple;

export const OVERLAY_STYLE =
  "FontName=Apple SD Gothic Neo,FontSize=14,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1.5,Shadow=0,MarginL=36,MarginR=36,MarginV=260";

export interface ClipOverlay {
  artistLine: string;
  trackLine: string;
  handle?: string;
}

function buildOverlaySrt(overlay: ClipOverlay, durationSec: number): string {
  const timeRange = `${formatSrtTime(0)} --> ${formatSrtTime(durationSec)}`;
  const entries = [`1\n${timeRange}\n{\\an7}${overlay.artistLine}\n${overlay.trackLine}\n`];
  if (overlay.handle?.trim()) {
    entries.push(`2\n${timeRange}\n{\\an9}${overlay.handle}\n`);
  }
  return entries.join("\n");
}

function buildSubtitlesFilter(srtPath: string, style: string): string {
  return `subtitles='${escapeFfmpegFilterPath(srtPath)}':fontsdir='${escapeFfmpegFilterPath(FONTS_DIR)}':force_style='${style}'`;
}

export async function cutClipWithCaptions(options: {
  sourcePath: string;
  outputPath: string;
  srtPath: string;
  start: number;
  end: number;
  aspectRatio: AspectRatio;
  transcriptChunks: TranscriptChunk[];
  overlay?: ClipOverlay;
  overlaySrtPath?: string;
  layoutMode?: LayoutMode;
  captionStyle?: CaptionStylePreset;
}): Promise<void> {
  const {
    sourcePath,
    outputPath,
    srtPath,
    start,
    end,
    aspectRatio,
    transcriptChunks,
    overlay,
    overlaySrtPath,
    layoutMode = "blur",
    captionStyle = "apple",
  } = options;
  const duration = Math.max(0.5, end - start);
  const target = ASPECT_TARGETS[aspectRatio];

  const srtContent = buildSrt(transcriptChunks, start, end);
  await writeFile(srtPath, srtContent, "utf-8");

  const styleString = CAPTION_PRESETS[captionStyle] ?? CAPTION_PRESETS.apple;

  let videoFilterGraph = "";
  if (aspectRatio === "9:16" && layoutMode === "blur") {
    videoFilterGraph =
      `[0:v]split=2[bg_in][fg_in];` +
      `[bg_in]scale=${target.outW}:${target.outH}:force_original_aspect_ratio=increase,crop=${target.outW}:${target.outH},boxblur=25:5,eq=brightness=-0.08[bg];` +
      `[fg_in]scale=${target.outW}:-2[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[vlayout]`;
  } else {
    const cropFilter = `crop='min(iw,ih*${target.tw}/${target.th})':'min(ih,iw*${target.th}/${target.tw})'`;
    const scaleFilter = `scale=${target.outW}:${target.outH}`;
    videoFilterGraph = `[0:v]${cropFilter},${scaleFilter}[vlayout]`;
  }

  let lastVideoNode = "vlayout";
  const filterNodes: string[] = [videoFilterGraph];

  if (srtContent.trim()) {
    const subFilter = buildSubtitlesFilter(srtPath, styleString);
    filterNodes.push(`[${lastVideoNode}]${subFilter}[vsub]`);
    lastVideoNode = "vsub";
  }

  if (overlay && overlaySrtPath) {
    await writeFile(overlaySrtPath, buildOverlaySrt(overlay, duration), "utf-8");
    const overlayFilter = buildSubtitlesFilter(overlaySrtPath, OVERLAY_STYLE);
    filterNodes.push(`[${lastVideoNode}]${overlayFilter}[vout]`);
  } else {
    filterNodes.push(`[${lastVideoNode}]null[vout]`);
  }

  const complexFilter = filterNodes.join(";");

  await runFfmpeg([
    "-y",
    "-ss", String(start),
    "-i", sourcePath,
    "-t", String(duration),
    "-filter_complex", complexFilter,
    "-map", "[vout]",
    "-map", "0:a?",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-movflags", "+faststart",
    outputPath,
  ]);
}

function buildStructuredSrt(segments: PlanSegment[], transcriptChunks: TranscriptChunk[]): string {
  let offset = 0;
  const entries: RelativeCaption[] = [];

  for (const segment of segments) {
    const segmentDuration = segment.end - segment.start;
    const spokenCaptions = relativeCaptionsForClip(transcriptChunks, segment.start, segment.end);
    if (spokenCaptions.length > 0) {
      for (const caption of spokenCaptions) {
        const clampedEnd = Math.min(caption.end, segmentDuration);
        if (clampedEnd <= caption.start) continue;
        entries.push({ start: caption.start + offset, end: clampedEnd + offset, text: caption.text });
      }
    } else {
      const microSegment = microChunkRelativeCaptions(
        [{ start: 0, end: segmentDuration, text: segment.caption }],
        { maxWordsPerChunk: 4, maxDurationSec: 2.0 },
      );
      for (const chunk of microSegment) {
        entries.push({ start: chunk.start + offset, end: chunk.end + offset, text: chunk.text });
      }
    }
    offset += segmentDuration;
  }

  return entries
    .map((entry, index) => `${index + 1}\n${formatSrtTime(entry.start)} --> ${formatSrtTime(entry.end)}\n${entry.text}\n`)
    .join("\n");
}

/** Cuts and concatenates several source segments into one narratively-ordered short (e.g. intro -> highlight -> outro). */
export async function cutStructuredClip(options: {
  sourcePath: string;
  outputPath: string;
  srtPath: string;
  segments: PlanSegment[];
  aspectRatio: AspectRatio;
  transcriptChunks: TranscriptChunk[];
  overlay?: ClipOverlay;
  overlaySrtPath?: string;
  layoutMode?: LayoutMode;
  captionStyle?: CaptionStylePreset;
}): Promise<void> {
  const {
    sourcePath,
    outputPath,
    srtPath,
    segments,
    aspectRatio,
    transcriptChunks,
    overlay,
    overlaySrtPath,
    layoutMode = "blur",
    captionStyle = "apple",
  } = options;
  if (segments.length === 0) throw new Error("cutStructuredClip requires at least one segment.");
  const target = ASPECT_TARGETS[aspectRatio];

  const srtContent = buildStructuredSrt(segments, transcriptChunks);
  await writeFile(srtPath, srtContent, "utf-8");

  const styleString = CAPTION_PRESETS[captionStyle] ?? CAPTION_PRESETS.apple;

  const segmentFilters = segments
    .map((segment, index) => {
      const duration = Math.max(0.5, segment.end - segment.start);
      return (
        `[0:v]trim=start=${segment.start}:duration=${duration},setpts=PTS-STARTPTS[v${index}];` +
        `[0:a]atrim=start=${segment.start}:duration=${duration},asetpts=PTS-STARTPTS[a${index}]`
      );
    })
    .join(";");

  const concatInputs = segments.map((_, index) => `[v${index}][a${index}]`).join("");
  const concatFilter = `${concatInputs}concat=n=${segments.length}:v=1:a=1[vcat][acat]`;

  let layoutFilter = "";
  if (aspectRatio === "9:16" && layoutMode === "blur") {
    layoutFilter =
      `[vcat]split=2[bg_in][fg_in];` +
      `[bg_in]scale=${target.outW}:${target.outH}:force_original_aspect_ratio=increase,crop=${target.outW}:${target.outH},boxblur=25:5,eq=brightness=-0.08[bg];` +
      `[fg_in]scale=${target.outW}:-2[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[vlayout]`;
  } else {
    const cropFilter = `crop='min(iw,ih*${target.tw}/${target.th})':'min(ih,iw*${target.th}/${target.tw})'`;
    const scaleFilter = `scale=${target.outW}:${target.outH}`;
    layoutFilter = `[vcat]${cropFilter},${scaleFilter}[vlayout]`;
  }

  let lastVideoNode = "vlayout";
  const extraFilters: string[] = [];

  if (srtContent.trim()) {
    extraFilters.push(`[${lastVideoNode}]${buildSubtitlesFilter(srtPath, styleString)}[vcaption]`);
    lastVideoNode = "vcaption";
  }

  const totalDuration = segments.reduce((sum, segment) => sum + (segment.end - segment.start), 0);
  if (overlay && overlaySrtPath) {
    await writeFile(overlaySrtPath, buildOverlaySrt(overlay, totalDuration), "utf-8");
    extraFilters.push(`[${lastVideoNode}]${buildSubtitlesFilter(overlaySrtPath, OVERLAY_STYLE)}[vout]`);
  } else {
    extraFilters.push(`[${lastVideoNode}]null[vout]`);
  }

  const audioFilter = `[acat]loudnorm=I=-14:TP=-1.5:LRA=11[aout]`;

  const filterComplex = [
    segmentFilters,
    concatFilter,
    layoutFilter,
    ...extraFilters,
    audioFilter,
  ]
    .filter(Boolean)
    .join(";");

  await runFfmpeg([
    "-y",
    "-i", sourcePath,
    "-filter_complex", filterComplex,
    "-map", "[vout]",
    "-map", "[aout]",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-movflags", "+faststart",
    outputPath,
  ]);
}
