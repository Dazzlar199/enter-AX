import type { Dispatch } from "react";

import type {
  AgentJob,
  AgentJobStatus,
  CommunityCategory,
  ContentAction,
  ContentJob,
  ContentStep,
  DemoState,
  Offer,
  OfferStatus,
  PipelineStage,
  TalentDraft,
} from "@/types/domain";

import type { DemoAction } from "./reducer";

export type OfferInput = Omit<Offer, "id" | "agencyId" | "status" | "createdAt" | "updatedAt">;
export type AgentJobInput = Omit<AgentJob, "id" | "createdAt" | "updatedAt">;
export type ContentJobInput = Omit<ContentJob, "id" | "createdAt" | "updatedAt">;

export interface DemoRepository {
  reset(): void;
  setRole(role: DemoState["activeRole"]): void;
  saveTalent(draft: TalentDraft): string;
  updateTalentPreferences(
    talentId: string,
    preferences: Pick<TalentDraft, "visibility" | "openToOffers" | "marketingConsent">,
  ): void;
  toggleFavorite(talentId: string): void;
  moveTalentToReview(talentId: string): string;
  createOffer(input: OfferInput): string;
  respondToOffer(offerId: string, status: Exclude<OfferStatus, "sent">): void;
  moveCandidate(candidateId: string, stage: PipelineStage): void;
  createAgentJob(input: AgentJobInput): string;
  transitionAgentJob(jobId: string, status: AgentJobStatus): void;
  createContentJob(input: ContentJobInput): string;
  transitionContentJob(jobId: string, action: ContentAction, rejectionReason?: string): void;
  createCommunityPost(input: { authorName: string; category: CommunityCategory; title: string; body: string; verifiedAgency?: boolean }): string;
  setCommunityLike(postId: string, liked: boolean): void;
  replyToCommunityPost(postId: string, input: { authorName: string; body: string }): void;
}

const nextContentSteps: Partial<Record<ContentStep, Partial<Record<ContentAction, ContentStep>>>> = {
  source: { continue: "brief" },
  brief: { continue: "generating" },
  generating: { continue: "review" },
  review: { approve: "approval", "request-changes": "brief", reject: "brief" },
  approval: { schedule: "scheduled", reject: "review" },
};

export function createDemoRepository(
  state: DemoState,
  dispatch: Dispatch<DemoAction>,
): DemoRepository {
  return {
    reset: () => dispatch({ type: "demo/reset" }),
    setRole: (role) => dispatch({ type: "role/changed", payload: { role } }),
    saveTalent: (draft) => {
      const id = `talent-${state.talents.length + 1}`;
      dispatch({ type: "talent/saved", payload: { id, draft } });
      return id;
    },
    updateTalentPreferences: (talentId, preferences) =>
      dispatch({ type: "talent/preferences-updated", payload: { talentId, preferences } }),
    toggleFavorite: (talentId) => dispatch({ type: "favorite/toggled", payload: { talentId } }),
    moveTalentToReview: (talentId) => {
      const existing = state.candidates.find((candidate) => candidate.talentId === talentId);
      if (existing) {
        dispatch({
          type: "candidate/moved",
          payload: { candidateId: existing.id, stage: "internal-review" },
        });
        return existing.id;
      }
      const candidateId = `candidate-${state.candidates.length + 1}`;
      dispatch({ type: "candidate/review-added", payload: { candidateId, talentId } });
      return candidateId;
    },
    createOffer: (input) => {
      const existing = state.offers.find(
        (offer) =>
          offer.talentId === input.talentId &&
          (offer.status === "sent" || offer.status === "needs-info"),
      );
      if (existing) return existing.id;
      const id = `offer-${state.offers.length + 1}`;
      dispatch({ type: "offer/created", payload: input });
      return id;
    },
    respondToOffer: (offerId, status) =>
      dispatch({ type: "offer/responded", payload: { offerId, status } }),
    moveCandidate: (candidateId, stage) =>
      dispatch({ type: "candidate/moved", payload: { candidateId, stage } }),
    createAgentJob: (input) => {
      const id = `agent-job-${state.agentJobs.length + 1}`;
      const now = new Date().toISOString();
      dispatch({ type: "agent/created", payload: { ...input, id, createdAt: now, updatedAt: now } });
      return id;
    },
    transitionAgentJob: (jobId, status) =>
      dispatch({ type: "agent/transitioned", payload: { jobId, status } }),
    createContentJob: (input) => {
      const id = `content-job-${state.contentJobs.length + 1}`;
      const now = new Date().toISOString();
      dispatch({ type: "content/created", payload: { ...input, id, createdAt: now, updatedAt: now } });
      return id;
    },
    transitionContentJob: (jobId, action, rejectionReason) => {
      const current = state.contentJobs.find((job) => job.id === jobId);
      if (!current) return;
      const nextStep = nextContentSteps[current.step]?.[action];
      if (!nextStep) return;
      dispatch({
        type: "content/transitioned",
        payload: { jobId, action, nextStep, rejectionReason },
      });
    },
    createCommunityPost: (input) => {
      const id = `post-${state.communityPosts.length + 1}-${Date.now()}`;
      const now = new Date().toISOString();
      dispatch({
        type: "community/post-created",
        payload: { post: { id, ...input, createdAt: now, replies: [] } },
      });
      return id;
    },
    setCommunityLike: (postId, liked) => {
      dispatch({ type: "community/like-toggled", payload: { postId, liked } });
    },
    replyToCommunityPost: (postId, input) => {
      const post = state.communityPosts.find((item) => item.id === postId);
      if (!post) return;
      const id = `reply-${postId}-${post.replies.length + 1}-${Date.now()}`;
      const now = new Date().toISOString();
      dispatch({
        type: "community/reply-created",
        payload: { postId, reply: { id, ...input, createdAt: now } },
      });
    },
  };
}
