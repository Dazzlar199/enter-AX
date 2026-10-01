import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

import { generateText, resolveProvider } from "@/lib/ai/llm";

const execFileAsync = promisify(execFile);

const NARRATION_VOICE = process.env.NARRATION_VOICE ?? "Yuna";

const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts";
const GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE ?? "Kore";
const PCM_SAMPLE_RATE = 24_000;

/** Wraps raw 16-bit mono PCM in a WAV container. */
function pcmToWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
  header.writeUInt32LE(PCM_SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function synthesizeWithGemini(text: string, outputPath: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } } },
        },
      }),
    });
  } catch {
    throw new Error("Gemini 음성 합성 API에 연결하지 못했습니다.");
  }
  if (!response.ok) throw new Error(`Gemini 음성 합성이 실패했습니다 (status ${response.status}).`);
  const data = (await response.json()) as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };
  const audio = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData?.data;
  if (!audio) throw new Error("Gemini가 음성을 만들지 못했습니다.");
  // Content is WAV regardless of the file extension; ffmpeg detects the format by probing.
  await writeFile(outputPath, pcmToWav(Buffer.from(audio, "base64")));
}

/** Synthesizes Korean speech: Gemini TTS when a key is configured, otherwise macOS's built-in `say` (Yuna). */
export async function synthesizeNarration(text: string, outputPath: string): Promise<void> {
  if (resolveProvider() === "gemini") return synthesizeWithGemini(text, outputPath);
  try {
    await execFileAsync("say", ["-v", NARRATION_VOICE, "-o", outputPath, text]);
  } catch {
    throw new Error(
      "로컬 TTS(macOS 'say' 명령)로 나레이션을 만들지 못했습니다. GEMINI_API_KEY를 설정하면 서버에서도 음성을 만들 수 있습니다.",
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
