import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiCommunityClient, CommunityClientError } from "./api-client";

describe("ApiCommunityClient", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("maps API categories and comments to the existing community model", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({
        items: [{
          id: "post-1",
          category: "success-story",
          title: "합격 후기",
          body: "본문",
          authorNickname: "루아",
          replyCount: 1,
          createdAt: "2026-09-18T00:00:00.000Z",
        }],
        nextCursor: null,
      }))
      .mockResolvedValueOnce(Response.json({
        items: [{ id: "comment-1", postId: "post-1", body: "축하해요", authorNickname: "민", createdAt: "2026-09-18T01:00:00.000Z" }],
        nextCursor: null,
      }));

    const posts = await new ApiCommunityClient().listPosts();

    expect(posts[0]).toMatchObject({ category: "합격후기", authorName: "루아", replies: [{ authorName: "민" }] });
  });

  it("does not send client-controlled author fields", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({
      post: { id: "post-1", category: "question", title: "질문", body: "본문", authorNickname: "서버사용자", replyCount: 0, createdAt: "2026-09-18T00:00:00.000Z" },
    }, { status: 201 }));

    await new ApiCommunityClient().createPost({ category: "질문", title: "질문", body: "본문" });

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ category: "question", title: "질문", body: "본문" });
    expect(init.credentials).toBe("include");
  });

  it("surfaces the structured server error", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({
      error: { code: "CONFLICT", message: "이미 사용 중입니다.", requestId: "req-1" },
    }, { status: 409 }));

    await expect(new ApiCommunityClient().createSession("루아")).rejects.toEqual(
      expect.objectContaining<Partial<CommunityClientError>>({ code: "CONFLICT", requestId: "req-1" }),
    );
  });
});
