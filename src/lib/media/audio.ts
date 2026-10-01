import { readFile } from "node:fs/promises";

import { runFfmpeg } from "./ffmpeg";

export const WHISPER_SAMPLE_RATE = 16000;

export async function extractMonoWav(inputPath: string, outputWavPath: string): Promise<void> {
  await runFfmpeg([
    "-y",
    "-i", inputPath,
    "-ar", String(WHISPER_SAMPLE_RATE),
    "-ac", "1",
    "-vn",
    "-f", "wav",
    outputWavPath,
  ]);
}

/** Parses a PCM16LE WAV file into a Float32Array of samples in [-1, 1]. */
export async function decodeWavToFloat32(wavPath: string): Promise<{ samples: Float32Array; sampleRate: number }> {
  const buffer = await readFile(wavPath);
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a valid WAV file.");
  }

  let offset = 12;
  let sampleRate = WHISPER_SAMPLE_RATE;
  let bitsPerSample = 16;
  let dataStart = -1;
  let dataLength = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkBodyStart = offset + 8;

    if (chunkId === "fmt ") {
      sampleRate = buffer.readUInt32LE(chunkBodyStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkBodyStart + 14);
    } else if (chunkId === "data") {
      dataStart = chunkBodyStart;
      dataLength = chunkSize;
    }

    offset = chunkBodyStart + chunkSize + (chunkSize % 2);
  }

  if (dataStart === -1) throw new Error("WAV file has no data chunk.");
  if (bitsPerSample !== 16) throw new Error(`Unsupported WAV bit depth: ${bitsPerSample}`);

  const sampleCount = Math.floor(dataLength / 2);
  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = buffer.readInt16LE(dataStart + i * 2) / 32768;
  }

  return { samples, sampleRate };
}
