import type { WorkflowNodeType } from "./types";

export type NodeCategory = "trigger" | "app" | "data" | "ai" | "human" | "integration" | "custom";

export type ParamField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "select" | "url";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  help?: string;
  required?: boolean;
};

export type NodeIcon =
  | { logo: string }
  | { glyph: "play" | "people" | "globe" | "filter" | "columns" | "sparkle" | "hand" | "board" | "megaphone" };

export type NodePreset = {
  id: string;
  label: string;
  badge?: string;
  description: string;
  params: Record<string, string>;
};

export type NodeDefinition = {
  type: WorkflowNodeType;
  label: string;
  description: string;
  category: NodeCategory;
  icon: NodeIcon;
  /** Where the node runs. Server nodes go through /api/v1/workflows/execute. */
  runtime: "client" | "server";
  params: ParamField[];
  defaults: Record<string, string>;
  /** Whether this step performs a real action or only demonstrates the expected result. */
  execution?: "live" | "demo";
  hiddenFromPalette?: boolean;
  /** Named outputs for branching nodes; edges leaving one carry its id as `sourceHandle`. */
  outputs?: Array<{ id: string; label: string }>;
  presets?: NodePreset[];
  isCustom?: boolean;
};

export const categoryMeta: Record<NodeCategory, { label: string }> = {
  trigger: { label: "시작 방법" },
  app: { label: "ENTER—AX" },
  data: { label: "데이터 처리" },
  ai: { label: "자료 분석" },
  human: { label: "담당자 확인" },
  integration: { label: "외부 연동" },
  custom: { label: "맞춤 단계" },
};

export const availableLogos = [
  { id: "kakaotalk", label: "카카오톡", path: "/logos/kakaotalk-color.svg" },
  { id: "gmail", label: "Gmail", path: "/logos/gmail-color.svg" },
  { id: "notion", label: "Notion", path: "/logos/notion-color.svg" },
  { id: "sheets", label: "Google Sheets", path: "/logos/sheets-color.svg" },
  { id: "gdrive", label: "Google Drive", path: "/logos/gdrive-color.svg" },
  { id: "slack", label: "Slack", path: "/logos/slack-color.svg" },
  { id: "youtube", label: "YouTube", path: "/logos/youtube.svg" },
  { id: "instagram", label: "Instagram", path: "/logos/instagram.svg" },
  { id: "tiktok", label: "TikTok", path: "/logos/tiktok.svg" },
  { id: "openai", label: "OpenAI", path: "/logos/openai.svg" },
  { id: "mediapipe", label: "MediaPipe", path: "/logos/mediapipe.svg" },
  { id: "ffmpeg", label: "FFmpeg", path: "/logos/ffmpeg.svg" },
  { id: "googleforms", label: "Google Forms", path: "/logos/googleforms.svg" },
  { id: "googlecalendar", label: "Google Calendar", path: "/logos/googlecalendar.svg" },
  { id: "python", label: "Python Script", path: "/logos/python.svg" },
] as const;

export const availableGlyphs: Array<Extract<NodeIcon, { glyph: string }>["glyph"]> = [
  "play",
  "people",
  "globe",
  "filter",
  "columns",
  "sparkle",
  "hand",
  "board",
  "megaphone",
];

const fieldOptions = [
  { value: "all", label: "전체 분야" },
  { value: "idol", label: "아이돌" },
  { value: "vocal", label: "보컬" },
  { value: "dance", label: "댄스" },
  { value: "actor", label: "배우" },
  { value: "model", label: "모델" },
];

export const nodeCatalog: NodeDefinition[] = [
  // --- TRIGGERS ---
  {
    type: "trigger.manual",
    label: "직접 시작",
    description: "‘업무 흐름 시작’ 버튼을 누르면 바로 시작합니다.",
    category: "trigger",
    icon: { glyph: "play" },
    runtime: "client",
    params: [],
    defaults: {},
  },
  {
    type: "trigger.googleforms",
    label: "Google Forms 접수 예시",
    description: "구글 설문지로 지원서가 들어오는 상황을 데모 데이터로 보여줍니다.",
    category: "trigger",
    icon: { logo: "/logos/googleforms.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "formId", label: "구글 폼 ID 또는 Webhook 주소", kind: "text", required: true, placeholder: "1FAIpQLSc_enter_ax_audition" },
      { key: "pollInterval", label: "확인 주기", kind: "select", options: [{ value: "1", label: "1분마다 실시간 인입" }, { value: "5", label: "5분마다 배치 인입" }, { value: "60", label: "1시간마다 정기 인입" }] },
    ],
    defaults: { formId: "1FAIpQLSc_enter_ax_audition", pollInterval: "1" },
    presets: [
      { id: "audition_form", label: "2026 공채 오디션 지원서", badge: "오디션", description: "글로벌 K-POP 오디션 설문지 1분 실시간 수집", params: { formId: "audition-kpop-2026", pollInterval: "1" } },
      { id: "demo_box", label: "A&R 데모곡 접수함", badge: "A&R", description: "외부 작곡가 신곡 데모 5분 배치 인입", params: { formId: "ar-demo-submissions-2026", pollInterval: "5" } },
    ],
  },

  // --- APP NODES ---
  {
    type: "app.talents",
    label: "지원자 가져오기",
    description: "등록된 지원자 프로필을 조건에 맞춰 불러옵니다.",
    category: "app",
    icon: { glyph: "people" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "field", label: "분야", kind: "select", options: fieldOptions },
      {
        key: "offers",
        label: "제안 수신",
        kind: "select",
        options: [
          { value: "any", label: "상관없음" },
          { value: "open", label: "제안 받는 지원자만" },
        ],
      },
    ],
    defaults: { field: "all", offers: "open" },
    presets: [
      { id: "vocal_talents", label: "보컬 제안 지원자", badge: "보컬", description: "보컬 분야 중 캐스팅 제안 수신자만", params: { field: "vocal", offers: "open" } },
      { id: "dance_talents", label: "댄스 제안 지원자", badge: "댄스", description: "댄스/퍼포먼스 분야 중 제안 수신자", params: { field: "dance", offers: "open" } },
      { id: "all_idols", label: "글로벌 아이돌 전체", badge: "아이돌", description: "아이돌 분야 전체 지원자 풀", params: { field: "idol", offers: "any" } },
    ],
  },
  {
    type: "app.review",
    label: "내부 검토로 옮기기",
    description: "선별된 지원자를 지원자 관리의 ‘내부 검토’ 단계로 이동합니다.",
    category: "app",
    icon: { glyph: "board" },
    runtime: "client",
    execution: "demo",
    params: [],
    defaults: {},
  },
  {
    type: "app.post",
    label: "커뮤니티 공지",
    description: "지원자 전용 커뮤니티에 합격자 또는 공지 글을 자동 게시합니다.",
    category: "app",
    icon: { glyph: "megaphone" },
    runtime: "client",
    execution: "demo",
    params: [
      {
        key: "category",
        label: "게시판",
        kind: "select",
        options: [
          { value: "정보공유", label: "정보 공유" },
          { value: "자유", label: "자유" },
        ],
      },
      { key: "title", label: "제목", kind: "text", required: true, placeholder: "{{count}}명 대상 2차 오디션 일정 안내" },
      { key: "body", label: "본문", kind: "textarea", required: true, placeholder: "{{summary}}", help: "{{항목명}}은 첫 번째 데이터의 값, {{count}}는 데이터 건수로 바뀝니다." },
    ],
    defaults: { category: "정보공유", title: "", body: "" },
    presets: [
      { id: "pass_notice", label: "2차 오디션 합격자 공지", badge: "합격발표", description: "지원자 커뮤니티에 합격자 및 일정 자동 게시", params: { category: "정보공유", title: "[공지] 2026 하반기 오디션 1차 합격자 (총 {{count}}명)", body: "합격자 개별 안내가 발송되었습니다. 2차 실기 오디션 일정을 확인해 주세요." } },
    ],
  },

  // --- DATA & LOGIC ---
  {
    type: "http.request",
    label: "외부 API 호출 (HTTP)",
    description: "다른 서비스의 REST API를 호출해 실시간 데이터를 조회하거나 전달합니다.",
    category: "data",
    icon: { glyph: "globe" },
    runtime: "server",
    params: [
      {
        key: "method",
        label: "요청 방식",
        kind: "select",
        options: [
          { value: "GET", label: "GET" },
          { value: "POST", label: "POST" },
        ],
      },
      { key: "url", label: "API 주소", kind: "url", required: true, placeholder: "https://api.example.com/items", help: "공개 인터넷 주소만 호출할 수 있습니다." },
      { key: "headers", label: "헤더 (JSON)", kind: "textarea", placeholder: '{"Authorization": "Bearer …"}' },
      { key: "body", label: "본문 (JSON, POST)", kind: "textarea", placeholder: '{"key": "value"}' },
      { key: "path", label: "가져올 목록 위치", kind: "text", placeholder: "data.items", help: "비우면 응답 전체를 씁니다." },
    ],
    defaults: { method: "GET", url: "", headers: "", body: "", path: "" },
  },
  {
    type: "logic.filter",
    label: "조건으로 거르기",
    description: "지정한 조건에 맞는 데이터만 다음 단계로 넘깁니다.",
    category: "data",
    icon: { glyph: "filter" },
    runtime: "client",
    params: [
      { key: "field", label: "기준 항목", kind: "text", placeholder: "분야", required: true },
      {
        key: "operator",
        label: "조건",
        kind: "select",
        options: [
          { value: "contains", label: "포함" },
          { value: "equals", label: "같음" },
          { value: "not_empty", label: "비어 있지 않음" },
          { value: "gt", label: "보다 큼 (숫자)" },
        ],
      },
      { key: "value", label: "값", kind: "text", placeholder: "보컬" },
    ],
    defaults: { field: "", operator: "contains", value: "" },
  },
  {
    type: "audition.score_filter",
    label: "이전 버전 자동 선별",
    description: "이전 데모와의 호환을 위해 남겨 둔 단계입니다. 새 업무 흐름에는 추가할 수 없습니다.",
    category: "data",
    icon: { glyph: "filter" },
    runtime: "client",
    execution: "demo",
    hiddenFromPalette: true,
    params: [
      { key: "minScore", label: "최소 통과 점수 (100점 만점)", kind: "text", required: true, placeholder: "80" },
      {
        key: "priorityField",
        label: "가산점 분야",
        kind: "select",
        options: [
          { value: "none", label: "가산점 없음" },
          { value: "vocal", label: "보컬 우수자 (+5점)" },
          { value: "dance", label: "댄스 우수자 (+5점)" },
        ],
      },
    ],
    defaults: { minScore: "80", priorityField: "none" },
    presets: [
      { id: "top_vocal_90", label: "최상위권 보컬 (+5점, 90점+)", badge: "보컬특기", description: "보컬 가산점 포함 90점 이상 최상위권 선발", params: { minScore: "90", priorityField: "vocal" } },
      { id: "pass_80", label: "본선 진출자 기준 (80점+)", badge: "표준합격", description: "가산점 없는 기본 80점 커트라인", params: { minScore: "80", priorityField: "none" } },
      { id: "dance_75", label: "댄스 특기자 선발 (75점+)", badge: "댄스특기", description: "댄스 가산점 포함 75점 이상 선발", params: { minScore: "75", priorityField: "dance" } },
    ],
  },
  {
    type: "logic.fields",
    label: "필요한 정보만 남기기",
    description: "필요한 컬럼/필드만 골라 다음 단계로 넘깁니다.",
    category: "data",
    icon: { glyph: "columns" },
    runtime: "client",
    params: [{ key: "keep", label: "남길 항목 (쉼표로 구분)", kind: "text", placeholder: "id, 활동명, 분야, 연락처" }],
    defaults: { keep: "" },
  },
  {
    type: "logic.if",
    label: "조건으로 갈라서 처리",
    description: "조건에 맞는 데이터와 맞지 않는 데이터를 서로 다른 길로 보냅니다. 비어 있는 길의 다음 단계는 건너뜁니다.",
    category: "data",
    icon: { glyph: "filter" },
    runtime: "client",
    outputs: [
      { id: "true", label: "맞음" },
      { id: "false", label: "아님" },
    ],
    params: [
      { key: "field", label: "기준 항목", kind: "text", placeholder: "분야", required: true },
      {
        key: "operator",
        label: "조건",
        kind: "select",
        options: [
          { value: "contains", label: "포함" },
          { value: "equals", label: "같음" },
          { value: "not_empty", label: "비어 있지 않음" },
          { value: "gt", label: "보다 큼 (숫자)" },
        ],
      },
      { key: "value", label: "값", kind: "text", placeholder: "보컬" },
    ],
    defaults: { field: "", operator: "contains", value: "" },
  },
  {
    type: "logic.merge",
    label: "갈라진 길 합치기",
    description: "갈라졌던 길의 데이터를 하나로 모아 다음 단계로 보냅니다. 건너뛴 길이 있어도 진행합니다.",
    category: "data",
    icon: { glyph: "columns" },
    runtime: "client",
    params: [],
    defaults: {},
  },
  {
    type: "logic.sort",
    label: "순서대로 정렬하기",
    description: "선택한 항목 기준으로 데이터를 오름차순·내림차순으로 정렬합니다.",
    category: "data",
    icon: { glyph: "filter" },
    runtime: "client",
    params: [
      { key: "field", label: "기준 항목", kind: "text", required: true, placeholder: "등록일" },
      {
        key: "direction",
        label: "방향",
        kind: "select",
        options: [
          { value: "asc", label: "오름차순 (가→하, 작은 수→큰 수)" },
          { value: "desc", label: "내림차순" },
        ],
      },
    ],
    defaults: { field: "", direction: "desc" },
  },
  {
    type: "logic.limit",
    label: "상위 N건만 남기기",
    description: "앞에서부터 지정한 건수만 다음 단계로 넘깁니다. AI 단계 앞에서 처리량을 줄일 때 유용합니다.",
    category: "data",
    icon: { glyph: "filter" },
    runtime: "client",
    params: [{ key: "count", label: "남길 건수", kind: "text", required: true, placeholder: "10" }],
    defaults: { count: "10" },
  },
  {
    type: "logic.dedupe",
    label: "중복 제거",
    description: "같은 값이 반복되는 데이터를 하나만 남깁니다. 항목을 비우면 전체가 같은 경우만 제거합니다.",
    category: "data",
    icon: { glyph: "columns" },
    runtime: "client",
    params: [{ key: "field", label: "중복 기준 항목", kind: "text", placeholder: "연락처" }],
    defaults: { field: "" },
  },
  {
    type: "logic.aggregate",
    label: "한 건으로 묶기",
    description: "여러 건을 하나로 합쳐 건수와 선택 항목의 목록을 만듭니다. 요약 메시지를 보내기 전에 쓰세요.",
    category: "data",
    icon: { glyph: "columns" },
    runtime: "client",
    params: [
      { key: "field", label: "목록으로 모을 항목", kind: "text", placeholder: "활동명" },
      { key: "outputName", label: "목록 이름", kind: "text", placeholder: "values" },
    ],
    defaults: { field: "", outputName: "values" },
  },
  {
    type: "logic.set",
    label: "항목 추가·수정",
    description: "모든 데이터에 항목을 더하거나 값을 바꿉니다. 값에는 {{항목명}}을 쓸 수 있습니다.",
    category: "data",
    icon: { glyph: "columns" },
    runtime: "client",
    params: [{ key: "fields", label: "항목 = 값 (한 줄에 하나)", kind: "textarea", required: true, placeholder: "단계 = 1차 검토\n제목 = {{활동명}} 님 지원서" }],
    defaults: { fields: "" },
  },
  {
    type: "media.ffmpeg_cut",
    label: "세로 영상 만들기",
    description: "영상을 세로 화면으로 바꾼 결과가 어떻게 보일지 데모로 확인합니다.",
    category: "data",
    icon: { logo: "/logos/ffmpeg.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "duration", label: "클립 길이 (초)", kind: "text", required: true, placeholder: "30" },
      {
        key: "cropMode",
        label: "크롭 방식",
        kind: "select",
        options: [
          { value: "auto_face", label: "얼굴 인식 중심 9:16 크롭" },
          { value: "letterbox", label: "16:9 레터박스 상하 패딩 유지" },
        ],
      },
      {
        key: "audioNormalize",
        label: "음량 표준화 (-14 LUFS)",
        kind: "select",
        options: [
          { value: "true", label: "음량 노멀라이즈 적용" },
          { value: "false", label: "원본 음량 유지" },
        ],
      },
    ],
    defaults: { duration: "30", cropMode: "auto_face", audioNormalize: "true" },
    presets: [
      { id: "cut_15s", label: "15초 킬링파트 컷팅", badge: "Shorts", description: "얼굴인식 스마트 9:16 크롭 15초 추출", params: { duration: "15", cropMode: "auto_face", audioNormalize: "true" } },
      { id: "cut_30s", label: "30초 안무 하이라이트", badge: "Reels", description: "안무 풀프레임 스마트 30초 컷팅", params: { duration: "30", cropMode: "auto_face", audioNormalize: "true" } },
    ],
  },

  // --- AI ANALYSIS ---
  {
    type: "ai.summary",
    label: "검토 내용 요약",
    description: "지원자 데이터와 평가 내용을 종합하여 강점, 리스크, 액션 플랜을 도출합니다.",
    category: "ai",
    icon: { glyph: "sparkle" },
    runtime: "server",
    params: [{ key: "topic", label: "요약 주제", kind: "text", placeholder: "이번 주 신규 오디션 지원자" }],
    defaults: { topic: "" },
  },
  {
    type: "ai.classify",
    label: "AI로 분류하기",
    description: "각 데이터를 정해 둔 분류 중 하나로 나누고 근거를 남깁니다. 합격·탈락 판정이나 외모 평가는 만들 수 없습니다.",
    category: "ai",
    icon: { glyph: "sparkle" },
    runtime: "server",
    params: [
      { key: "labels", label: "분류 항목 (쉼표로 구분)", kind: "text", required: true, placeholder: "보컬 중심, 댄스 중심, 연기 중심" },
      { key: "instruction", label: "판단 기준", kind: "text", placeholder: "자기소개에서 드러나는 주 특기" },
      { key: "outputName", label: "결과 항목 이름", kind: "text", placeholder: "분류" },
    ],
    defaults: { labels: "", instruction: "", outputName: "분류" },
  },
  {
    type: "ai.extract",
    label: "AI로 정보 뽑기",
    description: "자유롭게 쓴 글에서 이름, 나이, 경력 같은 정보를 항목별로 뽑아냅니다. 없는 정보는 비워 둡니다.",
    category: "ai",
    icon: { glyph: "sparkle" },
    runtime: "server",
    params: [{ key: "fields", label: "뽑을 항목 (쉼표로 구분)", kind: "text", required: true, placeholder: "희망 분야, 경력, 가능한 일정" }],
    defaults: { fields: "" },
  },
  {
    type: "ai.generate",
    label: "AI로 안내문 초안 쓰기",
    description: "각 데이터에 맞는 안내 문구 초안을 만듭니다. 결과는 담당자 검토 후 사용하도록 표시됩니다.",
    category: "ai",
    icon: { glyph: "sparkle" },
    runtime: "server",
    params: [
      { key: "instruction", label: "어떤 글을 쓸까요", kind: "textarea", required: true, placeholder: "2차 오디션 일정 안내를 친절한 존댓말로 3문장" },
      { key: "outputName", label: "결과 항목 이름", kind: "text", placeholder: "초안" },
    ],
    defaults: { instruction: "", outputName: "초안" },
  },
  {
    type: "openai.analyze",
    label: "지원 자료 정리",
    description: "제출 자료에서 검토에 필요한 관찰 항목을 정리하는 데모 단계입니다.",
    category: "ai",
    icon: { logo: "/logos/openai.svg" },
    runtime: "server",
    execution: "demo",
    params: [
      {
        key: "model",
        label: "모델 선택",
        kind: "select",
        options: [
          { value: "gpt-4o", label: "GPT-4o (최고 성능 심층 분석)" },
          { value: "gpt-4o-mini", label: "GPT-4o Mini (초고속 대량 스크리닝)" },
        ],
      },
      {
        key: "evaluationCriteria",
        label: "평가 프롬프트 / 기준",
        kind: "textarea",
        required: true,
        placeholder: "제출 자료에서 음질, 발음, 리듬 등 담당자가 확인할 항목을 정리해줘.",
      },
    ],
    defaults: { model: "gpt-4o", evaluationCriteria: "제출 자료에서 음질, 발음, 리듬 등 담당자가 확인할 항목을 사실 중심으로 정리해줘." },
    presets: [
      { id: "vocal_deep", label: "보컬 자료 확인 항목", badge: "보컬", description: "음색, 음정 변화와 발음을 확인할 수 있도록 정리", params: { model: "gpt-4o", evaluationCriteria: "지원자의 제출 자료에서 음색, 음정 변화, 발음과 녹음 상태를 관찰 가능한 사실 중심으로 정리해줘." } },
      { id: "stage_review", label: "무대 영상 확인 항목", badge: "무대", description: "동선, 시선 처리와 리듬을 확인할 수 있도록 정리", params: { model: "gpt-4o", evaluationCriteria: "무대 영상에서 동선, 시선 처리, 리듬과 촬영 상태를 관찰 가능한 사실 중심으로 정리해줘." } },
    ],
  },
  {
    type: "ai.dance_pose",
    label: "안무 동작 비교",
    description: "기준 안무와 제출 영상을 비교한 결과 화면을 데모로 확인합니다.",
    category: "ai",
    icon: { logo: "/logos/mediapipe.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      {
        key: "referenceChoreo",
        label: "기준 안무 템플릿",
        kind: "select",
        options: [
          { value: "hype_boy", label: "NewJeans — Hype Boy (포인트 안무)" },
          { value: "supernova", label: "aespa — Supernova (정밀 각도)" },
          { value: "butter", label: "BTS — Butter (풋워크 싱크)" },
        ],
      },
      { key: "passThreshold", label: "합격 최소 싱크율 (%)", kind: "text", placeholder: "85" },
    ],
    defaults: { referenceChoreo: "hype_boy", passThreshold: "85" },
    presets: [
      { id: "hype_boy_85", label: "K-POP 포인트 안무 (85점)", badge: "걸그룹", description: "NewJeans Hype Boy 안무 싱크 85% 이상", params: { referenceChoreo: "hype_boy", passThreshold: "85" } },
      { id: "supernova_80", label: "칼군무 각도 일치율 (80점)", badge: "퍼포먼스", description: "aespa Supernova 정밀 각도 80% 이상", params: { referenceChoreo: "supernova", passThreshold: "80" } },
      { id: "butter_70", label: "기초 리듬감/풋워크 (70점)", badge: "예선", description: "BTS Butter 풋워크 싱크 70% 통과선", params: { referenceChoreo: "butter", passThreshold: "70" } },
    ],
  },
  {
    type: "ar.duplicate_audio",
    label: "비슷한 음원 확인",
    description: "데모 음원의 특징을 비교해 중복 접수 가능성을 확인하는 데모 단계입니다.",
    category: "ai",
    icon: { glyph: "sparkle" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "similarityThreshold", label: "유사도 경고 기준 (%)", kind: "text", placeholder: "75" },
      {
        key: "dbScope",
        label: "비교 데이터베이스 범위",
        kind: "select",
        options: [
          { value: "internal", label: "자사 보유 데모 및 퍼블리싱 라이브러리" },
          { value: "global", label: "국내외 스트리밍 전수 DB 대조" },
        ],
      },
    ],
    defaults: { similarityThreshold: "75", dbScope: "internal" },
    presets: [
      { id: "internal_strict", label: "자사 퍼블리싱 DB 중복 검출 (75%)", badge: "사내DB", description: "자사 음원/데모 지문과 75% 이상 일치 시 경고", params: { similarityThreshold: "75", dbScope: "internal" } },
      { id: "global_screen", label: "글로벌 음원 유사도 확인 (85%)", badge: "유사도", description: "국내외 스트리밍 자료와 비교해 유사도가 높은 음원을 표시", params: { similarityThreshold: "85", dbScope: "global" } },
    ],
  },

  // --- HUMAN APPROVAL ---
  {
    type: "human.approval",
    label: "담당자 확인",
    description: "여기서 일시 멈추고, 담당자가 검토 후 승인해야 다음 단계로 진행합니다.",
    category: "human",
    icon: { glyph: "hand" },
    runtime: "client",
    params: [
      { key: "approver", label: "승인 담당자", kind: "text", placeholder: "캐스팅팀 리드" },
      { key: "message", label: "승인 요청 메시지", kind: "textarea", placeholder: "심사 통과 지원자들을 2차 실기 대상자로 확정할까요?" },
    ],
    defaults: { approver: "캐스팅팀 리드", message: "심사 통과 지원자들을 2차 실기 대상자로 확정할까요?" },
    presets: [
      { id: "casting_lead", label: "캐스팅팀 리드 승인", badge: "캐스팅", description: "2차 실기 오디션 대상자 최종 컨펌", params: { approver: "캐스팅팀 리드", message: "심사 통과 지원자들을 2차 실기 대상자로 확정할까요?" } },
      { id: "ar_director", label: "A&R 총괄 담당자 확인", badge: "A&R", description: "데모곡 계약 및 퍼블리싱 이관 전 최종 확인", params: { approver: "A&R 총괄 디렉터", message: "중복 가능성을 확인한 데모곡을 퍼블리싱 부서로 이관할까요?" } },
      { id: "marketing_head", label: "마케팅 본부장 승인", badge: "마케팅", description: "숏폼 클립 공식 채널 일괄 예약 발행 승인", params: { approver: "마케팅 본부장", message: "제작된 숏폼 클립을 공식 채널에 일괄 예약 배포할까요?" } },
    ],
  },

  // --- INTEGRATIONS (GENUINE LOGOS) ---
  {
    type: "kakaotalk.alimtalk",
    label: "카카오톡 안내 준비",
    description: "지원자에게 보낼 안내 내용과 수신 대상을 미리 확인합니다. 실제로 발송하지 않습니다.",
    category: "integration",
    icon: { logo: "/logos/kakaotalk-color.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      {
        key: "templateCode",
        label: "알림톡 템플릿",
        kind: "select",
        options: [
          { value: "AUDITION_PASS", label: "[합격안내] 2차 실기 오디션 안내" },
          { value: "AUDITION_SCHEDULE", label: "[일정확정] 대면 미팅 일시 및 장소" },
          { value: "AUDITION_RESULT", label: "[심사결과] 오디션 종합 심사 결과" },
        ],
      },
      { key: "phoneField", label: "수신자 전화번호 항목", kind: "text", required: true, placeholder: "연락처" },
      { key: "message", label: "메시지 내용", kind: "textarea", required: true, placeholder: "[ENTER—AX] 안녕하세요 {{활동명}}님, 2차 실기 오디션 대상자로 선정되셨습니다." },
    ],
    defaults: { templateCode: "AUDITION_PASS", phoneField: "연락처", message: "[ENTER—AX] 안녕하세요 {{활동명}}님, 2차 실기 오디션 대상자로 선정되셨습니다." },
    presets: [
      { id: "first_pass", label: "1차 서류 합격 통보", badge: "1차합격", description: "1차 서류 합격 알림톡 즉시 발송", params: { templateCode: "AUDITION_PASS", phoneField: "연락처", message: "[ENTER—AX] 안녕하세요 {{활동명}}님, 2026 오디션 1차 서류 심사에 합격하셨습니다." } },
      { id: "audition_schedule", label: "2차 실기 오디션 일정 안내", badge: "일정안내", description: "실기 심사 일시 및 준비곡 안내", params: { templateCode: "AUDITION_SCHEDULE", phoneField: "연락처", message: "[ENTER—AX] {{활동명}}님, 2차 실기 오디션은 10월 15일 14:00 노바 트레이닝 센터에서 진행됩니다." } },
      { id: "final_contract", label: "최종 연습생 계약 안내", badge: "최종합격", description: "최종 합격 및 보호자 동반 계약 미팅", params: { templateCode: "AUDITION_PASS", phoneField: "연락처", message: "[ENTER—AX] 축하합니다! {{활동명}}님은 노바엔터 전속 연습생 최종 심사에 합격하셨습니다." } },
      { id: "fail_notice", label: "심사 결과 정중 안내 (탈락)", badge: "결과안내", description: "정중한 탈락 위로 및 다음 기회 안내", params: { templateCode: "AUDITION_RESULT", phoneField: "연락처", message: "[ENTER—AX] {{활동명}}님, 오디션에 지원해 주셔서 감사합니다. 아쉽게도 이번에는 모시지 못하게 되었습니다." } },
    ],
  },
  {
    type: "gmail.send",
    label: "이메일 안내 준비",
    description: "보낼 사람, 제목과 본문을 미리 확인합니다. 실제로 발송하지 않습니다.",
    category: "integration",
    icon: { logo: "/logos/gmail-color.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "to", label: "받는 사람 (이메일 항목)", kind: "text", required: true, placeholder: "{{id}}@casting.enter-ax.com" },
      { key: "subject", label: "메일 제목", kind: "text", required: true, placeholder: "[ENTER—AX] 2026 하반기 글로벌 오디션 합격 안내" },
      { key: "body", label: "메일 본문", kind: "textarea", required: true, placeholder: "안녕하세요 {{활동명}}님,\n\nENTER-AX 오디션에 지원해 주셔서 감사합니다. 심사 결과 2차 실기 대상자로 선정되셨습니다." },
    ],
    defaults: { to: "{{id}}@casting.enter-ax.com", subject: "[ENTER—AX] 2026 하반기 글로벌 오디션 합격 안내", body: "" },
    presets: [
      { id: "audition_guide", label: "2차 오디션 가이드 & 악보 송부", badge: "가이드", description: "실기 오디션 세부 자료 및 악보 첨부", params: { to: "{{id}}@casting.enter-ax.com", subject: "[노바엔터] {{활동명}}님, 2차 실기 오디션 안내 자료", body: "안녕하세요 {{활동명}}님, 2차 실기 오디션 준비 자료를 송부해 드립니다." } },
      { id: "contract_draft", label: "전속 연습생 계약서 초안 전달", badge: "계약", description: "계약서 초안 및 동의서 송달", params: { to: "{{id}}@casting.enter-ax.com", subject: "[노바엔터] 전속 연습생 계약서 초안 전달", body: "안녕하세요 {{활동명}}님, 노바엔터테인먼트 전속 연습생 계약서 초안을 전달드립니다." } },
    ],
  },
  {
    type: "notion.sync",
    label: "Notion 저장 미리보기",
    description: "Notion에 저장할 지원자 정보를 미리 확인합니다. 실제로 저장하지 않습니다.",
    category: "integration",
    icon: { logo: "/logos/notion-color.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "databaseId", label: "Notion 데이터베이스 ID", kind: "text", required: true, placeholder: "notion.so/enter-ax-talents-db" },
      { key: "tags", label: "기본 태그", kind: "text", placeholder: "2026오디션, 내부검토, 보컬" },
    ],
    defaults: { databaseId: "notion.so/enter-ax-talents-db", tags: "2026오디션, 내부검토" },
    presets: [
      { id: "trainee_pool", label: "신인개발팀 연습생 풀 DB", badge: "연습생", description: "합격자 프로필을 연습생 DB에 자동 동기화", params: { databaseId: "notion.so/enter-ax-trainee-pool", tags: "2026공채, 1차합격" } },
      { id: "ar_cuesheet", label: "A&R 발매곡/큐시트 DB", badge: "A&R", description: "데모 음원 메타데이터를 큐시트 DB에 등록", params: { databaseId: "notion.so/enter-ax-ar-demos", tags: "타이틀후보, 2026컴백" } },
    ],
  },
  {
    type: "sheets.append",
    label: "Google Sheets 기록 미리보기",
    description: "스프레드시트에 추가할 내용을 미리 확인합니다. 실제로 기록하지 않습니다.",
    category: "integration",
    icon: { logo: "/logos/sheets-color.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "spreadsheetId", label: "스프레드시트 ID 또는 URL", kind: "text", required: true, placeholder: "docs.google.com/spreadsheets/d/1A2B3C..." },
      { key: "sheetName", label: "시트 이름", kind: "text", placeholder: "오디션_명단" },
      { key: "columns", label: "기록할 컬럼", kind: "text", placeholder: "활동명, 분야, 지역, 총점, 접수일자" },
    ],
    defaults: { spreadsheetId: "docs.google.com/spreadsheets/d/1A2B3C...", sheetName: "오디션_명단", columns: "활동명, 분야, 지역, 총점" },
    presets: [
      { id: "audition_sheet", label: "2026 오디션 지원자 명단", badge: "지원자명단", description: "활동명, 분야, 지역, 총점 자동 기록", params: { spreadsheetId: "docs.google.com/spreadsheets/d/1Audition2026", sheetName: "지원자_명단", columns: "활동명, 분야, 지역, 총점" } },
      { id: "ar_demo_sheet", label: "A&R 데모곡 수급대장", badge: "A&R대장", description: "곡명, 작곡가, 장르, 음향지문일치율 기록", params: { spreadsheetId: "docs.google.com/spreadsheets/d/1ARDemoTracks", sheetName: "데모_접수", columns: "곡명, 작곡가, 장르, 유사도" } },
    ],
  },
  {
    type: "gdrive.upload",
    label: "Google Drive 보관 미리보기",
    description: "Drive에 보관할 파일과 폴더를 미리 확인합니다. 실제로 업로드하지 않습니다.",
    category: "integration",
    icon: { logo: "/logos/gdrive-color.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "folderId", label: "드라이브 폴더 ID", kind: "text", required: true, placeholder: "1Folder_EnterAX_Audition_Files" },
      { key: "fileNaming", label: "저장 파일명 규칙", kind: "text", placeholder: "{{분야}}_{{활동명}}_지원영상.mp4" },
    ],
    defaults: { folderId: "1Folder_EnterAX_Audition_Files", fileNaming: "{{분야}}_{{활동명}}_지원영상.mp4" },
    presets: [
      { id: "video_vault", label: "오디션 영상 아카이브 폴더", badge: "영상보관", description: "지원자별 오디션 고화질 영상 자동 백업", params: { folderId: "1Drive_Audition_Videos_2026", fileNaming: "{{분야}}_{{활동명}}_지원영상.mp4" } },
    ],
  },
  {
    type: "slack.message",
    label: "Slack 채널 알림",
    description: "Slack Incoming Webhook으로 캐스팅/A&R 채널에 실시간 알림을 보냅니다.",
    category: "integration",
    icon: { logo: "/logos/slack-color.svg" },
    runtime: "server",
    params: [
      { key: "webhookUrl", label: "Webhook URL", kind: "url", required: true, placeholder: "https://hooks.slack.com/services/…", help: "Slack 앱 설정의 Incoming Webhooks에서 발급합니다." },
      { key: "text", label: "메시지", kind: "textarea", required: true, placeholder: "신규 지원자 {{count}}명이 검토 단계에 올라왔습니다." },
    ],
    defaults: { webhookUrl: "", text: "신규 지원자 {{count}}명이 검토 단계에 올라왔습니다." },
    presets: [
      { id: "pass_alert", label: "캐스팅팀 합격자 실시간 알림", badge: "캐스팅", description: "신규 합격자 발생 시 전사 채널 즉시 노티", params: { webhookUrl: "https://hooks.slack.com/services/ENTER_AX/CASTING", text: "🎉 [오디션 합격] {{활동명}} ({{분야}}) 님이 심사를 통과했습니다! 2차 실기 준비 요망." } },
    ],
  },
  {
    type: "youtube.upload",
    label: "YouTube 게시 준비",
    description: "게시할 제목과 공개 범위를 미리 확인합니다. 실제로 업로드하지 않습니다.",
    category: "integration",
    icon: { logo: "/logos/youtube.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "title", label: "Shorts 제목", kind: "text", required: true, placeholder: "#Shorts {{활동명}} 놀라운 라이브 클립!" },
      {
        key: "privacy",
        label: "공개 설정",
        kind: "select",
        options: [
          { value: "public", label: "전체 공개" },
          { value: "unlisted", label: "일부 공개 (링크 보유자)" },
          { value: "private", label: "비공개 (내부 검토용)" },
        ],
      },
      { key: "tags", label: "태그", kind: "text", placeholder: "#KPOP #AUDITION #VOCAL #ENTERAX" },
    ],
    defaults: { title: "#Shorts {{활동명}} 라이브 클립!", privacy: "unlisted", tags: "#KPOP #AUDITION #ENTERAX" },
    presets: [
      { id: "shorts_public", label: "공식 유튜브 쇼츠 즉시 공개", badge: "쇼츠공개", description: "공식 유튜브 채널에 즉시 공개 배포", params: { title: "[ENTER—AX] 오디션 하이라이트 {{활동명}} #Shorts #KPOP", privacy: "public", tags: "#KPOP #AUDITION #Shorts #ENTERAX" } },
      { id: "shorts_review", label: "내부 검토용 비공개 업로드", badge: "사내검토", description: "링크 보유자 전용 일부 공개", params: { title: "[내부검토] {{활동명}} 오디션 클립", privacy: "unlisted", tags: "#ENTERAX #INTERNAL" } },
    ],
  },
  {
    type: "instagram.post",
    label: "Instagram 게시 준비",
    description: "게시할 영상과 문구를 미리 확인합니다. 실제로 게시하지 않습니다.",
    category: "integration",
    icon: { logo: "/logos/instagram.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "caption", label: "릴스 캡션", kind: "textarea", required: true, placeholder: "ENTER—AX 신인 발굴 오디션 화제의 참가자 ✨\n#reels #audition" },
      {
        key: "shareToFeed",
        label: "프로필 피드에도 공유",
        kind: "select",
        options: [
          { value: "true", label: "피드에도 표시" },
          { value: "false", label: "릴스 탭에만 표시" },
        ],
      },
    ],
    defaults: { caption: "ENTER—AX 신인 발굴 오디션 ✨\n#reels #audition", shareToFeed: "true" },
    presets: [
      { id: "reels_feed", label: "공식 인스타그램 릴스 & 피드 동시 발행", badge: "릴스", description: "인스타 피드 및 릴스 탭 동시 노출", params: { caption: "차세대 글로벌 K-POP 스타를 찾아라! 🌟 {{활동명}} 참가자의 현장 영상\n#ENTERAX #오디션 #연습생 #릴스", shareToFeed: "true" } },
    ],
  },
  {
    type: "tiktok.upload",
    label: "TikTok 게시 준비",
    description: "게시할 영상과 문구를 미리 확인합니다. 실제로 게시하지 않습니다.",
    category: "integration",
    icon: { logo: "/logos/tiktok.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "title", label: "영상 캡션", kind: "text", required: true, placeholder: "🔥 2026 오디션 참가자 댄스 클립! #DanceChallenge" },
      { key: "soundTitle", label: "사용 음원 명칭", kind: "text", placeholder: "Enter-AX Official Beat Vol.1" },
    ],
    defaults: { title: "🔥 2026 오디션 참가자 클립! #DanceChallenge", soundTitle: "Enter-AX Official Beat Vol.1" },
    presets: [
      { id: "tiktok_challenge", label: "틱톡 오디션 챌린지 공식 배포", badge: "틱톡", description: "챌린지 해시태그 및 공식 음원 적용", params: { title: "2026 글로벌 오디션 현장 직캠 🔥 #KpopAudition #EnterAX", soundTitle: "Enter-AX Official Beat Vol.1" } },
    ],
  },
  {
    type: "calendar.schedule",
    label: "Google Calendar 일정 준비",
    description: "등록할 일정 제목, 장소와 시간을 미리 확인합니다. 실제로 등록하지 않습니다.",
    category: "integration",
    icon: { logo: "/logos/googlecalendar.svg" },
    runtime: "client",
    execution: "demo",
    params: [
      { key: "eventTitle", label: "일정 제목", kind: "text", required: true, placeholder: "[2차 오디션] {{활동명}} 실기 심사" },
      { key: "location", label: "장소", kind: "text", placeholder: "본사 지하 1층 안무/보컬 트레이닝실 A" },
      { key: "durationMin", label: "소요 시간 (분)", kind: "text", placeholder: "45" },
    ],
    defaults: { eventTitle: "[2차 오디션] {{활동명}} 실기 심사", location: "본사 지하 1층 안무/보컬 트레이닝실 A", durationMin: "45" },
    presets: [
      { id: "audition_interview", label: "2차 실기 오디션 개별 심사 미팅", badge: "오디션", description: "30분 개별 실기 심사 일정 등록", params: { eventTitle: "[오디션 2차] {{활동명}} 님 대면 실기 심사", location: "노바 트레이닝 센터 3호실", durationMin: "30" } },
      { id: "ar_contract", label: "A&R 퍼블리싱 계약 미팅", badge: "A&R", description: "60분 음원 계약 협의 미팅 등록", params: { eventTitle: "[A&R 미팅] 데모곡 음원 퍼블리싱 검토", location: "본사 5층 회의실 B", durationMin: "60" } },
    ],
  },
];

const catalogByType = new Map(nodeCatalog.map((definition) => [definition.type, definition]));

// --- CUSTOM NODES PERSISTENCE & MANAGEMENT ---
const CUSTOM_NODES_KEY = "enter-ax.custom-nodes.v1";

let memoryCustomNodes: NodeDefinition[] = [];

export function getCustomNodes(): NodeDefinition[] {
  if (typeof window === "undefined") return memoryCustomNodes;
  try {
    const raw = window.localStorage.getItem(CUSTOM_NODES_KEY);
    if (!raw) return memoryCustomNodes;
    const parsed = JSON.parse(raw) as NodeDefinition[];
    if (Array.isArray(parsed)) {
      memoryCustomNodes = parsed;
      return parsed;
    }
  } catch {
    // fallback to memory
  }
  return memoryCustomNodes;
}

export function saveCustomNode(definition: NodeDefinition): void {
  const current = getCustomNodes();
  const exists = current.some((item) => item.type === definition.type);
  const updated = exists ? current.map((item) => (item.type === definition.type ? definition : item)) : [...current, definition];
  memoryCustomNodes = updated;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CUSTOM_NODES_KEY, JSON.stringify(updated));
    } catch {
      // quota or private mode
    }
  }
}

export function deleteCustomNode(type: string): void {
  const current = getCustomNodes();
  const updated = current.filter((item) => item.type !== type);
  memoryCustomNodes = updated;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CUSTOM_NODES_KEY, JSON.stringify(updated));
    } catch {
      // quota or private mode
    }
  }
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  const custom = getCustomNodes();
  return [...nodeCatalog.filter((node) => !node.hiddenFromPalette), ...custom].map(withExecutionMode);
}

function withExecutionMode(definition: NodeDefinition): NodeDefinition {
  return { ...definition, execution: definition.execution ?? (definition.isCustom ? "demo" : "live") };
}

export function getNodeDefinition(type: WorkflowNodeType): NodeDefinition {
  // Check memory / local custom nodes first
  const custom = getCustomNodes().find((node) => node.type === type);
  if (custom) return withExecutionMode(custom);

  const definition = catalogByType.get(type);
  if (!definition) {
    // If it's a dynamic custom node that wasn't loaded yet or formatted as custom.*
    if (type.startsWith("custom.")) {
      return withExecutionMode({
        type,
        label: "맞춤 단계",
        description: "직접 만든 맞춤 단계입니다.",
        category: "custom",
        icon: { glyph: "sparkle" },
        runtime: "client",
        params: [],
        defaults: {},
        isCustom: true,
      });
    }
    throw new Error(`Unknown node type: ${type}`);
  }
  return withExecutionMode(definition);
}

/** Required parameters the user still has to fill in before the node can run. */
export function missingParams(type: WorkflowNodeType, params: Record<string, string>): string[] {
  return getNodeDefinition(type)
    .params.filter((field) => field.required && !(params[field.key] ?? "").trim())
    .map((field) => field.label);
}
