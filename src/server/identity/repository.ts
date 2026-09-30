import type { TenantRole } from "@/server/tenancy/repository";

import type { AgencySession, CommunitySession } from "./model";

export interface IdentityRepository {
  createCommunityIdentity(input: {
    userId: string;
    nickname: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<CommunitySession>;
  findSessionByTokenHash(tokenHash: string): Promise<CommunitySession | null>;
  revokeSession(sessionId: string, userId: string): Promise<void>;

  createAgencyAccount(input: {
    userId: string;
    tenantId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    role: TenantRole;
  }): Promise<{ userId: string; tenantId: string; email: string; displayName: string }>;
  findAgencyCredentialsByEmail(email: string): Promise<{
    userId: string;
    tenantId: string;
    passwordHash: string;
    userStatus: AgencySession["userStatus"];
    profileStatus: AgencySession["profileStatus"];
  } | null>;
  createAgencySession(input: { userId: string; tokenHash: string; expiresAt: string }): Promise<AgencySession>;
  findAgencySessionByTokenHash(tokenHash: string): Promise<AgencySession | null>;
}
