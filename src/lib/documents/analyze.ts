const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const PLAN_MODEL = process.env.SHORTFORM_PLAN_MODEL ?? "qwen2.5:7b-instruct";

export interface ActionPlanStep {
  step: string;
  detail: string;
}

export interface DocumentAnalysis {
  summary: string;
  goals: string[];
  strengths: string[];
  risks: string[];
  missingInfo: string[];
  actionPlan: ActionPlanStep[];
}

interface OllamaGenerateResponse {
  response: string;
}

function buildPrompt(text: string, fileName: string): string {
  return `너는 엔터테인먼트 회사의 기획 보조 AI다. 아래는 "${fileName}"라는 문서의 내용이다.

---
${text}
---

이 문서를 꼼꼼히 읽고 아래 항목을 분석해라:
1. summary: 이 문서가 무엇에 관한 것인지 3~5문장으로 요약
2. goals: 문서에서 파악되는 핵심 목표/의도 (배열, 각 항목 1문장)
3. strengths: 기획의 잘 된 점, 구체적인 강점 (배열)
4. risks: 실행 시 우려되는 리스크나 약점 (배열)
5. missingInfo: 기획을 완성하려면 추가로 확인/보완해야 할 정보나 질문 (배열)
6. actionPlan: 다음에 실행해야 할 구체적인 액션 아이템 (3~6개, 각각 {"step": "짧은 제목", "detail": "구체적 설명"})

문서에 없는 내용을 지어내지 말고, 실제 문서 내용에 근거해서 분석해라. 정보가 부족한 항목은 빈 배열로 두거나 "문서에서 확인 불가"라고 명시해라.

아래 JSON 형식으로만, 다른 설명 없이 답하라:

{"summary":"...","goals":["..."],"strengths":["..."],"risks":["..."],"missingInfo":["..."],"actionPlan":[{"step":"...","detail":"..."}]}`;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function toActionPlan(value: unknown): ActionPlanStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      step: typeof item.step === "string" ? item.step : "",
      detail: typeof item.detail === "string" ? item.detail : "",
    }))
    .filter((item) => item.step.trim().length > 0);
}

export async function analyzePlanningDocument(text: string, fileName: string): Promise<DocumentAnalysis> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: PLAN_MODEL,
        prompt: buildPrompt(text, fileName),
        format: "json",
        stream: false,
        options: { temperature: 0.3 },
      }),
    });
  } catch {
    throw new Error(
      "로컬 Ollama 서버에 연결할 수 없습니다. 터미널에서 'ollama serve'가 실행 중인지 확인해주세요.",
    );
  }

  if (!response.ok) {
    throw new Error(`Ollama 요청이 실패했습니다 (status ${response.status}). '${PLAN_MODEL}' 모델이 설치되어 있는지 확인해주세요.`);
  }

  const data = (await response.json()) as OllamaGenerateResponse;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(data.response) as Record<string, unknown>;
  } catch {
    throw new Error("AI가 분석 결과를 올바른 형식으로 만들지 못했습니다. 다시 시도해주세요.");
  }

  const summary = typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : "요약을 생성하지 못했습니다.";

  return {
    summary,
    goals: toStringArray(parsed.goals),
    strengths: toStringArray(parsed.strengths),
    risks: toStringArray(parsed.risks),
    missingInfo: toStringArray(parsed.missingInfo),
    actionPlan: toActionPlan(parsed.actionPlan),
  };
}
