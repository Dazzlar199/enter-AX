import type {
  ActiveRole,
  AgentJob,
  AgentJobStatus,
  Candidate,
  CommunityPost,
  CommunityReply,
  ContentAction,
  ContentJob,
  DemoState,
  Offer,
  OfferStatus,
  PipelineStage,
  TalentDraft,
} from "@/types/domain";

import { createDemoState } from "./fixtures";

const ACTION_TIME = "2026-09-16T09:00:00.000Z";

type OfferInput = Omit<Offer, "id" | "agencyId" | "status" | "createdAt" | "updatedAt">;

export type DemoAction =
  | { type: "demo/reset" }
  | { type: "demo/hydrated"; payload: { state: DemoState } }
  | { type: "role/changed"; payload: { role: ActiveRole } }
  | { type: "talent/saved"; payload: { id: string; draft: TalentDraft } }
  | {
      type: "talent/preferences-updated";
      payload: {
        talentId: string;
        preferences: Pick<TalentDraft, "visibility" | "openToOffers" | "marketingConsent">;
      };
    }
  | { type: "favorite/toggled"; payload: { talentId: string } }
  | { type: "candidate/review-added"; payload: { candidateId: string; talentId: string } }
  | { type: "offer/created"; payload: OfferInput }
  | { type: "offer/responded"; payload: { offerId: string; status: Exclude<OfferStatus, "sent"> } }
  | { type: "candidate/moved"; payload: { candidateId: string; stage: PipelineStage } }
  | { type: "agent/created"; payload: AgentJob }
  | { type: "agent/transitioned"; payload: { jobId: string; status: AgentJobStatus } }
  | { type: "content/created"; payload: ContentJob }
  | {
      type: "content/transitioned";
      payload: { jobId: string; action: ContentAction; nextStep: ContentJob["step"]; rejectionReason?: string };
    }
  | { type: "community/post-created"; payload: { post: CommunityPost } }
  | { type: "community/reply-created"; payload: { postId: string; reply: CommunityReply } };

function appendActivity(candidate: Candidate, label: string): Candidate {
  return {
    ...candidate,
    updatedAt: ACTION_TIME,
    activity: [
      ...candidate.activity,
      { id: `activity-${candidate.activity.length + 1}`, label, createdAt: ACTION_TIME },
    ],
  };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "demo/reset":
      return createDemoState();
    case "demo/hydrated":
      return action.payload.state;
    case "role/changed":
      return { ...state, activeRole: action.payload.role };
    case "talent/saved": {
      const profile = {
        ...action.payload.draft,
        id: action.payload.id,
        ageBand: "20s" as const,
        media: [],
        createdAt: ACTION_TIME,
        updatedAt: ACTION_TIME,
        recentActivityAt: ACTION_TIME,
      };
      return { ...state, talents: [...state.talents, profile] };
    }
    case "talent/preferences-updated":
      return {
        ...state,
        talents: state.talents.map((talent) =>
          talent.id === action.payload.talentId
            ? { ...talent, ...action.payload.preferences, updatedAt: ACTION_TIME }
            : talent,
        ),
      };
    case "favorite/toggled": {
      const exists = state.favoriteTalentIds.includes(action.payload.talentId);
      return {
        ...state,
        favoriteTalentIds: exists
          ? state.favoriteTalentIds.filter((id) => id !== action.payload.talentId)
          : [...state.favoriteTalentIds, action.payload.talentId],
      };
    }
    case "candidate/review-added":
      return state.candidates.some((item) => item.talentId === action.payload.talentId)
        ? state
        : {
            ...state,
            candidates: [
              ...state.candidates,
              {
                id: action.payload.candidateId,
                talentId: action.payload.talentId,
                stage: "internal-review",
                owner: "미배정",
                nextAction: "담당자 지정",
                teamNote: "",
                updatedAt: ACTION_TIME,
                activity: [{ id: "activity-1", label: "내부 검토로 이동", createdAt: ACTION_TIME }],
              },
            ],
          };
    case "offer/created": {
      const duplicate = state.offers.some(
        (offer) =>
          offer.talentId === action.payload.talentId &&
          (offer.status === "sent" || offer.status === "needs-info"),
      );
      if (duplicate) return state;

      const offer: Offer = {
        ...action.payload,
        id: `offer-${state.offers.length + 1}`,
        agencyId: state.activeAgencyId,
        status: "sent",
        createdAt: ACTION_TIME,
        updatedAt: ACTION_TIME,
      };
      const existingCandidate = state.candidates.find(
        (candidate) => candidate.talentId === action.payload.talentId,
      );
      const candidates = existingCandidate
        ? state.candidates.map((candidate) =>
            candidate.id === existingCandidate.id
              ? { ...appendActivity(candidate, "오디션 제안 발송"), stage: "offer-sent" as const }
              : candidate,
          )
        : [
            ...state.candidates,
            {
              id: `candidate-${state.candidates.length + 1}`,
              talentId: action.payload.talentId,
              stage: "offer-sent" as const,
              owner: "미배정",
              nextAction: "지원자 응답 확인",
              teamNote: "",
              updatedAt: ACTION_TIME,
              activity: [{ id: "activity-1", label: "오디션 제안 발송", createdAt: ACTION_TIME }],
            },
          ];
      return { ...state, offers: [...state.offers, offer], candidates };
    }
    case "offer/responded": {
      const target = state.offers.find((offer) => offer.id === action.payload.offerId);
      if (!target) return state;
      const offers = state.offers.map((offer) =>
        offer.id === target.id
          ? { ...offer, status: action.payload.status, updatedAt: ACTION_TIME }
          : offer,
      );
      const candidates =
        action.payload.status === "accepted"
          ? state.candidates.map((candidate) =>
              candidate.talentId === target.talentId
                ? { ...appendActivity(candidate, "지원자가 제안을 수락"), stage: "accepted" as const }
                : candidate,
            )
          : state.candidates;
      return { ...state, offers, candidates };
    }
    case "candidate/moved":
      return {
        ...state,
        candidates: state.candidates.map((candidate) =>
          candidate.id === action.payload.candidateId
            ? { ...appendActivity(candidate, `${action.payload.stage} 단계로 이동`), stage: action.payload.stage }
            : candidate,
        ),
      };
    case "agent/created":
      return { ...state, agentJobs: [...state.agentJobs, action.payload] };
    case "agent/transitioned":
      return {
        ...state,
        agentJobs: state.agentJobs.map((job) =>
          job.id === action.payload.jobId
            ? { ...job, status: action.payload.status, updatedAt: ACTION_TIME }
            : job,
        ),
      };
    case "content/created":
      return { ...state, contentJobs: [...state.contentJobs, action.payload] };
    case "content/transitioned":
      return {
        ...state,
        contentJobs: state.contentJobs.map((job) =>
          job.id === action.payload.jobId
            ? {
                ...job,
                step: action.payload.nextStep,
                rejectionReason: action.payload.rejectionReason,
                updatedAt: ACTION_TIME,
              }
            : job,
        ),
      };
    case "community/post-created":
      return { ...state, communityPosts: [action.payload.post, ...state.communityPosts] };
    case "community/reply-created":
      return {
        ...state,
        communityPosts: state.communityPosts.map((post) =>
          post.id === action.payload.postId
            ? { ...post, replies: [...post.replies, action.payload.reply] }
            : post,
        ),
      };
  }
}
