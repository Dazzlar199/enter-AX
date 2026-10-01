import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CommunityClient } from "./client";
import { useCommunity } from "./useCommunity";

describe("useCommunity", () => {
  it("loads viewer and posts then updates after a write", async () => {
    const client: CommunityClient = {
      getSession: vi.fn().mockResolvedValue({ nickname: "루아" }),
      createSession: vi.fn(),
      listPosts: vi.fn().mockResolvedValue([]),
      createPost: vi.fn().mockResolvedValue({ id: "post-1", authorName: "루아", category: "질문", title: "질문", body: "본문", createdAt: "2026-09-18T00:00:00.000Z", replies: [] }),
      createComment: vi.fn(),
      report: vi.fn(),
    };
    const { result } = renderHook(() => useCommunity(client));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(() => result.current.createPost({ category: "질문", title: "질문", body: "본문" }));

    expect(result.current.posts).toHaveLength(1);
    expect(result.current.viewer?.nickname).toBe("루아");
  });
});
