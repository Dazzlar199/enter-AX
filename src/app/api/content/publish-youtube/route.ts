import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";

import { google } from "googleapis";
import { NextResponse } from "next/server";

import { getAuthorizedClient } from "@/lib/auth/youtube";
import { resolveGeneratedClip } from "@/lib/media/paths";
import { automationAccessResponse } from "@/server/http/automation-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RequestBody {
  clipUrl: string;
  title: string;
  description?: string;
  privacyStatus?: "private" | "unlisted" | "public";
}

export async function POST(request: Request) {
  const disabled = await automationAccessResponse(request);
  if (disabled) return disabled;

  try {
    const body = (await request.json()) as RequestBody;

    const clipPath = resolveGeneratedClip(body.clipUrl);
    if (!clipPath) {
      return NextResponse.json({ error: "잘못된 클립 경로입니다." }, { status: 400 });
    }
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }

    try {
      await access(clipPath);
    } catch {
      return NextResponse.json({ error: "클립 파일을 찾을 수 없습니다." }, { status: 400 });
    }

    let auth;
    try {
      auth = await getAuthorizedClient();
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "유튜브 인증에 실패했습니다." },
        { status: 401 },
      );
    }

    const youtube = google.youtube({ version: "v3", auth });

    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: body.title.slice(0, 100),
          description: `${body.description ?? ""}\n\n#Shorts`.trim(),
        },
        status: {
          privacyStatus: body.privacyStatus ?? "private",
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: createReadStream(clipPath),
      },
    });

    const videoId = response.data.id;
    if (!videoId) throw new Error("업로드 응답에 영상 ID가 없습니다.");

    return NextResponse.json({ videoId, url: `https://www.youtube.com/watch?v=${videoId}` });
  } catch (error) {
    console.error("[content/publish-youtube] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "유튜브 업로드에 실패했습니다." },
      { status: 500 },
    );
  }
}
