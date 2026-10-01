/**
 * Text generation behind one seam so callers do not care which model serves them.
 * Gemini is used when GEMINI_API_KEY is set (or LLM_PROVIDER=gemini); otherwise the local Ollama server.
 */
export interface GenerateOptions {
  prompt: string;
  /** Ask the model for a JSON object; the returned text is the raw JSON string. */
  json?: boolean;
  temperature?: number;
}

type Provider = "gemini" | "ollama";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.SHORTFORM_PLAN_MODEL ?? "qwen2.5:7b-instruct";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 60_000;

export function resolveProvider(environment: Record<string, string | undefined> = process.env): Provider {
  const requested = environment.LLM_PROVIDER;
  if (requested === "gemini" || requested === "ollama") return requested;
  return environment.GEMINI_API_KEY ? "gemini" : "ollama";
}

async function generateWithOllama({ prompt, json, temperature }: GenerateOptions): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        ...(json ? { format: "json" } : {}),
        stream: false,
        options: { temperature: temperature ?? 0.4 },
      }),
    });
  } catch {
    throw new Error(
      "로컬 Ollama 서버에 연결할 수 없습니다. 터미널에서 'ollama serve'가 실행 중인지 확인하거나 GEMINI_API_KEY를 설정해주세요.",
    );
  }
  if (!response.ok) {
    throw new Error(`Ollama 요청이 실패했습니다 (status ${response.status}). '${OLLAMA_MODEL}' 모델이 설치되어 있는지 확인해주세요.`);
  }
  const data = (await response.json()) as { response?: string };
  return data.response ?? "";
}

async function generateWithGemini({ prompt, json, temperature }: GenerateOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가해주세요.");

  let response: Response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temperature ?? 0.4,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });
  } catch {
    throw new Error("Gemini API에 연결하지 못했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
  }
  if (!response.ok) {
    // Never echo the response body: it can contain request details. Status is enough to act on.
    const hint = response.status === 400 || response.status === 403 ? " API 키가 올바른지 확인해주세요." : response.status === 429 ? " 요청 한도를 초과했습니다." : "";
    throw new Error(`Gemini 요청이 실패했습니다 (status ${response.status}).${hint}`);
  }
  const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
}

export function generateText(options: GenerateOptions): Promise<string> {
  return resolveProvider() === "gemini" ? generateWithGemini(options) : generateWithOllama(options);
}
