import type { AuditRepository, NewAuditEvent } from "@/server/audit/repository";
import type {
  CommunityComment,
  CommunityPost,
  CommunityReport,
  ReportTarget,
} from "@/server/community/model";
import type {
  CommunityRepository,
  CreateCommentRecord,
  CreatePostRecord,
  CreateReportRecord,
  ListCommentsInput,
  ListPostsInput,
} from "@/server/community/repository";
import type { AgencySession, CommunitySession } from "@/server/identity/model";
import type { IdentityRepository } from "@/server/identity/repository";
import { AppError } from "@/server/shared/errors";
import { decodeCursor, encodeCursor, type Page } from "@/server/shared/page";
import type { TenancyRepository, TenantMembership, TenantRole } from "@/server/tenancy/repository";

interface StoredPost extends CommunityPost {
  authorUserId: string;
  status: "published" | "hidden" | "removed";
}

interface StoredComment extends CommunityComment {
  authorUserId: string;
  status: "published" | "hidden" | "removed";
}

interface StoredReport extends CommunityReport {
  reporterUserId: string;
  reason: string;
}

function uuidFor(counter: number): string {
  return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
}

function isBeforeCursor(createdAt: string, id: string, encoded?: string): boolean {
  if (!encoded) return true;
  const cursor = decodeCursor(encoded);
  return createdAt < cursor.createdAt || (createdAt === cursor.createdAt && id < cursor.id);
}

function publicPost(post: StoredPost): CommunityPost {
  return {
    id: post.id,
    category: post.category,
    title: post.title,
    body: post.body,
    authorNickname: post.authorNickname,
    replyCount: post.replyCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function publicComment(comment: StoredComment): CommunityComment {
  return {
    id: comment.id,
    postId: comment.postId,
    body: comment.body,
    authorNickname: comment.authorNickname,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

function publicReport(report: StoredReport): CommunityReport {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    status: report.status,
    createdAt: report.createdAt,
  };
}

export class MemoryPlatformRepository
  implements IdentityRepository, CommunityRepository, TenancyRepository, AuditRepository
{
  private counter = 1;
  private readonly sessions = new Map<string, CommunitySession>();
  private readonly sessionHashById = new Map<string, string>();
  private readonly profiles = new Map<string, { nickname: string; status: CommunitySession["profileStatus"] }>();
  private readonly agencyProfiles = new Map<string, { tenantId: string; email: string; displayName: string; passwordHash: string; status: AgencySession["profileStatus"] }>();
  private readonly agencyEmailIndex = new Map<string, string>(); // lowercase email -> userId
  private readonly agencySessions = new Map<string, AgencySession>(); // tokenHash -> session
  private readonly agencySessionHashById = new Map<string, string>();
  private readonly posts: StoredPost[] = [];
  private readonly comments: StoredComment[] = [];
  private readonly reports: StoredReport[] = [];
  private readonly memberships: TenantMembership[] = [];
  readonly auditEvents: NewAuditEvent[] = [];

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  private nextId(): string {
    return uuidFor(this.counter++);
  }

  seedViewer(viewer: CommunitySession): void {
    this.profiles.set(viewer.userId, { nickname: viewer.nickname, status: viewer.profileStatus });
  }

  seedMembership(membership: TenantMembership): void {
    this.memberships.push(membership);
  }

  setIdentityStatus(
    userId: string,
    status: Partial<Pick<CommunitySession, "userStatus" | "profileStatus">>,
  ): void {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) Object.assign(session, status);
    }
    const profile = this.profiles.get(userId);
    if (profile && status.profileStatus) profile.status = status.profileStatus;
  }

  sessionTokenHashes(): string[] {
    return [...this.sessions.keys()];
  }

  async createCommunityIdentity(input: {
    userId: string;
    nickname: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<CommunitySession> {
    if ([...this.profiles.values()].some((profile) => profile.nickname.toLowerCase() === input.nickname.toLowerCase())) {
      throw new AppError("CONFLICT", "이미 사용 중인 닉네임입니다.");
    }
    const session: CommunitySession = {
      sessionId: this.nextId(),
      userId: input.userId,
      nickname: input.nickname,
      expiresAt: input.expiresAt,
      revokedAt: null,
      userStatus: "active",
      profileStatus: "active",
    };
    this.sessions.set(input.tokenHash, session);
    this.sessionHashById.set(session.sessionId, input.tokenHash);
    this.profiles.set(input.userId, { nickname: input.nickname, status: "active" });
    return { ...session };
  }

  async findSessionByTokenHash(tokenHash: string): Promise<CommunitySession | null> {
    const session = this.sessions.get(tokenHash);
    return session ? { ...session } : null;
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const tokenHash = this.sessionHashById.get(sessionId);
    const session = tokenHash ? this.sessions.get(tokenHash) : undefined;
    if (session?.userId === userId) session.revokedAt = this.now();

    const agencyTokenHash = this.agencySessionHashById.get(sessionId);
    const agencySession = agencyTokenHash ? this.agencySessions.get(agencyTokenHash) : undefined;
    if (agencySession?.userId === userId) agencySession.revokedAt = this.now();
  }

  async createAgencyAccount(input: {
    userId: string;
    tenantId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    role: TenantRole;
  }): Promise<{ userId: string; tenantId: string; email: string; displayName: string }> {
    this.agencyProfiles.set(input.userId, {
      tenantId: input.tenantId,
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      status: "active",
    });
    this.agencyEmailIndex.set(input.email.toLowerCase(), input.userId);
    this.memberships.push({ tenantId: input.tenantId, userId: input.userId, role: input.role, status: "active" });
    return { userId: input.userId, tenantId: input.tenantId, email: input.email, displayName: input.displayName };
  }

  async findAgencyCredentialsByEmail(email: string): Promise<{
    userId: string;
    tenantId: string;
    passwordHash: string;
    userStatus: AgencySession["userStatus"];
    profileStatus: AgencySession["profileStatus"];
  } | null> {
    const userId = this.agencyEmailIndex.get(email.toLowerCase());
    if (!userId) return null;
    const profile = this.agencyProfiles.get(userId);
    if (!profile || profile.status !== "active") return null;
    return { userId, tenantId: profile.tenantId, passwordHash: profile.passwordHash, userStatus: "active", profileStatus: profile.status };
  }

  async createAgencySession(input: { userId: string; tokenHash: string; expiresAt: string }): Promise<AgencySession> {
    const profile = this.agencyProfiles.get(input.userId);
    if (!profile) throw new AppError("NOT_FOUND", "기획사 계정을 찾을 수 없습니다.");
    const session: AgencySession = {
      sessionId: this.nextId(),
      userId: input.userId,
      tenantId: profile.tenantId,
      email: profile.email,
      displayName: profile.displayName,
      expiresAt: input.expiresAt,
      revokedAt: null,
      userStatus: "active",
      profileStatus: profile.status,
    };
    this.agencySessions.set(input.tokenHash, session);
    this.agencySessionHashById.set(session.sessionId, input.tokenHash);
    return { ...session };
  }

  async findAgencySessionByTokenHash(tokenHash: string): Promise<AgencySession | null> {
    const session = this.agencySessions.get(tokenHash);
    return session ? { ...session } : null;
  }

  async listPosts(input: ListPostsInput): Promise<Page<CommunityPost>> {
    const matching = this.posts
      .filter((post) => post.status === "published")
      .filter((post) => !input.category || post.category === input.category)
      .filter((post) => isBeforeCursor(post.createdAt, post.id, input.cursor))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const selected = matching.slice(0, input.limit + 1);
    const hasMore = selected.length > input.limit;
    const items = selected.slice(0, input.limit).map(publicPost);
    const last = items.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
    };
  }

  async createPost(input: CreatePostRecord): Promise<CommunityPost> {
    const profile = this.profiles.get(input.authorUserId);
    if (!profile || profile.status !== "active") throw new AppError("FORBIDDEN", "활성 커뮤니티 프로필이 필요합니다.");
    const timestamp = this.now();
    const stored: StoredPost = {
      id: this.nextId(),
      ...input,
      authorNickname: profile.nickname,
      replyCount: 0,
      status: "published",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.posts.push(stored);
    return publicPost(stored);
  }

  async listComments(input: ListCommentsInput): Promise<Page<CommunityComment>> {
    const matching = this.comments
      .filter((comment) => comment.postId === input.postId && comment.status === "published")
      .filter((comment) => isBeforeCursor(comment.createdAt, comment.id, input.cursor))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const selected = matching.slice(0, input.limit + 1);
    const hasMore = selected.length > input.limit;
    const items = selected.slice(0, input.limit).map(publicComment);
    const last = items.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
    };
  }

  async createComment(input: CreateCommentRecord): Promise<CommunityComment> {
    const post = this.posts.find((item) => item.id === input.postId && item.status === "published");
    const profile = this.profiles.get(input.authorUserId);
    if (!post) throw new AppError("NOT_FOUND", "게시글을 찾을 수 없습니다.");
    if (!profile || profile.status !== "active") throw new AppError("FORBIDDEN", "활성 커뮤니티 프로필이 필요합니다.");
    const timestamp = this.now();
    const stored: StoredComment = {
      id: this.nextId(),
      ...input,
      authorNickname: profile.nickname,
      status: "published",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.comments.push(stored);
    post.replyCount += 1;
    return publicComment(stored);
  }

  async findPublishedTarget(input: ReportTarget) {
    const exists = input.targetType === "post"
      ? this.posts.some((post) => post.id === input.targetId && post.status === "published")
      : this.comments.some((comment) => comment.id === input.targetId && comment.status === "published");
    return exists ? { id: input.targetId, type: input.targetType } : null;
  }

  async createReport(input: CreateReportRecord): Promise<CommunityReport> {
    const duplicate = this.reports.some(
      (report) => report.reporterUserId === input.reporterUserId &&
        report.targetType === input.targetType &&
        report.targetId === input.targetId &&
        (report.status === "open" || report.status === "reviewing"),
    );
    if (duplicate) throw new AppError("CONFLICT", "이미 접수된 신고가 있습니다.");
    const stored: StoredReport = {
      id: this.nextId(),
      ...input,
      status: "open",
      createdAt: this.now(),
    };
    this.reports.push(stored);
    return publicReport(stored);
  }

  async findActiveMembership(userId: string, tenantId: string): Promise<TenantMembership | null> {
    return this.memberships.find(
      (membership) => membership.userId === userId && membership.tenantId === tenantId && membership.status === "active",
    ) ?? null;
  }

  async append(event: NewAuditEvent): Promise<void> {
    this.auditEvents.push(structuredClone(event));
  }
}
