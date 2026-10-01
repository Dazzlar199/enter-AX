import type { Page } from "@/server/shared/page";

import type {
  CommunityCategorySlug,
  CommunityComment,
  CommunityPost,
  CommunityReport,
  ReportTarget,
} from "./model";

export interface ListPostsInput {
  category?: CommunityCategorySlug;
  cursor?: string;
  limit: number;
}

export interface ListCommentsInput {
  postId: string;
  cursor?: string;
  limit: number;
}

export interface CreatePostRecord {
  authorUserId: string;
  category: CommunityCategorySlug;
  title: string;
  body: string;
}

export interface CreateCommentRecord {
  authorUserId: string;
  postId: string;
  body: string;
}

export interface CreateReportRecord extends ReportTarget {
  reporterUserId: string;
  reason: string;
}

export interface CommunityRepository {
  listPosts(input: ListPostsInput): Promise<Page<CommunityPost>>;
  createPost(input: CreatePostRecord): Promise<CommunityPost>;
  listComments(input: ListCommentsInput): Promise<Page<CommunityComment>>;
  createComment(input: CreateCommentRecord): Promise<CommunityComment>;
  findPublishedTarget(input: ReportTarget): Promise<{ id: string; type: "post" | "comment" } | null>;
  createReport(input: CreateReportRecord): Promise<CommunityReport>;
}
