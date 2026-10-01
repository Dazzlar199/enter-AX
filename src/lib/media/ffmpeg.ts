import { execFile } from "node:child_process";
import { promisify } from "node:util";

import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

export async function runFfmpeg(args: string[]): Promise<void> {
  if (!ffmpegPath) throw new Error("ffmpeg binary path could not be resolved from ffmpeg-static.");
  await execFileAsync(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 64 });
}

/** Reads a media file's duration by parsing ffmpeg's stderr banner (avoids depending on a separate ffprobe binary). */
export async function probeDurationSeconds(inputPath: string): Promise<number> {
  if (!ffmpegPath) throw new Error("ffmpeg binary path could not be resolved from ffmpeg-static.");

  let stderr = "";
  try {
    await execFileAsync(ffmpegPath, ["-i", inputPath], { maxBuffer: 1024 * 1024 * 64 });
  } catch (error) {
    stderr = (error as { stderr?: string }).stderr ?? "";
  }

  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Could not determine duration of ${inputPath}.`);

  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}
