import { NextResponse } from "next/server";

import { isYoutubeConnected } from "@/lib/auth/youtube";

export const runtime = "nodejs";

export async function GET() {
  const connected = await isYoutubeConnected();
  return NextResponse.json({ connected });
}
