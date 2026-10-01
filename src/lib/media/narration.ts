import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { generateText } from "@/lib/ai/llm";

const execFileAsync = promisify(execFile);

const NARRATION_VOICE = process.env.NARRATION_VOICE ?? "Yuna";

/** Synthesizes Korean speech locally via macOS's built-in `say` command (Yuna voice). macOS-only. */
export async function synthesizeNarration(text: string, outputPath: string): Promise<void> {
  try {
    await execFileAsync("say", ["-v", NARRATION_VOICE, "-o", outputPath, text]);
  } catch {
    throw new Error(
      "로컬 TTS(macOS 'say' 명령)로 나레이션을 만들지 못했습니다. macOS 환경에서만 지원되는 기능입니다.",
    );
  }
}

/** Asks the configured LLM (Gemini or local Ollama) to write a short Korean promo narration line for the given topic. */
export async function generatePromoNarration(topic: string, contextSnippets: string[] = []): Promise<string> {
  const context = contextSnippets.length
    ? `참고 자료(실제 검색된 정보, 이 안에서만 사실을 가져와라):\n${contextSnippets.map((s) => `- ${s}`).join("\n")}`
    : "참고 자료 없음 - 구체적인 사실(신곡명, 수상 내역 등)을 지어내지 말고, 그룹/인물 소개 수준의 일반적인 문구만 써라.";

  const prompt = `너는 엔터테인먼트 홍보 담당자다. "${topic}"에 대한 홍보 숏폼 영상 맨 앞에 나올 짧은 한국어 나레이션 문구를 1~2문장으로 써라.

${context}

참고 자료에 없는 사실(곡 제목, 수상, 날짜 등)은 절대 지어내지 마라. 특수문자, 이모지, 따옴표 없이 자연스러운 구어체로 작성해라. 문구만 출력해라.`;

  const raw = await generateText({ prompt, temperature: 0.6 });
  const narration = raw.replace(/["'“”‘’]/g, "").trim();
  if (!narration) throw new Error("AI가 나레이션 문구를 만들지 못했습니다.");

  return narration;
}
