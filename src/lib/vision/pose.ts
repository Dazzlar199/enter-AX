import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON_BIN =
  process.env.PYTHON_BIN ?? path.resolve(process.cwd(), [".venv", "vision"].join("-"), "bin", "python");
const SCRIPT_PATH = path.join(process.cwd(), "scripts", "pose_analysis.py");

export interface PoseAnalysis {
  durationSec: number;
  sampledFrames: number;
  /** Share of sampled frames where a person was detected - proxy for camera framing/tracking quality. */
  detectionRate: number;
  /** 0-1: how much of the frame the limbs traverse across the clip. */
  movementRange: number;
  /** 0-1: average frame-to-frame limb displacement - movement intensity/tempo. */
  avgMovementSpeed: number;
  /** 0-1: how balanced left vs right limb movement amplitude is. */
  limbSymmetry: number;
  /** 0-1: how much of the frame the torso occupies on average - shot framing proxy. */
  framingScore: number;
  /** Detected music tempo in BPM, or null if audio/beat detection failed. */
  tempoBpm: number | null;
  /** 0-1: share of detected music beats that land near a movement-speed peak - real on-beat dancing proxy. Null if not computable. */
  beatSyncScore: number | null;
}

export async function analyzePoseVideo(videoPath: string): Promise<PoseAnalysis> {
  let stdout: string;
  try {
    const result = await execFileAsync(PYTHON_BIN, [SCRIPT_PATH, videoPath], {
      maxBuffer: 1024 * 1024 * 16,
      timeout: 180000,
    });
    stdout = result.stdout;
  } catch (error) {
    throw new Error(
      `움직임 분석 스크립트 실행에 실패했습니다. (${error instanceof Error ? error.message : "알 수 없는 오류"})`,
    );
  }

  const lastLine = stdout.trim().split("\n").pop() ?? "";
  try {
    return JSON.parse(lastLine) as PoseAnalysis;
  } catch {
    throw new Error("움직임 분석 결과를 해석하지 못했습니다.");
  }
}
