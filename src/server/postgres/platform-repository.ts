import { randomUUID } from "node:crypto";

import type { Sql } from "postgres";

import type { AuditRepository, NewAuditEvent } from "@/server/audit/repository";
import type { CommunityComment, CommunityPost, CommunityReport, ReportTarget } from "@/server/community/model";
import type {
  CommunityRepository,
  CreateCommentRecord,
  CreatePostRecord,
  CreateReportRecord,
  ListCommentsInput,
  ListPostsInput,
} from "@/server/community/repository";
import { withActorTransaction } from "@/server/db/context";
import type { AgencySession, CommunitySession } from "@/server/identity/model";
import type { IdentityRepository } from "@/server/identity/repository";
import { AppError } from "@/server/shared/errors";
import { decodeCursor, encodeCursor, type Page } from "@/server/shared/page";
import type { TenancyRepository, TenantMembership, TenantRole } from "@/server/tenancy/repository";

function conflict(error: unknown): never {
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    throw new AppError("CONFLICT", "이미 존재하는 데이터입니다.");
  }
  throw error;
}

export class PostgresPlatformRepository
  implements IdentityRepository, CommunityRepository, TenancyRepository, AuditRepository
{
  constructor(private readonly sql: Sql) {}

  async createCommunityIdentity(input: {
    userId: string;
    nickname: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<CommunitySession> {
    try {
      return await withActorTransaction(this.sql, { userId: input.userId }, async (transaction) => {
        const sessionId = randomUUID();
        await transaction`INSERT INTO users (id) VALUES (${input.userId})`;
        await transaction`INSERT INTO community_profiles (user_id, nickname) VALUES (${input.userId}, ${input.nickname})`;
        await transaction`
          INSERT INTO sessions (id, user_id, token_hash, expires_at)
          VALUES (${sessionId}, ${input.userId}, ${input.tokenHash}, ${input.expiresAt})
        `;
        return {
          sessionId,
          userId: input.userId,
          nickname: input.nickname,
          expiresAt: input.expiresAt,
          revokedAt: null,
          userStatus: "active",
          profileStatus: "active",
        };
      });
    } catch (error) {
      return conflict(error);
    }
  }

  async findSessionByTokenHash(tokenHash: string): Promise<CommunitySession | null> {
    const [row] = await this.sql<{
      sessionId: string;
      userId: string;
      expiresAt: Date;
      revokedAt: Date | null;
      userStatus: CommunitySession["userStatus"];
      nickname: string;
      profileStatus: CommunitySession["profileStatus"];
    }[]>`
      SELECT
        session_id AS "sessionId",
        user_id AS "userId",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt",
        user_status AS "userStatus",
        nickname,
        profile_status AS "profileStatus"
      FROM lookup_session(${tokenHash})
    `;
    return row ? {
      ...row,
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
    } : null;
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await withActorTransaction(this.sql, { userId }, async (transaction) => {
      await transaction`UPDATE sessions SET revoked_at = now() WHERE id = ${sessionId} AND user_id = ${userId}`;
    });
  }

  async createAgencyAccount(input: {
    userId: string;
    tenantId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    role: TenantRole;
  }): Promise<{ userId: string; tenantId: string; email: string; displayName: string }> {
    try {
      return await withActorTransaction(this.sql, { userId: input.userId, tenantId: input.tenantId }, async (transaction) => {
        await transaction`INSERT INTO users (id) VALUES (${input.userId})`;
        await transaction`
          INSERT INTO tenant_staff_profiles (user_id, tenant_id, email, display_name, password_hash)
          VALUES (${input.userId}, ${input.tenantId}, ${input.email}, ${input.displayName}, ${input.passwordHash})
        `;
        await transaction`
          INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
          VALUES (${input.tenantId}, ${input.userId}, ${input.role}, 'active')
        `;
        return { userId: input.userId, tenantId: input.tenantId, email: input.email, displayName: input.displayName };
      });
    } catch (error) {
      return conflict(error);
    }
  }

  async findAgencyCredentialsByEmail(email: string): Promise<{
    userId: string;
    tenantId: string;
    passwordHash: string;
    userStatus: AgencySession["userStatus"];
    profileStatus: AgencySession["profileStatus"];
  } | null> {
    const [row] = await this.sql<{
      userId: string;
      tenantId: string;
      passwordHash: string;
      userStatus: AgencySession["userStatus"];
      profileStatus: AgencySession["profileStatus"];
    }[]>`
      SELECT
        user_id AS "userId",
        tenant_id AS "tenantId",
        password_hash AS "passwordHash",
        user_status AS "userStatus",
        profile_status AS "profileStatus"
      FROM lookup_agency_credentials(${email})
    `;
    return row ?? null;
  }

  async createAgencySession(input: { userId: string; tokenHash: string; expiresAt: string }): Promise<AgencySession> {
    return withActorTransaction(this.sql, { userId: input.userId }, async (transaction) => {
      const sessionId = randomUUID();
      const [profile] = await transaction<{ tenantId: string; email: string; displayName: string }[]>`
        SELECT tenant_id AS "tenantId", email, display_name AS "displayName"
        FROM tenant_staff_profiles WHERE user_id = ${input.userId}
      `;
      if (!profile) throw new AppError("NOT_FOUND", "기획사 계정을 찾을 수 없습니다.");
      await transaction`
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES (${sessionId}, ${input.userId}, ${input.tokenHash}, ${input.expiresAt})
      `;
      return {
        sessionId,
        userId: input.userId,
        tenantId: profile.tenantId,
        email: profile.email,
        displayName: profile.displayName,
        expiresAt: input.expiresAt,
        revokedAt: null,
        userStatus: "active",
        profileStatus: "active",
      };
    });
  }

  async findAgencySessionByTokenHash(tokenHash: string): Promise<AgencySession | null> {
    const [row] = await this.sql<{
      sessionId: string;
      userId: string;
      tenantId: string;
      expiresAt: Date;
      revokedAt: Date | null;
      userStatus: AgencySession["userStatus"];
      email: string;
      displayName: string;
      profileStatus: AgencySession["profileStatus"];
    }[]>`
      SELECT
        session_id AS "sessionId",
        user_id AS "userId",
        tenant_id AS "tenantId",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt",
        user_status AS "userStatus",
        email,
        display_name AS "displayName",
        profile_status AS "profileStatus"
      FROM lookup_agency_session(${tokenHash})
    `;
    return row ? {
      ...row,
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
    } : null;
  }

  async listPosts(input: ListPostsInput): Promise<Page<CommunityPost>> {
    const cursor = input.cursor ? decodeCursor(input.cursor) : null;
    const rows = await this.sql<CommunityPost[]>`
      SELECT
        p.id,
        p.category,
        p.title,
        p.body,
        profile.nickname AS "authorNickname",
        (SELECT count(*)::int FROM community_comments c WHERE c.post_id = p.id AND c.status = 'published') AS "replyCount",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt"
      FROM community_posts p
      JOIN community_profiles profile ON profile.user_id = p.author_user_id
      WHERE p.status = 'published'
        AND (${input.category ?? null}::text IS NULL OR p.category = ${input.category ?? null})
        AND (${cursor?.createdAt ?? null}::timestamptz IS NULL OR (p.created_at, p.id) < (${cursor?.createdAt ?? null}::timestamptz, ${cursor?.id ?? null}::uuid))
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${input.limit + 1}
    `;
    return this.page(rows, input.limit);
  }

  async createPost(input: CreatePostRecord): Promise<CommunityPost> {
    return withActorTransaction(this.sql, { userId: input.authorUserId }, async (transaction) => {
      const [row] = await transaction<CommunityPost[]>`
        WITH inserted AS (
          INSERT INTO community_posts (author_user_id, category, title, body)
          VALUES (${input.authorUserId}, ${input.category}, ${input.title}, ${input.body})
          RETURNING *
        )
        SELECT i.id, i.category, i.title, i.body, p.nickname AS "authorNickname", 0::int AS "replyCount",
          i.created_at AS "createdAt", i.updated_at AS "updatedAt"
        FROM inserted i JOIN community_profiles p ON p.user_id = i.author_user_id
      `;
      return row;
    });
  }

  async listComments(input: ListCommentsInput): Promise<Page<CommunityComment>> {
    const cursor = input.cursor ? decodeCursor(input.cursor) : null;
    const rows = await this.sql<CommunityComment[]>`
      SELECT c.id, c.post_id AS "postId", c.body, p.nickname AS "authorNickname",
        c.created_at AS "createdAt", c.updated_at AS "updatedAt"
      FROM community_comments c
      JOIN community_profiles p ON p.user_id = c.author_user_id
      WHERE c.post_id = ${input.postId} AND c.status = 'published'
        AND (${cursor?.createdAt ?? null}::timestamptz IS NULL OR (c.created_at, c.id) < (${cursor?.createdAt ?? null}::timestamptz, ${cursor?.id ?? null}::uuid))
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ${input.limit + 1}
    `;
    return this.page(rows, input.limit);
  }

  async createComment(input: CreateCommentRecord): Promise<CommunityComment> {
    return withActorTransaction(this.sql, { userId: input.authorUserId }, async (transaction) => {
      const [row] = await transaction<CommunityComment[]>`
        WITH inserted AS (
          INSERT INTO community_comments (post_id, author_user_id, body)
          SELECT ${input.postId}, ${input.authorUserId}, ${input.body}
          WHERE EXISTS (SELECT 1 FROM community_posts WHERE id = ${input.postId} AND status = 'published')
          RETURNING *
        )
        SELECT i.id, i.post_id AS "postId", i.body, p.nickname AS "authorNickname",
          i.created_at AS "createdAt", i.updated_at AS "updatedAt"
        FROM inserted i JOIN community_profiles p ON p.user_id = i.author_user_id
      `;
      if (!row) throw new AppError("NOT_FOUND", "게시글을 찾을 수 없습니다.");
      return row;
    });
  }

  async findPublishedTarget(input: ReportTarget) {
    const rows = input.targetType === "post"
      ? await this.sql`SELECT id FROM community_posts WHERE id = ${input.targetId} AND status = 'published'`
      : await this.sql`SELECT id FROM community_comments WHERE id = ${input.targetId} AND status = 'published'`;
    return rows.length ? { id: input.targetId, type: input.targetType } : null;
  }

  async createReport(input: CreateReportRecord): Promise<CommunityReport> {
    try {
      return await withActorTransaction(this.sql, { userId: input.reporterUserId }, async (transaction) => {
        const [row] = await transaction<CommunityReport[]>`
          INSERT INTO community_reports (reporter_user_id, target_type, target_id, reason)
          VALUES (${input.reporterUserId}, ${input.targetType}, ${input.targetId}, ${input.reason})
          RETURNING id, target_type AS "targetType", target_id AS "targetId", status, created_at AS "createdAt"
        `;
        return row;
      });
    } catch (error) {
      return conflict(error);
    }
  }

  async findActiveMembership(userId: string, tenantId: string): Promise<TenantMembership | null> {
    return withActorTransaction(this.sql, { userId, tenantId }, async (transaction) => {
      const [row] = await transaction<TenantMembership[]>`
        SELECT tenant_id AS "tenantId", user_id AS "userId", role, status
        FROM tenant_memberships
        WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND status = 'active'
      `;
      return row ?? null;
    });
  }

  async append(event: NewAuditEvent): Promise<void> {
    await withActorTransaction(this.sql, { userId: event.actorUserId, tenantId: event.tenantId }, async (transaction) => {
      await transaction`
        INSERT INTO audit_events (actor_user_id, tenant_id, action, subject_type, subject_id, request_id, metadata)
        VALUES (${event.actorUserId}, ${event.tenantId}, ${event.action}, ${event.subjectType}, ${event.subjectId}, ${event.requestId}, ${transaction.json(event.metadata)})
      `;
    });
  }

  private page<T extends { id: string; createdAt: string | Date }>(rows: T[], limit: number): Page<T & { createdAt: string }> {
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((row) => ({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      ...( "updatedAt" in row && row.updatedAt instanceof Date ? { updatedAt: row.updatedAt.toISOString() } : {}),
    })) as (T & { createdAt: string })[];
    const last = items.at(-1);
    return { items, nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null };
  }
}
