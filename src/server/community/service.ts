import type { AuditRepository } from "@/server/audit/repository";
import type { CommunitySession } from "@/server/identity/model";
import { AppError } from "@/server/shared/errors";

import type { CommunityRepository, ListCommentsInput, ListPostsInput } from "./repository";
import { sanitizePublicText } from "./sanitize";
import type { CreateCommentInput, CreatePostInput, CreateReportInput } from "./schema";

function requireActor(actor: CommunitySession | null): CommunitySession {
  if (!actor) throw new AppError("UNAUTHENTICATED", "커뮤니티 로그인이 필요합니다.");
  return actor;
}

export class CommunityService {
  constructor(
    private readonly community: CommunityRepository,
    private readonly audit: AuditRepository,
  ) {}

  listPosts(input: ListPostsInput) {
    return this.community.listPosts(input);
  }

  async createPost(actor: CommunitySession | null, input: CreatePostInput, requestId: string) {
    const authenticated = requireActor(actor);
    const title = sanitizePublicText(input.title);
    const body = sanitizePublicText(input.body);
    const post = await this.community.createPost({ ...input, title: title.text, body: body.text, authorUserId: authenticated.userId });
    await this.audit.append({
      actorUserId: authenticated.userId,
      tenantId: null,
      action: "community.post.created",
      subjectType: "community_post",
      subjectId: post.id,
      requestId,
      metadata: { category: post.category, sanitized: title.changed || body.changed },
    });
    return post;
  }

  listComments(input: ListCommentsInput) {
    return this.community.listComments(input);
  }

  async createComment(
    actor: CommunitySession | null,
    postId: string,
    input: CreateCommentInput,
    requestId: string,
  ) {
    const authenticated = requireActor(actor);
    const target = await this.community.findPublishedTarget({ targetType: "post", targetId: postId });
    if (!target) throw new AppError("NOT_FOUND", "게시글을 찾을 수 없습니다.");
    const body = sanitizePublicText(input.body);
    const comment = await this.community.createComment({
      authorUserId: authenticated.userId,
      postId,
      body: body.text,
    });
    await this.audit.append({
      actorUserId: authenticated.userId,
      tenantId: null,
      action: "community.comment.created",
      subjectType: "community_comment",
      subjectId: comment.id,
      requestId,
      metadata: { postId, sanitized: body.changed },
    });
    return comment;
  }

  async report(actor: CommunitySession | null, input: CreateReportInput, requestId: string) {
    const authenticated = requireActor(actor);
    const target = await this.community.findPublishedTarget(input);
    if (!target) throw new AppError("NOT_FOUND", "신고 대상을 찾을 수 없습니다.");
    const report = await this.community.createReport({ ...input, reporterUserId: authenticated.userId });
    await this.audit.append({
      actorUserId: authenticated.userId,
      tenantId: null,
      action: "community.report.created",
      subjectType: input.targetType,
      subjectId: input.targetId,
      requestId,
      metadata: { reportId: report.id },
    });
    return report;
  }
}
