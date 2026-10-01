import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { compareChoreography } from "@/lib/vision/choreo";

export const runtime = "nodejs";
export const maxDuration = 180;

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_FILE_BYTES = 300 * 1024 * 1024;

function validateVideo(file: FormDataEntryValue | null): file is File {
  if (!(file instanceof File)) return false;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isAllowedType = ALLOWED_VIDEO_TYPES.has(file.type) || ["mp4", "webm", "mov", "m4v"].includes(extension);
  return isAllowedType && file.size <= MAX_FILE_BYTES;
}

export async function POST(request: Request) {
  const jobId = randomUUID();
  const tempDir = path.join(tmpdir(), "enter-ax-choreo", jobId);

  try {
    const formData = await request.formData();
    const referenceFile = formData.get("reference");
    const candidateFile = formData.get("candidate");

    if (!validateVideo(referenceFile) || !validateVideo(candidateFile)) {
      return NextResponse.json(
        { error: "원곡 안무 영상과 지원자 영상 모두 MP4/WebM/MOV로 업로드해주세요 (각 300MB 이하)." },
        { status: 400 },
      );
    }

    await mkdir(tempDir, { recursive: true });
    const referencePath = path.join(tempDir, "reference.mp4");
    const candidatePath = path.join(tempDir, "candidate.mp4");
    await writeFile(referencePath, Buffer.from(await referenceFile.arrayBuffer()));
    await writeFile(candidatePath, Buffer.from(await candidateFile.arrayBuffer()));

    const comparison = await compareChoreography(referencePath, candidatePath);
    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("[talent/compare-choreography] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "안무 비교 중 오류가 발생했습니다." },
      { status: 500 },
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
