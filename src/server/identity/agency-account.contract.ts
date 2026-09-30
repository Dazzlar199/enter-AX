import { expect, it } from "vitest";

import type { AuditRepository } from "@/server/audit/repository";
import type { CommunityRepository } from "@/server/community/repository";
import type { TenancyRepository } from "@/server/tenancy/repository";

import type { IdentityRepository } from "./repository";

type PlatformRepository = IdentityRepository & CommunityRepository & TenancyRepository & AuditRepository;

export function agencyAccountContract(
  name: string,
  factory: () => Promise<PlatformRepository>,
  createTenantId: () => Promise<string>,
) {
  it(`${name}: creates an agency account, authenticates it, and scopes sessions per tenant`, async () => {
    const repository = await factory();
    const userId = crypto.randomUUID();
    const tenantId = await createTenantId();
    const email = `owner-${userId.slice(0, 8)}@example.test`;

    const account = await repository.createAgencyAccount({
      userId,
      tenantId,
      email,
      displayName: "김담당",
      passwordHash: "hash-value",
      role: "owner",
    });
    expect(account).toEqual({ userId, tenantId, email, displayName: "김담당" });

    const credentials = await repository.findAgencyCredentialsByEmail(email);
    expect(credentials).toMatchObject({ userId, tenantId, passwordHash: "hash-value", userStatus: "active", profileStatus: "active" });

    expect(await repository.findAgencyCredentialsByEmail("nobody@example.test")).toBeNull();

    const session = await repository.createAgencySession({
      userId,
      tokenHash: "token-hash-value",
      expiresAt: "2026-10-30T00:00:00.000Z",
    });
    expect(session).toMatchObject({ userId, tenantId, email, displayName: "김담당", revokedAt: null });

    const found = await repository.findAgencySessionByTokenHash("token-hash-value");
    expect(found).toMatchObject({ sessionId: session.sessionId, userId, tenantId });

    await repository.revokeSession(session.sessionId, userId);
    const revoked = await repository.findAgencySessionByTokenHash("token-hash-value");
    expect(revoked?.revokedAt).not.toBeNull();
  });
}
