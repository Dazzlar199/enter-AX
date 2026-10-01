import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const NARRATION_VOICE = process.env.NARRATION_VOICE ?? "Yuna";
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const NARRATION_MODEL = process.env.SHORTFORM_PLAN_MODEL ?? "qwen2.5:7b-instruct";

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

/** Asks the local Ollama model to write a short Korean promo narration line for the given topic. */
export async function generatePromoNarration(topic: string, contextSnippets: string[] = []): Promise<string> {
  const context = contextSnippets.length
    ? `참고 자료(실제 검색된 정보, 이 안에서만 사실을 가져와라):\n${contextSnippets.map((s) => `- ${s}`).join("\n")}`
    : "참고 자료 없음 - 구체적인 사실(신곡명, 수상 내역 등)을 지어내지 말고, 그룹/인물 소개 수준의 일반적인 문구만 써라.";

  const prompt = `너는 엔터테인먼트 홍보 담당자다. "${topic}"에 대한 홍보 숏폼 영상 맨 앞에 나올 짧은 한국어 나레이션 문구를 1~2문장으로 써라.

${context}

참고 자료에 없는 사실(곡 제목, 수상, 날짜 등)은 절대 지어내지 마라. 특수문자, 이모지, 따옴표 없이 자연스러운 구어체로 작성해라. 문구만 출력해라.`;

  let response: Response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: NARRATION_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.6 },
      }),
    });
  } catch {
    throw new Error("로컬 Ollama 서버에 연결할 수 없습니다. 터미널에서 'ollama serve'가 실행 중인지 확인해주세요.");
  }

  if (!response.ok) {
    throw new Error(`Ollama 요청이 실패했습니다 (status ${response.status}).`);
  }

  const data = (await response.json()) as { response: string };
  const narration = data.response.replace(/["'“”‘’]/g, "").trim();
  if (!narration) throw new Error("AI가 나레이션 문구를 만들지 못했습니다.");

  return narration;
}
