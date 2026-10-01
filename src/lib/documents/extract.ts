import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_TEXT_LENGTH = 20000;

export async function extractDocumentText(buffer: Buffer, fileName: string): Promise<string> {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  let text: string;
  if (extension === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (extension === "txt" || extension === "md") {
    text = buffer.toString("utf-8");
  } else {
    throw new Error("지원하지 않는 파일 형식입니다. PDF, DOCX, TXT, MD 파일만 가능합니다.");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("문서에서 텍스트를 추출하지 못했습니다. 이미지로만 이루어진 문서일 수 있습니다.");
  }

  return trimmed.slice(0, MAX_TEXT_LENGTH);
}
