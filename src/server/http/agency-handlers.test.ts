import { beforeEach, describe, expect, it } from "vitest";

import { IdentityService } from "@/server/identity/service";
import { MemoryRateLimiter } from "@/server/shared/rate-limit";
import { TenancyService } from "@/server/tenancy/service";
import { MemoryPlatformRepository } from "@/server/testing/memory-platform";

import { createAgencyHandlers } from "./agency-handlers";

const origin = "https://enter-ax.test";
const tenantId = "00000000-0000-4000-8000-000000000010";

function request(path: string, init?: RequestInit) {
  return new Request(`${origin}${path}`, init);
}

describe("agency HTTP handlers", () => {
  let repository: MemoryPlatformRepository;
  let handlers: ReturnType<typeof createAgencyHandlers>;

  beforeEach(async () => {
    repository = new MemoryPlatformRepository(() => "2026-09-30T00:00:00.000Z");
    const identity = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-30T00:00:00.000Z"),
      createToken: () => "agency-cookie-token",
      createId: () => "00000000-0000-4000-8000-000000000301",
    });
    handlers = createAgencyHandlers({
      identity,
      tenancy: new TenancyService(repository, repository),
      limiter: new MemoryRateLimiter(() => 1_000),
      appOrigin: origin,
      secureCookies: true,
    });
    await identity.createAgencyAccount({
      tenantId,
      email: "owner@example.test",
      displayName: "김담당",
      password: "correct horse battery staple",
      role: "owner",
      requestId: "req-seed",
    });
  });

  it("logs in with a secure cookie and returns the role", async () => {
    const response = await handlers.postAgencySession(request("/api/v1/agency/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin, "x-forwarded-for": "203.0.113.1" },
      body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery staple" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ profile: { email: "owner@example.test", displayName: "김담당", role: "owner", tenantId } });
    expect(response.headers.get("set-cookie")).toContain("enter_ax_agency_session=agency-cookie-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("rejects the wrong password without leaking whether the email exists", async () => {
    const response = await handlers.postAgencySession(request("/api/v1/agency/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email: "owner@example.test", password: "totally wrong password" }),
    }));
    expect(response.status).toBe(401);
  });

  it("returns 401 for getSession without a cookie", async () => {
    const response = await handlers.getAgencySession(request("/api/v1/agency/session", { headers: { "x-request-id": "req-x" } }));
    expect(response.status).toBe(401);
  });

  it("returns 403 and audits when the membership has been revoked", async () => {
    const login = await handlers.postAgencySession(request("/api/v1/agency/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery staple" }),
    }));
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    repository.setMembershipStatus(tenantId, "00000000-0000-4000-8000-000000000301", "suspended");

    const response = await handlers.getAgencySession(request("/api/v1/agency/session", {
      headers: { cookie, "x-request-id": "req-forbidden" },
    }));

    expect(response.status).toBe(403);
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "authorization.denied" });
  });

  it("logs out and clears the cookie", async () => {
    const login = await handlers.postAgencySession(request("/api/v1/agency/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery staple" }),
    }));
    const cookie = login.headers.get("set-cookie")!.split(";")[0];

    const response = await handlers.deleteAgencySession(request("/api/v1/agency/session", {
      method: "DELETE",
      headers: { origin, cookie },
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
