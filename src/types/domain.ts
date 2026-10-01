export type TalentField = "idol" | "vocal" | "dance" | "actor" | "model";
export type Gender = "woman" | "man" | "nonbinary" | "undisclosed";
export type Visibility = "verified-agencies" | "public";
export type MediaSource = "file" | "youtube" | "demo";
export type OfferStatus = "sent" | "accepted" | "declined" | "needs-info";
export type PipelineStage =
  | "discovered"
  | "saved"
  | "internal-review"
  | "offer-sent"
  | "accepted"
  | "follow-up"
  | "final-review"
  | "completed"
  | "on-hold";
export type AgentJobStatus =
  | "queued"
  | "running"
  | "approval-required"
  | "completed"
  | "rejected"
  | "failed"
  | "manual";
export type ContentStep =
  | "source"
  | "brief"
  | "generating"
  | "review"
  | "approval"
  | "scheduled";
export type ContentAction = "continue" | "request-changes" | "approve" | "reject" | "schedule";
export type ActiveRole = "public" | "talent" | "agency";

export interface MediaDraft {
  source: "file" | "youtube";
  value: string;
}

export interface TalentDraft {
  stageName: string;
  birthDate: string;
  gender: Gender;
  nationality: string;
  region: string;
  fields: TalentField[];
  bio: string;
  socialUrl: string;
  isMinor: boolean;
  guardianConsent: boolean;
  visibility: Visibility;
  openToOffers: boolean;
  marketingConsent: boolean;
  photos: { front: string; left: string; right: string };
  vocal: MediaDraft;
  dance: MediaDraft;
}

export interface TalentMedia {
  kind: "photo-front" | "photo-left" | "photo-right" | "vocal" | "dance";
  source: MediaSource;
  value: string;
  analysisEligible: boolean;
}

export interface TalentProfile extends TalentDraft {
  id: string;
  ageBand: "teen" | "20s" | "30s";
  media: TalentMedia[];
  createdAt: string;
  updatedAt: string;
  recentActivityAt: string;
}

export interface Agency {
  id: string;
  name: string;
  department: string;
  verification: "verified" | "pending";
}

export interface Offer {
  id: string;
  agencyId: string;
  talentId: string;
  title: string;
  purpose: string;
  field: TalentField;
  dueAt: string;
  department: string;
  message: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateActivity {
  id: string;
  label: string;
  createdAt: string;
}

export interface Candidate {
  id: string;
  talentId: string;
  stage: PipelineStage;
  owner: string;
  nextAction: string;
  teamNote: string;
  updatedAt: string;
  activity: CandidateActivity[];
}

export type AgentSkill = "audition-triage" | "daily-briefing" | "content-prep";

export interface AgentJob {
  id: string;
  tenantId: string;
  skill: AgentSkill;
  status: AgentJobStatus;
  tools: string[];
  currentStep: string;
  result: string;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPlanSegment {
  role: string;
  start: number;
  end: number;
  caption: string;
}

export interface ContentClipCandidate {
  id: string;
  title: string;
  label: "데모 생성물" | "AI 추출 결과" | "AI 기획 결과";
  url?: string;
  startSec?: number;
  endSec?: number;
  score?: number;
  planSegments?: ContentPlanSegment[];
}

export interface ContentJob {
  id: string;
  title: string;
  purpose: string;
  channels: Array<"shorts" | "reels" | "tiktok">;
  duration: 15 | 30 | 60;
  tone: string;
  captionStyle: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
  step: ContentStep;
  clipCandidates: ContentClipCandidate[];
  transcript?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileView {
  id: string;
  talentId: string;
  agencyId: string;
  viewedAt: string;
}

export type CommunityCategory = "자유" | "질문" | "합격후기" | "정보공유";

export interface CommunityReply {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  category: CommunityCategory;
  title: string;
  body: string;
  createdAt: string;
  replies: CommunityReply[];
}

export interface DemoState {
  version: 1;
  activeRole: ActiveRole;
  activeAgencyId: string;
  talents: TalentProfile[];
  agencies: Agency[];
  offers: Offer[];
  candidates: Candidate[];
  favoriteTalentIds: string[];
  agentJobs: AgentJob[];
  contentJobs: ContentJob[];
  profileViews: ProfileView[];
  communityPosts: CommunityPost[];
}

export type ValidationErrors = Partial<
  Record<
    | "stageName"
    | "birthDate"
    | "gender"
    | "nationality"
    | "region"
    | "fields"
    | "bio"
    | "socialUrl"
    | "photos"
    | "vocal"
    | "dance"
    | "guardianConsent"
    | "visibility",
    string
  >
>;
