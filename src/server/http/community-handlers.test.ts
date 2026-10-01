import { beforeEach, describe, expect, it } from "vitest";

import { CommunityService } from "@/server/community/service";
import { IdentityService } from "@/server/identity/service";
import { MemoryRateLimiter } from "@/server/shared/rate-limit";
import { MemoryPlatformRepository } from "@/server/testing/memory-platform";

import { createCommunityHandlers } from "./community-handlers";

const origin = "https://enter-ax.test";

function request(path: string, init?: RequestInit) {
  return new Request(`${origin}${path}`, init);
}

describe("community HTTP handlers", () => {
  let repository: MemoryPlatformRepository;
  let handlers: ReturnType<typeof createCommunityHandlers>;

  beforeEach(() => {
    repository = new MemoryPlatformRepository(() => "2026-09-18T00:00:00.000Z");
    const identity = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-18T00:00:00.000Z"),
      createToken: () => "raw-cookie-token",
      createId: () => "00000000-0000-4000-8000-000000000001",
    });
    handlers = createCommunityHandlers({
      identity,
      community: new CommunityService(repository, repository),
      limiter: new MemoryRateLimiter(() => 1_000),
      appOrigin: origin,
      secureCookies: true,
    });
  });

  it("creates a pseudonymous session with a secure opaque cookie", async () => {
    const response = await handlers.postSession(request("/api/v1/community/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin, "x-forwarded-for": "203.0.113.1" },
      body: JSON.stringify({ nickname: "루아" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ profile: { nickname: "루아" } });
    expect(JSON.stringify(body)).not.toContain("raw-cookie-token");
    expect(response.headers.get("set-cookie")).toContain("enter_ax_community_session=raw-cookie-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=2592000");
  });

  it("returns the documented authentication error without a session", async () => {
    const response = await handlers.getSession(request("/api/v1/community/session", {
      headers: { "x-request-id": "req-session" },
    }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "커뮤니티 로그인이 필요합니다.",
        requestId: "req-session",
      },
    });
  });

  it("rejects client-controlled author identity", async () => {
    await handlers.postSession(request("/api/v1/community/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ nickname: "루아" }),
    }));
    const response = await handlers.postPost(request("/api/v1/community/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        cookie: "enter_ax_community_session=raw-cookie-token",
        "x-request-id": "req-post",
      },
      body: JSON.stringify({ category: "question", title: "질문 제목", body: "질문 본문", authorName: "위조" }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_FAILED", requestId: "req-post" } });
  });

  it("creates and lists posts and comments with the session author", async () => {
    await handlers.postSession(request("/api/v1/community/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ nickname: "루아" }),
    }));
    const authHeaders = {
      "content-type": "application/json",
      origin,
      cookie: "enter_ax_community_session=raw-cookie-token",
    };
    const postResponse = await handlers.postPost(request("/api/v1/community/posts", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ category: "question", title: "질문 제목", body: "질문 본문" }),
    }));
    const { post } = await postResponse.json();
    const commentResponse = await handlers.postComment(request(`/api/v1/community/posts/${post.id}/comments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ body: "답변입니다" }),
    }), post.id);
    const listResponse = await handlers.getPosts(request("/api/v1/community/posts?category=question"));

    expect(postResponse.status).toBe(201);
    expect(commentResponse.status).toBe(201);
    expect(await listResponse.json()).toMatchObject({ items: [{ authorNickname: "루아", replyCount: 1 }] });
  });

  it("rejects a duplicate report with conflict", async () => {
    await handlers.postSession(request("/api/v1/community/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ nickname: "루아" }),
    }));
    const headers = { "content-type": "application/json", origin, cookie: "enter_ax_community_session=raw-cookie-token" };
    const postResponse = await handlers.postPost(request("/api/v1/community/posts", {
      method: "POST",
      headers,
      body: JSON.stringify({ category: "free", title: "게시글 제목", body: "게시글 본문" }),
    }));
    const { post } = await postResponse.json();
    const reportRequest = () => request("/api/v1/community/reports", {
      method: "POST",
      headers,
      body: JSON.stringify({ targetType: "post", targetId: post.id, reason: "신고 사유" }),
    });

    expect((await handlers.postReport(reportRequest())).status).toBe(201);
    expect((await handlers.postReport(reportRequest())).status).toBe(409);
  });
});
