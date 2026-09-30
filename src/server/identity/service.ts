import { randomUUID } from "node:crypto";

import type { AuditRepository } from "@/server/audit/repository";
import type { TenantRole } from "@/server/tenancy/repository";

import type { AgencySession, CommunitySession } from "./model";
import { hashPassword, verifyPassword } from "./password";
import type { IdentityRepository } from "./repository";
import { generateSessionToken, hashSessionToken } from "./token";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// A fixed, valid-format ("salt:hash", hex) scrypt hash with no corresponding
// real account. When login fails because the email isn't found (or the
// account is inactive), we still run verifyPassword against this dummy hash
// before returning - so that path pays the same scrypt cost as a bad-password
// failure, and the login endpoint's response time can't be used to enumerate
// which emails have accounts.
const DUMMY_PASSWORD_HASH =
  "c2c5a52820d8a8246f247eb028b74eef:e7d2f541001c0d287d198798291d51f34295af8b8faed4df6787eb044a957ad4cb7c4fa4408f74b73e7c611a03f62b2683ab93c5bcfb5a6587e692414e367ad2";

export class IdentityService {
  private readonly identity: IdentityRepository;
  private readonly audit: AuditRepository;
  private readonly now: () => Date;
  private readonly createToken: () => string;
  private readonly createId: () => string;

  constructor(dependencies: {
    identity: IdentityRepository;
    audit: AuditRepository;
    now?: () => Date;
    createToken?: () => string;
    createId?: () => string;
  }) {
    this.identity = dependencies.identity;
    this.audit = dependencies.audit;
    this.now = dependencies.now ?? (() => new Date());
    this.createToken = dependencies.createToken ?? generateSessionToken;
    this.createId = dependencies.createId ?? randomUUID;
  }

  async createCommunitySession(input: { nickname: string; requestId: string }) {
    const token = this.createToken();
    const now = this.now();
    const session = await this.identity.createCommunityIdentity({
      userId: this.createId(),
      nickname: input.nickname,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    });
    await this.audit.append({
      actorUserId: session.userId,
      tenantId: null,
      action: "community.session.created",
      subjectType: "session",
      subjectId: session.sessionId,
      requestId: input.requestId,
      metadata: {},
    });
    return { token, session };
  }

  async resolveCommunitySession(rawToken: string | undefined): Promise<CommunitySession | null> {
    if (!rawToken) return null;
    const session = await this.identity.findSessionByTokenHash(hashSessionToken(rawToken));
    if (!session) return null;
    if (session.revokedAt || Date.parse(session.expiresAt) <= this.now().getTime()) return null;
    if (session.userStatus !== "active" || session.profileStatus !== "active") return null;
    return session;
  }

  async revokeCommunitySession(session: CommunitySession, requestId: string): Promise<void> {
    await this.identity.revokeSession(session.sessionId, session.userId);
    await this.audit.append({
      actorUserId: session.userId,
      tenantId: null,
      action: "community.session.revoked",
      subjectType: "session",
      subjectId: session.sessionId,
      requestId,
      metadata: {},
    });
  }

  async createAgencyAccount(input: {
    tenantId: string;
    email: string;
    displayName: string;
    password: string;
    role: TenantRole;
    requestId: string;
  }): Promise<{ userId: string; tenantId: string; email: string; displayName: string }> {
    const userId = this.createId();
    const passwordHash = await hashPassword(input.password);
    const account = await this.identity.createAgencyAccount({
      userId,
      tenantId: input.tenantId,
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      role: input.role,
    });
    await this.audit.append({
      actorUserId: null,
      tenantId: input.tenantId,
      action: "agency.account.created",
      subjectType: "user",
      subjectId: userId,
      requestId: input.requestId,
      metadata: { role: input.role },
    });
    return account;
  }

  async authenticateAgency(input: {
    email: string;
    password: string;
    requestId: string;
  }): Promise<{ token: string; session: AgencySession } | null> {
    const credentials = await this.identity.findAgencyCredentialsByEmail(input.email);
    if (!credentials || credentials.userStatus !== "active" || credentials.profileStatus !== "active") {
      await verifyPassword(input.password, DUMMY_PASSWORD_HASH);
      await this.audit.append({
        actorUserId: null,
        tenantId: null,
        action: "agency.session.login_failed",
        subjectType: "session",
        subjectId: null,
        requestId: input.requestId,
        metadata: { reason: "not_found" },
      });
      return null;
    }
    const validPassword = await verifyPassword(input.password, credentials.passwordHash);
    if (!validPassword) {
      await this.audit.append({
        actorUserId: credentials.userId,
        tenantId: credentials.tenantId,
        action: "agency.session.login_failed",
        subjectType: "session",
        subjectId: null,
        requestId: input.requestId,
        metadata: { reason: "bad_password" },
      });
      return null;
    }
    const token = this.createToken();
    const now = this.now();
    const session = await this.identity.createAgencySession({
      userId: credentials.userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    });
    await this.audit.append({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      action: "agency.session.created",
      subjectType: "session",
      subjectId: session.sessionId,
      requestId: input.requestId,
      metadata: {},
    });
    return { token, session };
  }

  async resolveAgencySession(rawToken: string | undefined): Promise<AgencySession | null> {
    if (!rawToken) return null;
    const session = await this.identity.findAgencySessionByTokenHash(hashSessionToken(rawToken));
    if (!session) return null;
    if (session.revokedAt || Date.parse(session.expiresAt) <= this.now().getTime()) return null;
    if (session.userStatus !== "active" || session.profileStatus !== "active") return null;
    return session;
  }

  async revokeAgencySession(session: AgencySession, requestId: string): Promise<void> {
    await this.identity.revokeSession(session.sessionId, session.userId);
    await this.audit.append({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      action: "agency.session.revoked",
      subjectType: "session",
      subjectId: session.sessionId,
      requestId,
      metadata: {},
    });
  }
}
