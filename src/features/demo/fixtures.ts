import type {
  AgentJob,
  Candidate,
  CommunityPost,
  DemoState,
  TalentField,
  TalentProfile,
} from "@/types/domain";

const BASE_TIME = "2026-09-16T09:00:00.000Z";

const talentBlueprints: Array<{
  id: string;
  stageName: string;
  birthDate: string;
  region: string;
  fields: TalentField[];
  bio: string;
  vocalSource: "file" | "youtube";
  danceSource: "file" | "youtube";
  visibility: "verified-agencies" | "public";
}> = [
  { id: "talent-lua", stageName: "루아", birthDate: "2004-03-14", region: "서울", fields: ["idol", "vocal"], bio: "서사를 목소리와 움직임으로 전하는 올라운더입니다.", vocalSource: "file", danceSource: "youtube", visibility: "verified-agencies" },
  { id: "talent-min", stageName: "민", birthDate: "2001-08-21", region: "부산", fields: ["dance", "idol"], bio: "선명한 리듬과 팀워크를 중시하는 퍼포머입니다.", vocalSource: "youtube", danceSource: "file", visibility: "public" },
  { id: "talent-hae", stageName: "해온", birthDate: "1998-11-02", region: "서울", fields: ["actor"], bio: "작은 감정의 변화까지 화면에 남기는 배우입니다.", vocalSource: "file", danceSource: "youtube", visibility: "verified-agencies" },
  { id: "talent-sol", stageName: "솔", birthDate: "2003-06-18", region: "인천", fields: ["vocal"], bio: "낮은 음역의 질감과 안정적인 라이브가 강점입니다.", vocalSource: "file", danceSource: "file", visibility: "verified-agencies" },
  { id: "talent-ian", stageName: "이안", birthDate: "2000-01-27", region: "대전", fields: ["model", "actor"], bio: "룩의 의도를 빠르게 해석하는 모델이자 배우입니다.", vocalSource: "youtube", danceSource: "youtube", visibility: "public" },
  { id: "talent-yun", stageName: "윤슬", birthDate: "2005-09-09", region: "광주", fields: ["dance"], bio: "장르의 경계를 넘나드는 즉흥성과 집중력이 강점입니다.", vocalSource: "youtube", danceSource: "file", visibility: "verified-agencies" },
];

const talentPhotos = [
  "/images/demo/profile-headshot.jpg",
  "/images/demo/dance-stage.jpg",
  "/images/demo/vocal-studio.jpg",
  "/images/demo/profile-headshot.jpg",
  "/images/demo/dance-stage.jpg",
  "/images/demo/vocal-studio.jpg",
];

const talents: TalentProfile[] = talentBlueprints.map((talent, index) => {
  const photo = talentPhotos[index % talentPhotos.length];
  const front = photo;
  const left = talentPhotos[(index + 1) % talentPhotos.length];
  const right = talentPhotos[(index + 2) % talentPhotos.length];
  const vocal = talent.vocalSource === "file" ? `/demo/${talent.id}-vocal.mp4` : "https://youtu.be/dQw4w9WgXcQ";
  const dance = talent.danceSource === "file" ? `/demo/${talent.id}-dance.mp4` : "https://youtu.be/aqz-KE-bpKQ";

  return {
    ...talent,
    gender: index % 2 === 0 ? "woman" : "man",
    nationality: "대한민국",
    socialUrl: "",
    isMinor: false,
    guardianConsent: false,
    openToOffers: true,
    marketingConsent: false,
    photos: { front, left, right },
    vocal: { source: talent.vocalSource, value: vocal },
    dance: { source: talent.danceSource, value: dance },
    ageBand: index === 5 ? "teen" : "20s",
    media: [
      { kind: "photo-front", source: "demo", value: front, analysisEligible: false },
      { kind: "photo-left", source: "demo", value: left, analysisEligible: false },
      { kind: "photo-right", source: "demo", value: right, analysisEligible: false },
      { kind: "vocal", source: talent.vocalSource, value: vocal, analysisEligible: talent.vocalSource === "file" },
      { kind: "dance", source: talent.danceSource, value: dance, analysisEligible: talent.danceSource === "file" },
    ],
    createdAt: `2026-09-${String(10 + index).padStart(2, "0")}T09:00:00.000Z`,
    updatedAt: BASE_TIME,
    recentActivityAt: `2026-09-${String(16 - index).padStart(2, "0")}T09:00:00.000Z`,
  };
});

const candidateStages: Candidate["stage"][] = [
  "discovered",
  "saved",
  "internal-review",
  "offer-sent",
  "accepted",
  "follow-up",
  "final-review",
  "completed",
  "on-hold",
];

const candidates: Candidate[] = candidateStages.map((stage, index) => ({
  id: `candidate-${index + 1}`,
  talentId: talents[index % talents.length].id,
  stage,
  owner: ["지우", "태민", "서윤"][index % 3],
  nextAction: stage === "completed" ? "기록 보관" : "팀 검토 업데이트",
  teamNote: "데모 팀 메모입니다.",
  updatedAt: BASE_TIME,
  activity: [
    { id: `activity-${index + 1}`, label: `${stage} 단계로 이동`, createdAt: BASE_TIME },
  ],
}));

const agentStatuses: AgentJob["status"][] = [
  "queued",
  "running",
  "approval-required",
  "completed",
  "failed",
  "manual",
];

const agentJobs: AgentJob[] = agentStatuses.map((status, index) => ({
  id: `agent-job-${index + 1}`,
  tenantId: "agency-nova",
  skill: (["audition-triage", "daily-briefing", "content-prep"] as const)[index % 3],
  status,
  tools: ["workspace.read.demo", "policy.check.demo"],
  currentStep: status === "failed" ? "데모 도구 응답 확인" : "데모 작업 단계 확인",
  result: status === "completed" ? "데모 결과가 준비되었습니다." : "API 연동 예정",
  requiresApproval: status === "approval-required",
  createdAt: BASE_TIME,
  updatedAt: BASE_TIME,
}));

const communityPosts: CommunityPost[] = [
  {
    id: "post-1",
    authorName: "루아",
    category: "합격후기",
    title: "노바 엔터 1차 서류 통과했어요!",
    body: "정면/좌/우 사진이랑 보컬 파일 올리고 3일 만에 연락 왔습니다. 다들 프로필 소개글 너무 짧게 쓰지 마세요 ㅠㅠ 저는 연습 기간이랑 좋아하는 장르까지 자세히 썼더니 담당자님이 그 부분 보고 연락 주셨다고 하더라고요.",
    createdAt: "2026-09-15T10:20:00.000Z",
    replies: [
      { id: "reply-1-1", authorName: "민", body: "우와 축하드려요!! 저도 다음 주에 지원해보려구요", createdAt: "2026-09-15T11:02:00.000Z" },
      { id: "reply-1-2", authorName: "윤슬", body: "혹시 보컬은 파일로 올리신거예요 유튜브로 올리신거예요?", createdAt: "2026-09-15T13:40:00.000Z" },
    ],
  },
  {
    id: "post-2",
    authorName: "이안",
    category: "질문",
    title: "댄스 영상 유튜브 링크로 올려도 감점 없나요?",
    body: "원본 파일이 용량이 너무 커서 유튜브 비공개로 올리고 링크만 공유하려는데, 파일로 올리는 것보다 불리할까요? 경험 있으신 분 계신가요.",
    createdAt: "2026-09-14T18:05:00.000Z",
    replies: [
      { id: "reply-2-1", authorName: "해온", body: "저는 유튜브로 했는데 딱히 불이익은 못 느꼈어요! 대신 화질만 신경쓰시면 될 듯", createdAt: "2026-09-14T19:12:00.000Z" },
    ],
  },
  {
    id: "post-3",
    authorName: "솔",
    category: "자유",
    title: "오늘 촬영한 정면 사진 다들 몇 번 만에 마음에 드셨나요",
    body: "저는 30번 넘게 찍고 겨우 하나 건졌어요... 다들 프로필 사진 어떻게 찍으시나요 팁 있으면 나눠주세요.",
    createdAt: "2026-09-14T09:30:00.000Z",
    replies: [],
  },
  {
    id: "post-4",
    authorName: "관리자",
    category: "정보공유",
    title: "9월 넷째 주 오픈 캐스팅 일정 안내",
    body: "이번 주 노바 엔터테인먼트, 오빗 크리에이티브에서 보컬/댄스 포지션 오디션 접수 중입니다. 프로필 등록 후 지원 가능해요.",
    createdAt: "2026-09-16T08:00:00.000Z",
    replies: [],
  },
  {
    id: "post-5",
    authorName: "윤슬",
    category: "자유",
    title: "연습실 구하기 진짜 힘드네요 다들 어디서 연습하세요",
    body: "월 단위로 빌릴 수 있는 곳 찾는데 서울은 너무 비싸요. 실용음악학원 야간 대관 쓰시는 분 계신가요.",
    createdAt: "2026-09-16T14:10:00.000Z",
    replies: [],
  },
  {
    id: "post-6",
    authorName: "민",
    category: "자유",
    title: "오늘 자정까지 밤새 연습하고 왔습니다 다들 화이팅",
    body: "내일 촬영이라 긴장되네요. 이 시간에 깨어있는 분 또 없나요 ㅋㅋ",
    createdAt: "2026-09-17T02:30:00.000Z",
    replies: [
      { id: "reply-6-1", authorName: "이안", body: "저요 저 여기 있습니다 화이팅하세요!", createdAt: "2026-09-17T02:41:00.000Z" },
    ],
  },
  {
    id: "post-7",
    authorName: "해온",
    category: "질문",
    title: "지원 분야 복수 선택하면 오히려 불리할까요?",
    body: "배우랑 모델 둘 다 체크하려는데, 한 분야만 집중하는 게 더 좋게 보일지 궁금합니다.",
    createdAt: "2026-09-16T20:15:00.000Z",
    replies: [
      { id: "reply-7-1", authorName: "솔", body: "저는 두 개 체크했는데 상관 없었어요! 오히려 다재다능하다고 좋게 봐주시더라구요", createdAt: "2026-09-16T21:00:00.000Z" },
      { id: "reply-7-2", authorName: "루아", body: "분야보다 자기소개를 얼마나 구체적으로 쓰냐가 더 중요한 것 같아요", createdAt: "2026-09-16T22:12:00.000Z" },
    ],
  },
  {
    id: "post-8",
    authorName: "이안",
    category: "질문",
    title: "미성년자인데 법정대리인 동의는 어떻게 진행되나요?",
    body: "만 17세인데 온보딩 4단계에서 막혀서요. 부모님 서명 같은 걸 따로 올려야 하는지 궁금합니다.",
    createdAt: "2026-09-17T09:00:00.000Z",
    replies: [],
  },
  {
    id: "post-9",
    authorName: "솔",
    category: "합격후기",
    title: "오빗 크리에이티브 캐스팅팀에서 미팅 제안 받았어요",
    body: "온라인 미팅 제안 들어왔는데 너무 떨리네요. 미팅 준비 어떻게 하면 좋을지 조언 부탁드려요.",
    createdAt: "2026-09-13T16:40:00.000Z",
    replies: [
      { id: "reply-9-1", authorName: "민", body: "축하드려요! 저는 최근 활동 영상 하나 더 준비해서 보여드렸어요", createdAt: "2026-09-13T17:05:00.000Z" },
    ],
  },
  {
    id: "post-10",
    authorName: "관리자",
    category: "정보공유",
    title: "스테이지랩 A&R팀 인증 심사 진행 중 안내",
    body: "스테이지랩은 현재 사업자 인증 심사 중입니다. 인증 완료 전까지는 프로필이 제한적으로만 노출됩니다.",
    createdAt: "2026-09-12T07:00:00.000Z",
    replies: [],
  },
];

export const demoState: DemoState = {
  version: 1,
  activeRole: "public",
  activeAgencyId: "agency-nova",
  talents,
  agencies: [
    { id: "agency-nova", name: "노바 엔터테인먼트", department: "신인개발팀", verification: "verified" },
    { id: "agency-orbit", name: "오빗 크리에이티브", department: "캐스팅팀", verification: "verified" },
    { id: "agency-pending", name: "스테이지랩", department: "A&R팀", verification: "pending" },
    { id: "agency-ninetwo", name: "나인투엔터테인먼트 (9to)", department: "신인캐스팅팀", verification: "verified" },
    { id: "agency-hihat", name: "하이헷엔터테인먼트", department: "퍼포먼스/A&R팀", verification: "verified" },
    { id: "agency-fcenm", name: "에프씨이엔엠 (FC ENM)", department: "신인개발팀", verification: "verified" },
    { id: "agency-kment", name: "케이엠이엔티 (KM ENT)", department: "신인캐스팅팀", verification: "verified" },
  ],
  offers: [
    {
      id: "offer-1",
      agencyId: "agency-nova",
      talentId: "talent-lua",
      title: "비공개 추가 오디션",
      purpose: "보컬·퍼포먼스 확인",
      field: "idol",
      dueAt: "2026-09-28T09:00:00.000Z",
      department: "신인개발팀",
      message: "추가 오디션 참여를 제안드립니다.",
      status: "declined",
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    },
    {
      id: "offer-2",
      agencyId: "agency-orbit",
      talentId: "talent-min",
      title: "퍼포먼스 미팅 제안",
      purpose: "프로젝트 적합성 확인",
      field: "dance",
      dueAt: "2026-10-02T09:00:00.000Z",
      department: "캐스팅팀",
      message: "온라인 미팅을 제안드립니다.",
      status: "sent",
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    },
  ],
  candidates,
  favoriteTalentIds: ["talent-min"],
  agentJobs,
  contentJobs: [
    {
      id: "content-job-1",
      title: "신인 공개 숏폼",
      purpose: "신인 소개",
      channels: ["shorts", "reels"],
      duration: 30,
      tone: "팬 친화적",
      captionStyle: "리듬 강조",
      aspectRatio: "9:16",
      step: "review",
      clipCandidates: [1, 2, 3].map((number) => ({
        id: `clip-${number}`,
        title: `추천 구간 ${number}`,
        label: "데모 생성물" as const,
      })),
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    },
  ],
  profileViews: [
    { id: "view-1", talentId: "talent-lua", agencyId: "agency-nova", viewedAt: BASE_TIME },
    { id: "view-2", talentId: "talent-lua", agencyId: "agency-orbit", viewedAt: "2026-09-15T04:00:00.000Z" },
  ],
  communityPosts,
};

export function createDemoState(): DemoState {
  return structuredClone(demoState);
}
