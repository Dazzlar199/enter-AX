import { generateText } from "@/lib/ai/llm";
import type { TranscriptChunk } from "./transcribe";

export interface PlanSegment {
  /** AI-chosen short Korean role label for this segment (e.g. "후킹", "질문", "클라이맥스") - not a fixed enum, tailored to the content type. */
  role: string;
  start: number;
  end: number;
  caption: string;
}

export interface ShortformPlan {
  /** AI's own classification of what kind of content this is (e.g. "아이돌 퍼포먼스", "인터뷰", "브이로그"). */
  contentType: string;
  segments: PlanSegment[];
}

const MAX_ROLE_LENGTH = 12;

function buildPrompt(transcriptChunks: TranscriptChunk[], durationSec: number, targetDurationSec: number, purpose?: string): string {
  const transcriptText = transcriptChunks.length
    ? transcriptChunks.map((chunk) => `[${chunk.start.toFixed(1)}s~${chunk.end.toFixed(1)}s] ${chunk.text}`).join("\n")
    : "(인식된 대화 없음 - 배경음악/영상만 존재할 수 있음)";

  const purposeLine = purpose?.trim() ? `이 영상으로 만들고자 하는 홍보 목적: ${purpose.trim()}\n\n` : "";

  return `너는 엔터테인먼트 회사의 콘텐츠 기획 전문가다. 아래는 원본 영상(총 길이 ${durationSec.toFixed(1)}초)을 음성 인식한 대본이다.

${transcriptText}

${purposeLine}먼저 이 영상이 어떤 종류의 콘텐츠인지(예: 아이돌 퍼포먼스/뮤직비디오, 인터뷰, 브이로그, 챌린지, 시상식 소감, 코미디 콩트, 강연, 언박싱 등) 대본 내용을 보고 스스로 판단해라.

그 다음, 미리 정해진 형식(예: 인트로-하이라이트-아웃트로)에 얽매이지 말고, 이 콘텐츠 유형과 목적에 실제로 가장 잘 맞는 숏폼 편집 흐름을 직접 설계해라. 예를 들어 인터뷰라면 "질문 제시 → 핵심 답변 → 임팩트 있는 한마디"가 맞을 수 있고, 퍼포먼스 영상이라면 "분위기 조성 → 킬링파트 → 마무리 포즈"가 맞을 수 있다. 콘텐츠 성격에 따라 완전히 다른 구조를 써도 된다.

세그먼트는 2~5개 사용하고, 각 구간마다 그 역할을 나타내는 ${MAX_ROLE_LENGTH}자 이내의 짧은 한국어 라벨(role)을 이 콘텐츠에 맞게 직접 지어라. 정해진 목록이 아니라 자유롭게 짓는다.

규칙:
- 이건 숏폼이다. 모든 구간의 길이를 합쳐서 총 ${targetDurationSec}초를 넘지 않도록 해라. 절대 원본을 통째로 넣지 말고, 각 구간에서 가장 임팩트 있는 짧은 부분만 골라라.
- 각 구간은 3초 이상, ${Math.min(30, targetDurationSec)}초 이하로 유지해라.
- 각 구간의 start/end는 0 이상 ${durationSec.toFixed(1)} 이하의 실제 시간(초)이어야 하고, 구간끼리 겹치면 안 된다.
- caption에는 그 구간에 화면 자막으로 넣을 짧은 한국어 문구를 작성한다.
- 아래 JSON 형식으로만, 다른 설명 없이 답하라.

{"contentType":"...","segments":[{"role":"...","start":0,"end":5,"caption":"..."},{"role":"...","start":10,"end":25,"caption":"..."}]}`;
}

const MAX_SEGMENT_SECONDS = 40;

function isPlanSegment(value: unknown, durationSec: number): value is PlanSegment {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.role === "string" &&
    candidate.role.trim().length > 0 &&
    candidate.role.length <= MAX_ROLE_LENGTH &&
    typeof candidate.start === "number" &&
    typeof candidate.end === "number" &&
    typeof candidate.caption === "string" &&
    candidate.caption.trim().length > 0 &&
    candidate.start >= 0 &&
    candidate.end <= durationSec + 0.5 &&
    candidate.end - candidate.start >= 3 &&
    candidate.end - candidate.start <= MAX_SEGMENT_SECONDS
  );
}

function removeOverlaps(segments: PlanSegment[]): PlanSegment[] {
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const result: PlanSegment[] = [];
  let lastEnd = -Infinity;
  for (const segment of sorted) {
    if (segment.start < lastEnd) continue;
    result.push(segment);
    lastEnd = segment.end;
  }
  return result;
}

/** Defense in depth: if the model ignores the target-duration instruction, drop/trim segments (in chosen order) until the total fits within budget. */
function enforceDurationBudget(segments: PlanSegment[], targetDurationSec: number): PlanSegment[] {
  const budget = targetDurationSec * 1.5;
  const kept: PlanSegment[] = [];
  let total = 0;

  for (const segment of segments) {
    const duration = segment.end - segment.start;
    if (total >= budget) break;
    if (total + duration <= budget) {
      kept.push(segment);
      total += duration;
    } else {
      const remaining = budget - total;
      if (remaining >= 3) {
        kept.push({ ...segment, end: segment.start + remaining });
        total = budget;
      }
      break;
    }
  }

  return kept;
}

export async function planShortformStructure(
  transcriptChunks: TranscriptChunk[],
  durationSec: number,
  targetDurationSec = 45,
  purpose?: string,
): Promise<ShortformPlan> {
  const raw = await generateText({
    prompt: buildPrompt(transcriptChunks, durationSec, targetDurationSec, purpose),
    json: true,
    temperature: 0.4,
  });

  let parsed: { contentType?: unknown; segments?: unknown };
  try {
    parsed = JSON.parse(raw) as { contentType?: unknown; segments?: unknown };
  } catch {
    throw new Error("AI가 기획안을 올바른 형식으로 만들지 못했습니다. 다시 시도해주세요.");
  }

  if (!Array.isArray(parsed.segments)) {
    throw new Error("AI 기획안 응답에 segments 배열이 없습니다.");
  }

  const validSegments = parsed.segments.filter((segment): segment is PlanSegment => isPlanSegment(segment, durationSec));
  const segments = enforceDurationBudget(removeOverlaps(validSegments), targetDurationSec);

  if (segments.length === 0) {
    throw new Error("AI가 유효한 기획안을 만들지 못했습니다. 다시 시도해주세요.");
  }

  const contentType = typeof parsed.contentType === "string" && parsed.contentType.trim() ? parsed.contentType.trim() : "일반 콘텐츠";

  return { contentType, segments };
}
