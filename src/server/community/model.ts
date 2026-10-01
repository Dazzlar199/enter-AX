export const communityCategories = ["free", "question", "success-story", "information"] as const;
export type CommunityCategorySlug = (typeof communityCategories)[number];

export interface CommunityPost {
  id: string;
  category: CommunityCategorySlug;
  title: string;
  body: string;
  authorNickname: string;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  body: string;
  authorNickname: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityReport {
  id: string;
  targetType: "post" | "comment";
  targetId: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
}

export interface ReportTarget {
  targetType: "post" | "comment";
  targetId: string;
}
