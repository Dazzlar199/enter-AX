import type { WorkflowDefinition, WorkflowNode } from "./types";

const node = (id: string, type: WorkflowNode["type"], name: string, x: number, params: Record<string, string> = {}, y = 0): WorkflowNode => ({
  id,
  type,
  name,
  position: { x, y },
  params,
});

const chain = (ids: string[]) => ids.slice(1).map((target, index) => ({ id: `${ids[index]}->${target}`, source: ids[index], target }));

/** Starter workflows shown on first visit. Every node here runs against real app data or real APIs. */
export function starterWorkflows(): WorkflowDefinition[] {
  const now = new Date().toISOString();
  return [
    {
      id: "wf-vocal-review",
      name: "보컬 지원자 1차 검토",
      updatedAt: now,
      nodes: [
        node("start", "trigger.manual", "직접 시작", 0),
        node("talents", "app.talents", "보컬 지원자", 280, { field: "vocal", offers: "open" }),
        node("approve", "human.approval", "캐스팅 리드 승인", 560, { approver: "캐스팅팀 리드", message: "아래 보컬 지원자를 내부 검토 단계로 올릴까요?" }),
        node("review", "app.review", "내부 검토로 옮기기", 840),
      ],
      edges: chain(["start", "talents", "approve", "review"]),
    },
    {
      id: "wf-kpop-audition-pipeline",
      name: "K-POP 오디션 검토 및 안내",
      updatedAt: now,
      nodes: [
        node("forms", "trigger.googleforms", "구글 폼 지원서 인입", 0, { formId: "audition-kpop-2026", pollInterval: "1" }),
        node("sheets", "sheets.append", "스프레드시트 실시간 기록", 280, { spreadsheetId: "docs.google.com/spreadsheets/d/1Audition2026", sheetName: "지원자_명단", columns: "활동명, 분야, 지역, 연락처" }),
        node("dance_ai", "ai.dance_pose", "안무 동작 비교", 560, { referenceChoreo: "hype_boy", passThreshold: "85" }),
        node("approve", "human.approval", "캐스팅 담당자 확인", 840, { approver: "캐스팅팀 총괄", message: "검토한 지원자들에게 2차 대면 오디션 알림톡을 발송할까요?" }),
        node("alimtalk", "kakaotalk.alimtalk", "카카오톡 안내 준비", 1120, { templateCode: "AUDITION_PASS", phoneField: "연락처", message: "[ENTER—AX] {{활동명}}님, 2차 실기 오디션 대상자로 선정되셨습니다." }),
        node("notion", "notion.sync", "지원자 명단 정리", 1400, { databaseId: "notion.so/enter-ax-trainee-db", tags: "2026공채, 1차합격" }),
      ],
      edges: chain(["forms", "sheets", "dance_ai", "approve", "alimtalk", "notion"]),
    },
    {
      id: "wf-ai-briefing",
      name: "신규 지원자 검토 요약 및 공유",
      updatedAt: now,
      nodes: [
        node("start", "trigger.manual", "직접 시작", 0),
        node("talents", "app.talents", "전체 지원자", 280, { field: "all", offers: "any" }),
        node("fields", "logic.fields", "필요한 정보만", 560, { keep: "활동명, 분야, 지역, 소개" }),
        node("summary", "ai.summary", "검토 내용 요약", 840, { topic: "이번 주 신규 지원자" }),
        node("approve", "human.approval", "팀장 확인", 1120, { approver: "A&R 팀장", message: "요약 내용을 팀 채널에 공유할까요?" }),
        node("slack", "slack.message", "팀 채널 공유", 1400, { webhookUrl: "", text: "신규 지원자 브리핑\n{{summary}}" }),
      ],
      edges: chain(["start", "talents", "fields", "summary", "approve", "slack"]),
    },
    {
      id: "wf-shortform-pipeline",
      name: "오디션 영상 9:16 숏폼 자동 발행",
      updatedAt: now,
      nodes: [
        node("start", "trigger.manual", "직접 시작", 0),
        node("talents", "app.talents", "댄스 지원자", 280, { field: "dance", offers: "open" }),
        node("ffmpeg", "media.ffmpeg_cut", "세로 영상 만들기", 560, { duration: "30", cropMode: "auto_face", audioNormalize: "true" }),
        node("approve", "human.approval", "마케팅팀 승인", 840, { approver: "SNS 마케팅팀", message: "선별된 숏폼 클립을 공식 유튜브 Shorts에 발행할까요?" }),
        node("youtube", "youtube.upload", "YouTube Shorts 예약 발행", 1120, { title: "#Shorts {{활동명}} 댄스 클립", privacy: "unlisted", tags: "#KPOP #AUDITION #ENTERAX" }),
      ],
      edges: chain(["start", "talents", "ffmpeg", "approve", "youtube"]),
    },
  ];
}

export function blankWorkflow(name: string): WorkflowDefinition {
  const id = `wf-${Date.now().toString(36)}`;
  return { id, name, updatedAt: new Date().toISOString(), nodes: [node("start", "trigger.manual", "직접 시작", 0)], edges: [] };
}
