import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { analyzePoseVideo } from "@/lib/vision/pose";
import { automationAccessResponse } from "@/server/http/automation-guard";

export const runtime = "nodejs";
export const maxDuration = 180;

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_FILE_BYTES = 300 * 1024 * 1024;

export async function POST(request: Request) {
  const disabled = await automationAccessResponse(request);
  if (disabled) return disabled;

  const jobId = randomUUID();
  const tempDir = path.join(tmpdir(), "enter-ax-pose", jobId);

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "영상 파일이 필요합니다." }, { status: 400 });
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isAllowedType = ALLOWED_VIDEO_TYPES.has(file.type) || ["mp4", "webm", "mov", "m4v"].includes(extension);
    if (!isAllowedType) {
      return NextResponse.json({ error: "MP4, WebM, MOV 영상 파일만 지원합니다." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "파일 용량이 너무 큽니다 (300MB 초과)." }, { status: 400 });
    }

    await mkdir(tempDir, { recursive: true });
    const sourcePath = path.join(tempDir, `source.${extension || "mp4"}`);
    await writeFile(sourcePath, Buffer.from(await file.arrayBuffer()));

    const analysis = await analyzePoseVideo(sourcePath);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("[talent/analyze-pose] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "움직임 분석 중 오류가 발생했습니다." },
      { status: 500 },
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
