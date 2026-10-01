import { NextResponse } from "next/server";

import { fetchChannelVideos, resolveChannelId } from "@/lib/media/youtube";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelUrl = searchParams.get("channelUrl")?.trim();

  if (!channelUrl) {
    return NextResponse.json({ error: "채널 URL을 입력해주세요." }, { status: 400 });
  }

  try {
    const channelId = await resolveChannelId(channelUrl);
    const videos = await fetchChannelVideos(channelId);
    return NextResponse.json({ channelId, videos });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "채널 영상을 가져오지 못했습니다." },
      { status: 502 },
    );
  }
}
