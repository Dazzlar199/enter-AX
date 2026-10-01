import { NextResponse } from "next/server";

import { analyzePlanningDocument } from "@/lib/documents/analyze";
import { extractDocumentText } from "@/lib/documents/extract";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md"]);
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "문서 파일이 필요합니다." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "PDF, DOCX, TXT, MD 파일만 지원합니다." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "파일 용량이 너무 큽니다 (20MB 초과)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;
    try {
      text = await extractDocumentText(buffer, file.name);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "문서 텍스트 추출에 실패했습니다." },
        { status: 400 },
      );
    }

    try {
      const analysis = await analyzePlanningDocument(text, file.name);
      return NextResponse.json({ analysis, extractedLength: text.length });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI 분석 중 오류가 발생했습니다." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("[ax/analyze-document] failed", error);
    return NextResponse.json(
      { error: "문서 분석 중 오류가 발생했습니다. 서버 로그를 확인해주세요." },
      { status: 500 },
    );
  }
}
