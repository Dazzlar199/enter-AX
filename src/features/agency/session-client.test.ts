import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgencySessionError, fetchAgencySession, loginAgency, logoutAgency } from "./session-client";

describe("agency session client", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("returns null when unauthenticated instead of throwing", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: { code: "UNAUTHENTICATED", message: "기획사 로그인이 필요합니다.", requestId: "req-1" } },
      { status: 401 },
    ));
    await expect(fetchAgencySession()).resolves.toBeNull();
  });

  it("logs in and returns the profile", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { profile: { email: "owner@example.test", displayName: "김담당", tenantId: "t-1", role: "owner" } },
      { status: 200 },
    ));
    const profile = await loginAgency("owner@example.test", "correct horse battery staple");
    expect(profile).toEqual({ email: "owner@example.test", displayName: "김담당", tenantId: "t-1", role: "owner" });
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe("include");
  });

  it("surfaces structured errors other than UNAUTHENTICATED", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: { code: "RATE_LIMITED", message: "요청이 너무 많습니다.", requestId: "req-2" } },
      { status: 429 },
    ));
    await expect(loginAgency("a@b.test", "password123")).rejects.toEqual(
      expect.objectContaining<Partial<AgencySessionError>>({ code: "RATE_LIMITED" }),
    );
  });

  it("logs out with no body expected on 204", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    await expect(logoutAgency()).resolves.toBeUndefined();
  });
});
