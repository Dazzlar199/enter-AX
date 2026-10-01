import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { comparePitch } from "@/lib/vision/vocal";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"]);
const MAX_FILE_BYTES = 200 * 1024 * 1024;

function validateMedia(file: FormDataEntryValue | null): file is File {
  if (!(file instanceof File)) return false;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isAllowedType =
    ALLOWED_TYPES.has(file.type) || ["mp4", "webm", "mov", "m4v", "mp3", "wav", "m4a"].includes(extension);
  return isAllowedType && file.size <= MAX_FILE_BYTES;
}

export async function POST(request: Request) {
  const jobId = randomUUID();
  const tempDir = path.join(tmpdir(), "enter-ax-pitch", jobId);

  try {
    const formData = await request.formData();
    const referenceFile = formData.get("reference");
    const candidateFile = formData.get("candidate");

    if (!validateMedia(referenceFile) || !validateMedia(candidateFile)) {
      return NextResponse.json(
        { error: "원곡 보컬(또는 MV)과 지원자 커버 음원 모두 영상/오디오 파일로 업로드해주세요 (각 200MB 이하)." },
        { status: 400 },
      );
    }

    await mkdir(tempDir, { recursive: true });
    const refExt = referenceFile.name.split(".").pop() || "mp4";
    const candExt = candidateFile.name.split(".").pop() || "mp4";
    const referencePath = path.join(tempDir, `reference.${refExt}`);
    const candidatePath = path.join(tempDir, `candidate.${candExt}`);
    await writeFile(referencePath, Buffer.from(await referenceFile.arrayBuffer()));
    await writeFile(candidatePath, Buffer.from(await candidateFile.arrayBuffer()));

    const comparison = await comparePitch(referencePath, candidatePath);
    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("[talent/compare-pitch] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "음정 비교 중 오류가 발생했습니다." },
      { status: 500 },
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
