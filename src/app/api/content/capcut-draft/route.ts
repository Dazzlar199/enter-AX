import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { relativeCaptionsForClip } from "@/lib/media/captions";
import type { TranscriptChunk } from "@/lib/media/transcribe";

export const runtime = "nodejs";
export const maxDuration = 60;

const PYTHON_BIN = process.env.CAPCUT_PYTHON_BIN ?? "python3";
const SCRIPT_PATH = path.join(process.cwd(), "scripts", "capcut_draft.py");

function runCapcutScript(payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [SCRIPT_PATH]);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(stderr || `capcut_draft.py exited with code ${code}`));
        return;
      }
      resolve(stdout);
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

interface CapcutDraftRequestBody {
  draftsFolder: string;
  draftName?: string;
  clipUrl: string;
  start: number;
  end: number;
  width?: number;
  height?: number;
  transcriptChunks?: TranscriptChunk[];
}

export async function POST(request: Request) {
  const body = (await request.json()) as CapcutDraftRequestBody;
  const { draftsFolder, clipUrl, start, end, width = 1080, height = 1920 } = body;

  if (!draftsFolder?.trim()) {
    return NextResponse.json({ error: "CapCut 드래프트 폴더 경로를 입력해주세요." }, { status: 400 });
  }
  if (!clipUrl?.startsWith("/generated/")) {
    return NextResponse.json({ error: "잘못된 클립 경로입니다." }, { status: 400 });
  }

  try {
    await access(draftsFolder);
  } catch {
    return NextResponse.json(
      { error: "CapCut 드래프트 폴더를 찾을 수 없습니다. CapCut 앱의 전역 설정 > 草稿位置(Draft Location)에서 경로를 확인해주세요." },
      { status: 400 },
    );
  }

  const videoPath = path.join(process.cwd(), "public", clipUrl);
  try {
    await access(videoPath);
  } catch {
    return NextResponse.json(
      { error: "클립 파일을 찾을 수 없습니다. 먼저 하이라이트 추출을 완료해주세요." },
      { status: 400 },
    );
  }

  const captions = body.transcriptChunks ? relativeCaptionsForClip(body.transcriptChunks, start, end) : [];
  const draftName = (body.draftName ?? `enter-ax-${Date.now()}`).replace(/[^\w.\-가-힣 ]/g, "").slice(0, 60) || "enter-ax-clip";

  const payload = JSON.stringify({
    draftsFolder,
    draftName,
    videoPath,
    durationSec: Math.max(0.5, end - start),
    width,
    height,
    captions,
  });

  try {
    const stdout = await runCapcutScript(payload);

    const result = JSON.parse(stdout.trim().split("\n").pop() ?? "{}") as {
      success: boolean;
      draftName?: string;
      error?: string;
    };

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "CapCut 드래프트 생성에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ draftName: result.draftName });
  } catch (error) {
    console.error("[content/capcut-draft] failed", error);
    return NextResponse.json(
      { error: "CapCut 드래프트 생성 스크립트를 실행하지 못했습니다. pycapcut 환경이 설치되어 있는지 확인해주세요." },
      { status: 500 },
    );
  }
}
