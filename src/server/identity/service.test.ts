import { describe, expect, it } from "vitest";

import { MemoryPlatformRepository } from "@/server/testing/memory-platform";

import { IdentityService } from "./service";
import { hashSessionToken } from "./token";

describe("IdentityService", () => {
  it("creates a thirty-day session while persisting only the token hash", async () => {
    const repository = new MemoryPlatformRepository(() => "2026-09-18T00:00:00.000Z");
    const service = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-18T00:00:00.000Z"),
      createToken: () => "raw-session-token",
      createId: () => "00000000-0000-4000-8000-000000000099",
    });

    const result = await service.createCommunitySession({ nickname: "루아", requestId: "req-1" });

    expect(result.token).toBe("raw-session-token");
    expect(result.session.expiresAt).toBe("2026-10-18T00:00:00.000Z");
    expect(repository.sessionTokenHashes()).toEqual([hashSessionToken("raw-session-token")]);
    expect(JSON.stringify(repository.auditEvents)).not.toContain("raw-session-token");
    expect(JSON.stringify(repository.auditEvents)).not.toContain("루아");
  });

  it("rejects expired, revoked, and inactive sessions", async () => {
    const now = new Date("2026-10-20T00:00:00.000Z");
    const repository = new MemoryPlatformRepository(() => now.toISOString());
    const service = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => now,
      createToken: () => "expired-token",
      createId: () => "00000000-0000-4000-8000-000000000098",
    });
    await repository.createCommunityIdentity({
      userId: "00000000-0000-4000-8000-000000000098",
      nickname: "만료사용자",
      tokenHash: hashSessionToken("expired-token"),
      expiresAt: "2026-10-19T00:00:00.000Z",
    });

    expect(await service.resolveCommunitySession("expired-token")).toBeNull();
    repository.setIdentityStatus("00000000-0000-4000-8000-000000000098", { userStatus: "suspended" });
    expect(await service.resolveCommunitySession("expired-token")).toBeNull();
  });

  it("revokes the actor's session and writes an audit event", async () => {
    const repository = new MemoryPlatformRepository(() => "2026-09-18T00:00:00.000Z");
    const service = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-18T00:00:00.000Z"),
      createToken: () => "revoke-token",
      createId: () => "00000000-0000-4000-8000-000000000097",
    });
    const created = await service.createCommunitySession({ nickname: "해온", requestId: "req-2" });

    await service.revokeCommunitySession(created.session, "req-3");

    expect(await service.resolveCommunitySession("revoke-token")).toBeNull();
    expect(repository.auditEvents.at(-1)?.action).toBe("community.session.revoked");
  });
});

describe("IdentityService — agency accounts", () => {
  it("creates an agency account and authenticates it with the right password", async () => {
    const repository = new MemoryPlatformRepository(() => "2026-09-30T00:00:00.000Z");
    const service = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-30T00:00:00.000Z"),
      createToken: () => "agency-raw-token",
      createId: () => "00000000-0000-4000-8000-000000000201",
    });

    const account = await service.createAgencyAccount({
      tenantId: "00000000-0000-4000-8000-000000000010",
      email: "owner@example.test",
      displayName: "김담당",
      password: "correct horse battery staple",
      role: "owner",
      requestId: "req-create",
    });
    expect(account.email).toBe("owner@example.test");
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "agency.account.created" });

    const authenticated = await service.authenticateAgency({
      email: "owner@example.test",
      password: "correct horse battery staple",
      requestId: "req-login",
    });
    expect(authenticated?.token).toBe("agency-raw-token");
    expect(authenticated?.session).toMatchObject({ email: "owner@example.test", tenantId: "00000000-0000-4000-8000-000000000010" });
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "agency.session.created" });
  });

  it("rejects the wrong password and audits the failure without leaking it", async () => {
    const repository = new MemoryPlatformRepository(() => "2026-09-30T00:00:00.000Z");
    const service = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-30T00:00:00.000Z"),
      createId: () => "00000000-0000-4000-8000-000000000202",
    });
    await service.createAgencyAccount({
      tenantId: "00000000-0000-4000-8000-000000000010",
      email: "owner2@example.test",
      displayName: "박담당",
      password: "correct horse battery staple",
      role: "owner",
      requestId: "req-create-2",
    });

    const result = await service.authenticateAgency({
      email: "owner2@example.test",
      password: "wrong password",
      requestId: "req-login-fail",
    });

    expect(result).toBeNull();
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "agency.session.login_failed" });
    expect(JSON.stringify(repository.auditEvents)).not.toContain("wrong password");
  });

  it("resolves and revokes an agency session", async () => {
    const repository = new MemoryPlatformRepository(() => "2026-09-30T00:00:00.000Z");
    const service = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-30T00:00:00.000Z"),
      createToken: () => "agency-session-token",
      createId: () => "00000000-0000-4000-8000-000000000203",
    });
    await service.createAgencyAccount({
      tenantId: "00000000-0000-4000-8000-000000000010",
      email: "owner3@example.test",
      displayName: "이담당",
      password: "correct horse battery staple",
      role: "owner",
      requestId: "req-create-3",
    });
    const authenticated = await service.authenticateAgency({
      email: "owner3@example.test",
      password: "correct horse battery staple",
      requestId: "req-login-3",
    });

    expect(await service.resolveAgencySession("agency-session-token")).toMatchObject({ email: "owner3@example.test" });

    await service.revokeAgencySession(authenticated!.session, "req-revoke-3");

    expect(await service.resolveAgencySession("agency-session-token")).toBeNull();
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "agency.session.revoked" });
  });
});
