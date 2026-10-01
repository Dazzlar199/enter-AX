import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAgencySession: vi.fn(),
  executeServerNode: vi.fn(),
}));

vi.mock("@/server/container", () => ({
  getServerContainer: () => ({ handlers: { getAgencySession: mocks.getAgencySession } }),
}));

vi.mock("@/server/workflows/execute", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/workflows/execute")>();
  return { ...actual, executeServerNode: mocks.executeServerNode };
});

import { POST } from "./route";

function request() {
  return new Request("http://localhost:3000/api/v1/workflows/execute", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({ type: "ai.summary", params: {}, items: [{ id: "1" }] }),
  });
}

function sessionResponse(role: "owner" | "admin" | "member" | "viewer") {
  return Response.json({ profile: { email: "staff@example.com", displayName: "담당자", tenantId: "tenant-1", role } });
}

describe("workflow execution route authorization", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_MODE", "api");
    vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
    mocks.executeServerNode.mockResolvedValue([{ summary: "ok" }]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns the session error before executing a node", async () => {
    mocks.getAgencySession.mockResolvedValue(Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 }));

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.executeServerNode).not.toHaveBeenCalled();
  });

  it("prevents view-only staff from executing server steps", async () => {
    mocks.getAgencySession.mockResolvedValue(sessionResponse("viewer"));

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.executeServerNode).not.toHaveBeenCalled();
  });

  it("allows members to execute server steps", async () => {
    mocks.getAgencySession.mockResolvedValue(sessionResponse("member"));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.executeServerNode).toHaveBeenCalledOnce();
  });
});
