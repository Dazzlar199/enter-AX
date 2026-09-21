import type { DemoState } from "@/types/domain";
import type {
  AgencyOverviewModel,
  OverviewActivity,
  WorkflowNode,
  WorkflowNodeState,
} from "./types";

const nodes: WorkflowNode[] = [
  { id: "auditions", column: "inputs", kind: "input", state: "active", label: "오디션 접수", detail: "지원자 프로필과 미디어", href: "/agency/discover" },
  { id: "demo-audio", column: "inputs", kind: "input", state: "active", label: "데모 음원", detail: "A&R 검토 소스", href: "/agency/ax" },
  { id: "source-video", column: "inputs", kind: "input", state: "active", label: "원본 영상", detail: "숏폼 제작 소스", href: "/agency/content" },
  { id: "screening", column: "services", kind: "process", state: "active", label: "Talent Intelligence", detail: "검토 자료 정리", href: "/agency/discover" },
  { id: "approval", column: "services", kind: "approval", state: "waiting", label: "담당자 승인", detail: "사람이 최종 판단" },
  { id: "content", column: "services", kind: "process", state: "active", label: "Content Automation", detail: "포맷과 배포안 준비", href: "/agency/content" },
  { id: "pipeline", column: "outputs", kind: "output", state: "active", label: "Casting Pipeline", detail: "후보 단계 관리", href: "/agency/pipeline" },
  { id: "review-brief", column: "outputs", kind: "output", state: "complete", label: "A&R Review Brief", detail: "검토용 요약", href: "/agency/ax" },
  { id: "channels", column: "outputs", kind: "output", state: "planned", label: "채널별 예약", detail: "연동 예정" },
];

const connections = [
  { from: "auditions", to: "screening" },
  { from: "screening", to: "approval" },
  { from: "approval", to: "pipeline" },
  { from: "demo-audio", to: "approval" },
  { from: "approval", to: "review-brief" },
  { from: "source-video", to: "content" },
  { from: "content", to: "approval" },
  { from: "approval", to: "channels" },
];

const skillLabels: Record<DemoState["agentJobs"][number]["skill"], string> = {
  "audition-triage": "오디션 자료 정리",
  "daily-briefing": "일일 브리핑",
  "content-prep": "콘텐츠 준비",
};

function getActivityState(status: DemoState["agentJobs"][number]["status"]): WorkflowNodeState {
  switch (status) {
    case "running":
      return "active";
    case "completed":
      return "complete";
    case "approval-required":
    case "queued":
    case "manual":
    case "rejected":
    case "failed":
      return "waiting";
  }
}

function createRecentRuns(state: DemoState): OverviewActivity[] {
  return state.agentJobs.map((job) => ({
    id: job.id,
    label: skillLabels[job.skill],
    meta: job.result,
    state: getActivityState(job.status),
  }));
}

function createReviewQueue(state: DemoState): OverviewActivity[] {
  const agentReviews = state.agentJobs
    .filter((job) => job.status === "approval-required")
    .map((job) => ({
      id: job.id,
      label: skillLabels[job.skill],
      meta: job.currentStep,
      state: "waiting" as const,
    }));

  const contentReviews = state.contentJobs
    .filter((job) => job.step === "review" || job.step === "approval")
    .map((job) => ({
      id: job.id,
      label: job.title,
      meta: job.step === "approval" ? "사람 승인 필요" : "검토 준비",
      state: "waiting" as const,
    }));

  return [...agentReviews, ...contentReviews];
}

export function createAgencyOverviewModel(state: DemoState): AgencyOverviewModel {
  const approvalCount = state.agentJobs.filter((job) => job.status === "approval-required").length;

  return {
    nodes: [...nodes],
    connections: [...connections],
    metrics: [
      { id: "candidates", label: "후보자", value: state.candidates.length, href: "/agency/pipeline" },
      { id: "approvals", label: "승인 대기", value: approvalCount, href: "/agency/ax" },
      { id: "content", label: "콘텐츠 작업", value: state.contentJobs.length, href: "/agency/content" },
      { id: "integrations", label: "채널 연동", value: "연동 예정", href: "/agency/content" },
    ],
    recentRuns: createRecentRuns(state),
    reviewQueue: createReviewQueue(state),
  };
}
