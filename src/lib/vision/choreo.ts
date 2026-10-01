import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON_BIN =
  process.env.PYTHON_BIN ?? path.resolve(process.cwd(), [".venv", "vision"].join("-"), "bin", "python");
const SCRIPT_PATH = path.join(process.cwd(), "scripts", "choreo_compare.py");

export interface ChoreoComparison {
  referenceFrames: number;
  candidateFrames: number;
  /** 0-1 DTW-aligned joint-angle similarity between the reference choreography and the candidate's performance. Null if either video had too few detected poses. */
  choreoMatchScore: number | null;
}

export async function compareChoreography(referencePath: string, candidatePath: string): Promise<ChoreoComparison> {
  let stdout: string;
  try {
    const result = await execFileAsync(PYTHON_BIN, [SCRIPT_PATH, referencePath, candidatePath], {
      maxBuffer: 1024 * 1024 * 16,
      timeout: 240000,
    });
    stdout = result.stdout;
  } catch (error) {
    throw new Error(
      `안무 비교 스크립트 실행에 실패했습니다. (${error instanceof Error ? error.message : "알 수 없는 오류"})`,
    );
  }

  const lastLine = stdout.trim().split("\n").pop() ?? "";
  try {
    return JSON.parse(lastLine) as ChoreoComparison;
  } catch {
    throw new Error("안무 비교 결과를 해석하지 못했습니다.");
  }
}
