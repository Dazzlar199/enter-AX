import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import type { AspectRatio, CaptionStylePreset, ClipOverlay, LayoutMode } from "@/lib/media/clip";
import { runShortformPipeline } from "@/lib/media/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DURATION_TO_SECONDS: Record<string, number> = { "15": 15, "30": 30, "60": 60 };
const ASPECT_RATIOS: AspectRatio[] = ["9:16", "1:1", "16:9"];

export async function POST(request: Request) {
  const jobId = randomUUID();
  const tempDir = path.join(tmpdir(), "enter-ax-content", jobId);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const durationInput = String(formData.get("duration") ?? "30");
    const aspectRatioInput = String(formData.get("aspectRatio") ?? "9:16");
    const usePlanning = formData.get("usePlanning") === "true";
    const purpose = String(formData.get("purpose") ?? "").trim();
    const artistName = String(formData.get("artistName") ?? "").trim();
    const trackInfo = String(formData.get("trackInfo") ?? "").trim();
    const channelHandle = String(formData.get("channelHandle") ?? "").trim();
    const layoutModeInput = String(formData.get("layoutMode") ?? "blur");
    const layoutMode: LayoutMode = layoutModeInput === "crop" ? "crop" : "blur";
    const captionStyleInput = String(formData.get("captionStyle") ?? "apple");
    const captionStyle: CaptionStylePreset =
      captionStyleInput === "pill" || captionStyleInput === "viral" || captionStyleInput === "classic"
        ? captionStyleInput
        : "apple";
    const overlay: ClipOverlay | undefined =
      artistName || trackInfo ? { artistLine: artistName, trackLine: trackInfo, handle: channelHandle } : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "영상 파일이 필요합니다." }, { status: 400 });
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isAllowedType =
      ALLOWED_VIDEO_TYPES.has(file.type) ||
      ["mp4", "webm", "mov", "m4v"].includes(extension);

    if (!isAllowedType) {
      return NextResponse.json({ error: "MP4, WebM, MOV 영상 파일만 지원합니다." }, { status: 400 });
    }
    const windowSeconds = DURATION_TO_SECONDS[durationInput] ?? 30;
    const aspectRatio = ASPECT_RATIOS.includes(aspectRatioInput as AspectRatio)
      ? (aspectRatioInput as AspectRatio)
      : "9:16";

    await mkdir(tempDir, { recursive: true });
    const outputDir = path.join(process.cwd(), "public", "generated", jobId);
    await mkdir(outputDir, { recursive: true });

    const sourceExtension = file.name.split(".").pop() || "mp4";
    const sourcePath = path.join(tempDir, `source.${sourceExtension}`);
    await writeFile(sourcePath, Buffer.from(await file.arrayBuffer()));

    let result;
    try {
      result = await runShortformPipeline({
        sourcePath,
        tempDir,
        outputDir,
        jobId,
        windowSeconds,
        aspectRatio,
        usePlanning,
        overlay,
        purpose,
        layoutMode,
        captionStyle,
      });
    } catch (error) {
      if (usePlanning) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "AI 기획 단계에서 오류가 발생했습니다." },
          { status: 502 },
        );
      }
      throw error;
    }

    return NextResponse.json({ jobId, ...result });
  } catch (error) {
    console.error("[content/process] pipeline failed", error);
    return NextResponse.json(
      { error: "영상 처리 중 오류가 발생했습니다. 서버 로그를 확인해주세요." },
      { status: 500 },
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
