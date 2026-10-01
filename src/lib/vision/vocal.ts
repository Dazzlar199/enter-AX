import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON_BIN =
  process.env.PYTHON_BIN ?? path.resolve(process.cwd(), [".venv", "vision"].join("-"), "bin", "python");
const SCRIPT_PATH = path.join(process.cwd(), "scripts", "vocal_pitch_compare.py");

export interface PitchComparison {
  referenceVoicedRatio: number;
  candidateVoicedRatio: number;
  /** 0-1 DTW-aligned relative pitch-contour similarity between the reference vocal and the candidate's performance (key/octave-normalized). Null if either track had too little detected singing. */
  pitchMatchScore: number | null;
}

export async function comparePitch(referencePath: string, candidatePath: string): Promise<PitchComparison> {
  let stdout: string;
  try {
    const result = await execFileAsync(PYTHON_BIN, [SCRIPT_PATH, referencePath, candidatePath], {
      maxBuffer: 1024 * 1024 * 16,
      timeout: 180000,
    });
    stdout = result.stdout;
  } catch (error) {
    throw new Error(
      `음정 비교 스크립트 실행에 실패했습니다. (${error instanceof Error ? error.message : "알 수 없는 오류"})`,
    );
  }

  const lastLine = stdout.trim().split("\n").pop() ?? "";
  try {
    return JSON.parse(lastLine) as PitchComparison;
  } catch {
    throw new Error("음정 비교 결과를 해석하지 못했습니다.");
  }
}
