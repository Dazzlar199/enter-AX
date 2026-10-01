import { writeFile } from "node:fs/promises";

import { ASPECT_TARGETS, escapeFfmpegFilterPath, formatSrtTime, type AspectRatio } from "./clip";
import { probeDurationSeconds, runFfmpeg } from "./ffmpeg";

export interface MontageImage {
  imagePath: string;
  sourceDomain: string;
}

const DEFAULT_SECONDS_PER_IMAGE = 2.5;
const MIN_SECONDS_PER_IMAGE = 2;
const MAX_SECONDS_PER_IMAGE = 6;
const FPS = 25;

function buildAttributionSrt(images: MontageImage[], secondsPerImage: number): string {
  let offset = 0;
  const entries = images.map((image, index) => {
    const entry = `${index + 1}\n${formatSrtTime(offset)} --> ${formatSrtTime(offset + secondsPerImage)}\n출처: ${image.sourceDomain}\n`;
    offset += secondsPerImage;
    return entry;
  });
  return entries.join("\n");
}

/** Builds a Ken-Burns style pan/zoom intro video from a set of downloaded images, with small source-attribution captions burned in. Optionally narrated by a pre-synthesized TTS audio track (the montage duration is stretched to match it). */
export async function buildImageMontage(options: {
  images: MontageImage[];
  outputPath: string;
  srtPath: string;
  aspectRatio: AspectRatio;
  narrationPath?: string;
}): Promise<void> {
  const { images, outputPath, srtPath, aspectRatio, narrationPath } = options;
  if (images.length === 0) throw new Error("buildImageMontage requires at least one image.");
  const target = ASPECT_TARGETS[aspectRatio];

  const narrationDuration = narrationPath ? await probeDurationSeconds(narrationPath) : undefined;
  const secondsPerImage = narrationDuration
    ? Math.min(MAX_SECONDS_PER_IMAGE, Math.max(MIN_SECONDS_PER_IMAGE, narrationDuration / images.length))
    : DEFAULT_SECONDS_PER_IMAGE;
  const frames = Math.round(secondsPerImage * FPS);

  const attributionSrt = buildAttributionSrt(images, secondsPerImage);
  await writeFile(srtPath, attributionSrt, "utf-8");

  const inputArgs = images.flatMap((image) => ["-loop", "1", "-t", String(secondsPerImage), "-i", image.imagePath]);

  const zoompanFilters = images
    .map((_, index) => {
      const upscaleW = target.outW * 2;
      const upscaleH = target.outH * 2;
      return (
        `[${index}:v]scale=${upscaleW}:${upscaleH}:force_original_aspect_ratio=increase,` +
        `crop=${upscaleW}:${upscaleH},` +
        `zoompan=z='min(zoom+0.0012,1.2)':d=${frames}:s=${target.outW}x${target.outH}:fps=${FPS},` +
        `setsar=1[v${index}]`
      );
    })
    .join(";");

  const concatInputs = images.map((_, index) => `[v${index}]`).join("");
  const concatFilter = `${concatInputs}concat=n=${images.length}:v=1:a=0[vcat]`;
  const subtitlesFilter = attributionSrt.trim()
    ? `[vcat]subtitles='${escapeFfmpegFilterPath(srtPath)}':force_style='FontSize=12,Alignment=1,MarginL=16,MarginV=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1'[vout]`
    : "[vcat]null[vout]";

  const totalDuration = images.length * secondsPerImage;
  const audioInputArgs = narrationPath
    ? ["-i", narrationPath]
    : ["-f", "lavfi", "-t", String(totalDuration), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"];

  await runFfmpeg([
    "-y",
    ...inputArgs,
    ...audioInputArgs,
    "-filter_complex", `${zoompanFilters};${concatFilter};${subtitlesFilter}`,
    "-map", "[vout]",
    "-map", `${images.length}:a`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-shortest",
    "-movflags", "+faststart",
    outputPath,
  ]);
}

const CROSSFADE_SECONDS = 0.5;

/** Joins two clips with a short crossfade dissolve instead of a hard cut. Requires the exact duration of the first clip. */
export async function concatWithCrossfade(
  firstPath: string,
  firstDurationSeconds: number,
  secondPath: string,
  outputPath: string,
): Promise<void> {
  const crossfade = Math.min(CROSSFADE_SECONDS, Math.max(0.1, firstDurationSeconds - 0.1));
  const offset = Math.max(0, firstDurationSeconds - crossfade);

  const filterComplex =
    `[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];` +
    `[v0][v1]xfade=transition=fade:duration=${crossfade}:offset=${offset}[outv];` +
    `[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];` +
    `[1:a]aformat=sample_rates=44100:channel_layouts=stereo[a1];` +
    `[a0][a1]acrossfade=d=${crossfade}[outa]`;

  await runFfmpeg([
    "-y",
    "-i", firstPath,
    "-i", secondPath,
    "-filter_complex", filterComplex,
    "-map", "[outv]",
    "-map", "[outa]",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-movflags", "+faststart",
    outputPath,
  ]);
}

/** Concatenates already-encoded mp4 files (same resolution) into one output, re-encoding for safety. */
export async function concatVideos(inputPaths: string[], outputPath: string): Promise<void> {
  if (inputPaths.length === 0) throw new Error("concatVideos requires at least one input.");
  if (inputPaths.length === 1) {
    await runFfmpeg(["-y", "-i", inputPaths[0], "-c", "copy", outputPath]);
    return;
  }

  const inputArgs = inputPaths.flatMap((path) => ["-i", path]);
  const normalizeFilters = inputPaths
    .map((_, index) => `[${index}:v]fps=30,format=yuv420p[v${index}];[${index}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${index}]`)
    .join(";");
  const streamPairs = inputPaths.map((_, index) => `[v${index}][a${index}]`).join("");
  const filterComplex = `${normalizeFilters};${streamPairs}concat=n=${inputPaths.length}:v=1:a=1[outv][outa]`;

  await runFfmpeg([
    "-y",
    ...inputArgs,
    "-filter_complex", filterComplex,
    "-map", "[outv]",
    "-map", "[outa]",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-movflags", "+faststart",
    outputPath,
  ]);
}
