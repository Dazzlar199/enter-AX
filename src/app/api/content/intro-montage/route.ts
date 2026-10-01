import { randomUUID } from "node:crypto";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import type { AspectRatio } from "@/lib/media/clip";
import { probeDurationSeconds } from "@/lib/media/ffmpeg";
import { buildImageMontage, concatWithCrossfade, type MontageImage } from "@/lib/media/montage";
import { generatePromoNarration, synthesizeNarration } from "@/lib/media/narration";

export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ASPECT_RATIOS: AspectRatio[] = ["9:16", "1:1", "16:9"];
const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface SelectedImage {
  imageUrl: string;
  sourceDomain: string;
  title?: string;
}

interface RequestBody {
  images: SelectedImage[];
  clipUrl: string;
  aspectRatio?: string;
  topic?: string;
  useNarration?: boolean;
}

async function downloadImage(url: string, destDir: string, index: number): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(`이미지를 다운로드하지 못했습니다: ${url}`);
  }
  if (!response.ok) throw new Error(`이미지를 다운로드하지 못했습니다 (status ${response.status}): ${url}`);

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const extension = CONTENT_TYPE_EXTENSION[contentType];
  if (!extension) throw new Error(`지원하지 않는 이미지 형식입니다: ${contentType || "알 수 없음"}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("이미지 용량이 너무 큽니다 (15MB 초과).");

  const destPath = path.join(destDir, `image-${index}.${extension}`);
  await writeFile(destPath, buffer);
  return destPath;
}

export async function POST(request: Request) {
  const jobId = randomUUID();
  const tempDir = path.join(tmpdir(), "enter-ax-montage", jobId);

  try {
    const body = (await request.json()) as RequestBody;
    const images = Array.isArray(body.images) ? body.images : [];
    const aspectRatio = ASPECT_RATIOS.includes(body.aspectRatio as AspectRatio)
      ? (body.aspectRatio as AspectRatio)
      : "9:16";

    if (images.length === 0) {
      return NextResponse.json({ error: "인트로에 사용할 이미지를 1개 이상 선택해주세요." }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `이미지는 최대 ${MAX_IMAGES}개까지 선택할 수 있습니다.` }, { status: 400 });
    }
    if (!body.clipUrl?.startsWith("/generated/")) {
      return NextResponse.json({ error: "잘못된 클립 경로입니다." }, { status: 400 });
    }

    const clipPath = path.join(process.cwd(), "public", body.clipUrl);
    try {
      await access(clipPath);
    } catch {
      return NextResponse.json(
        { error: "하이라이트 클립을 찾을 수 없습니다. 먼저 AI 하이라이트 추출을 완료해주세요." },
        { status: 400 },
      );
    }

    await mkdir(tempDir, { recursive: true });
    const outputDir = path.join(process.cwd(), "public", "generated", jobId);
    await mkdir(outputDir, { recursive: true });

    let downloaded: MontageImage[];
    try {
      downloaded = await Promise.all(
        images.map(async (image, index) => ({
          imagePath: await downloadImage(image.imageUrl, tempDir, index),
          sourceDomain: image.sourceDomain,
        })),
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "이미지 다운로드 중 오류가 발생했습니다." },
        { status: 502 },
      );
    }

    let narrationPath: string | undefined;
    let narrationText: string | undefined;
    if (body.useNarration) {
      if (!body.topic?.trim()) {
        return NextResponse.json({ error: "나레이션을 만들려면 주제(아티스트명)가 필요합니다." }, { status: 400 });
      }
      try {
        const contextSnippets = images.map((image) => image.title).filter((title): title is string => Boolean(title));
        narrationText = await generatePromoNarration(body.topic, contextSnippets);
        narrationPath = path.join(tempDir, "narration.aiff");
        await synthesizeNarration(narrationText, narrationPath);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "나레이션 생성 중 오류가 발생했습니다." },
          { status: 502 },
        );
      }
    }

    const introPath = path.join(tempDir, "intro.mp4");
    const srtPath = path.join(tempDir, "attribution.srt");
    await buildImageMontage({ images: downloaded, outputPath: introPath, srtPath, aspectRatio, narrationPath });
    const introDuration = await probeDurationSeconds(introPath);

    const finalPath = path.join(outputDir, "promo.mp4");
    await concatWithCrossfade(introPath, introDuration, clipPath, finalPath);

    return NextResponse.json({ url: `/generated/${jobId}/promo.mp4`, narration: narrationText });
  } catch (error) {
    console.error("[content/intro-montage] pipeline failed", error);
    return NextResponse.json(
      { error: "홍보 숏폼 생성 중 오류가 발생했습니다. 서버 로그를 확인해주세요." },
      { status: 500 },
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
