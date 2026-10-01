import { NextResponse } from "next/server";

import { getAuthUrl } from "@/lib/auth/youtube";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.redirect(getAuthUrl());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "유튜브 인증 URL을 생성하지 못했습니다." },
      { status: 500 },
    );
  }
}
