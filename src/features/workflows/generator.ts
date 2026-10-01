import type { WorkflowDefinition, WorkflowNode, WorkflowNodeType } from "./types";
import { getNodeDefinition } from "./catalog";

export type PipelineTemplateIntent = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  nodes: Array<{
    id: string;
    type: WorkflowNodeType;
    name: string;
    presetId?: string;
    params?: Record<string, string>;
  }>;
};

/** Pre-built enterprise pipeline blueprints mapped to natural language intents. */
export const enterpriseBlueprints: PipelineTemplateIntent[] = [
  {
    id: "kpop-dance-audition-pipeline",
    title: "K-POP 댄스 오디션 검토 및 안내",
    description: "지원서 접수부터 안무 동작 비교, 담당자 확인, 카카오톡 안내 준비와 명단 정리까지 이어지는 업무 흐름",
    keywords: ["구글폼", "구글 폼", "댄스", "안무", "mediapipe", "미디어파이프", "카톡", "카카오톡", "알림톡", "노션", "80점", "오디션"],
    nodes: [
      { id: "forms", type: "trigger.googleforms", name: "구글 폼 지원서 인입", params: { formId: "kpop-dance-audition-2026", pollInterval: "1" } },
      { id: "sheets", type: "sheets.append", name: "스프레드시트 실시간 기록", params: { spreadsheetId: "docs.google.com/spreadsheets/d/1Audition2026", sheetName: "지원자_명단", columns: "활동명, 분야, 지역, 연락처" } },
      { id: "dance_ai", type: "ai.dance_pose", name: "안무 동작 비교", params: { referenceChoreo: "hype_boy", passThreshold: "85" } },
      { id: "approve", type: "human.approval", name: "캐스팅 담당자 확인", params: { approver: "캐스팅팀 총괄", message: "검토한 지원자들에게 2차 대면 오디션 알림톡을 발송할까요?" } },
      { id: "alimtalk", type: "kakaotalk.alimtalk", name: "카카오톡 안내 준비", params: { templateCode: "AUDITION_PASS", phoneField: "연락처", message: "[ENTER—AX] {{활동명}}님, 2차 실기 오디션 대상자로 선정되셨습니다." } },
      { id: "notion", type: "notion.sync", name: "지원자 명단 정리", params: { databaseId: "notion.so/enter-ax-trainee-pool", tags: "2026공채, 1차합격" } },
    ],
  },
  {
    id: "shortform-omnichannel-pipeline",
    title: "오디션 영상 9:16 숏폼 추출 & 유튜브·틱톡 동시 발행",
    description: "영상 인물 스마트 트래킹 컷팅 후 유튜브 쇼츠와 틱톡에 동시 예약 업로드",
    keywords: ["숏폼", "ffmpeg", "9:16", "유튜브", "쇼츠", "틱톡", "tiktok", "인스타", "릴스", "영상", "하이라이트"],
    nodes: [
      { id: "start", type: "trigger.manual", name: "영상 컷팅 시작", params: {} },
      { id: "talents", type: "app.talents", name: "심사 통과 영상 가져오기", params: { field: "all", offers: "open" } },
      { id: "cut", type: "media.ffmpeg_cut", name: "세로 영상 만들기", params: { duration: "30", cropMode: "auto_face", audioNormalize: "true" } },
      { id: "approve", type: "human.approval", name: "콘텐츠 팀장 배포 승인", params: { approver: "콘텐츠 팀장", message: "추출된 숏폼 30초 클립을 공식 채널에 업로드할까요?" } },
      { id: "youtube", type: "youtube.upload", name: "YouTube Shorts 공식 업로드", params: { title: "[ENTER—AX] 오디션 하이라이트 #Shorts #KPOP", privacy: "public", tags: "#KPOP #AUDITION #Shorts" } },
      { id: "tiktok", type: "tiktok.upload", name: "TikTok 숏폼 동시 배포", params: { title: "2026 글로벌 오디션 현장 직캠 🔥 #KpopAudition", soundTitle: "Enter-AX Official Beat Vol.1" } },
    ],
  },
  {
    id: "ar-demo-copyright-pipeline",
    title: "A&R 데모곡 중복 확인 및 미팅 준비",
    description: "접수된 데모에서 비슷한 음원을 확인하고 담당자 검토 후 미팅 일정을 준비하는 업무 흐름",
    keywords: ["a&r", "A&R", "데모", "음원", "표절", "유사도", "캘린더", "미팅", "작곡가", "노션"],
    nodes: [
      { id: "forms", type: "trigger.googleforms", name: "작곡가 데모곡 온라인 접수", params: { formId: "ar-demo-submission-box", pollInterval: "5" } },
      { id: "ar_check", type: "ar.duplicate_audio", name: "A&R 음향 지문 유사도 검출", params: { similarityThreshold: "75", dbScope: "internal" } },
      { id: "filter", type: "logic.filter", name: "중복 가능성 낮은 곡 확인", params: { field: "중복검토", operator: "contains", value: "낮음" } },
      { id: "approve", type: "human.approval", name: "A&R 총괄 디렉터 검토", params: { approver: "A&R 총괄 디렉터", message: "중복 이상 없는 데모곡을 검토하고 작곡가 미팅을 잡을까요?" } },
      { id: "calendar", type: "calendar.schedule", name: "Google Calendar 미팅 등록", params: { eventTitle: "[A&R 미팅] 데모곡 음원 퍼블리싱 검토", location: "본사 5층 회의실 B", durationMin: "60" } },
      { id: "notion", type: "notion.sync", name: "A&R 큐시트 DB 동기화", params: { databaseId: "notion.so/enter-ax-ar-demos", tags: "타이틀후보, 2026컴백" } },
    ],
  },
  {
    id: "vocal-gpt4o-deep-eval-pipeline",
    title: "보컬 지원 자료 정리 및 Slack 공유",
    description: "보컬 지원 자료의 확인 항목을 정리하고 담당자 확인 후 팀 채널 공유를 준비하는 업무 흐름",
    keywords: ["보컬", "gpt", "gpt-4o", "openai", "심층", "평가", "슬랙", "slack", "브리핑", "요약"],
    nodes: [
      { id: "start", type: "trigger.manual", name: "보컬 심사 시작", params: {} },
      { id: "talents", type: "app.talents", name: "보컬 지원자 풀 로드", params: { field: "vocal", offers: "open" } },
      { id: "gpt", type: "openai.analyze", name: "보컬 자료 확인 항목 정리", params: { model: "gpt-4o", evaluationCriteria: "음색, 음정 변화, 발음과 녹음 상태를 관찰 가능한 사실 중심으로 정리해줘." } },
      { id: "summary", type: "ai.summary", name: "검토 내용 요약", params: { topic: "이번 주 보컬 지원 자료" } },
      { id: "approve", type: "human.approval", name: "캐스팅 리드 공유 승인", params: { approver: "캐스팅팀 리드", message: "심층 평가 브리핑을 전사 캐스팅 채널에 공유할까요?" } },
      { id: "slack", type: "slack.message", name: "Slack 캐스팅 채널 알림", params: { webhookUrl: "https://hooks.slack.com/services/ENTER_AX/CASTING", text: "신규 보컬 지원자 심층 평가 브리핑:\n{{summary}}" } },
    ],
  },
];

export function buildWorkflowFromBlueprint(blueprint: PipelineTemplateIntent, customTitle?: string): WorkflowDefinition {
  const now = new Date().toISOString();
  const workflowId = `wf-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;
  const title = customTitle || blueprint.title;

  const nodes: WorkflowNode[] = blueprint.nodes.map((entry, index) => {
    const definition = getNodeDefinition(entry.type);
    const defaults = definition?.defaults ?? {};
    return {
      id: `${entry.id}-${Date.now().toString(36).slice(-4)}-${index}`,
      type: entry.type,
      name: entry.name,
      position: { x: index * 280, y: 0 },
      params: { ...defaults, ...(entry.params ?? {}) },
    };
  });

  const edges = nodes.slice(1).map((node, i) => ({
    id: `${nodes[i].id}->${node.id}`,
    source: nodes[i].id,
    target: node.id,
  }));

  return {
    id: workflowId,
    name: title,
    updatedAt: now,
    nodes,
    edges,
  };
}

/**
 * Parses natural language prompt and generates a 100% complete, pre-configured workflow.
 */
export function generateWorkflowFromPrompt(prompt: string): WorkflowDefinition {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  // Find best matching enterprise blueprint based on keyword overlap
  let bestMatch: PipelineTemplateIntent = enterpriseBlueprints[0];
  let maxScore = -1;

  for (const blueprint of enterpriseBlueprints) {
    let score = 0;
    for (const kw of blueprint.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += 2;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = blueprint;
    }
  }

  const title = trimmed.length > 0 && trimmed.length <= 40 ? trimmed : bestMatch.title;
  return buildWorkflowFromBlueprint(bestMatch, title);
}
