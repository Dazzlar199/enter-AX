import { NextResponse } from "next/server";

import { saveTokensFromCode } from "@/lib/auth/youtube";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/agency/content?youtube=denied`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/agency/content?youtube=error`);
  }

  try {
    await saveTokensFromCode(code);
    return NextResponse.redirect(`${origin}/agency/content?youtube=connected`);
  } catch (err) {
    console.error("[auth/youtube/callback] failed", err);
    return NextResponse.redirect(`${origin}/agency/content?youtube=error`);
  }
}
