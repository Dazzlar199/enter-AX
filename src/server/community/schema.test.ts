import { describe, expect, it } from "vitest";

import {
  createCommentSchema,
  createPostSchema,
  createProfileSchema,
  listPostsQuerySchema,
} from "./schema";

describe("community input schemas", () => {
  it("accepts a trimmed Korean nickname", () => {
    expect(createProfileSchema.parse({ nickname: " 루아 " })).toEqual({ nickname: "루아" });
  });

  it("rejects a one-character nickname", () => {
    expect(createProfileSchema.safeParse({ nickname: "a" }).success).toBe(false);
  });

  it("rejects unknown post categories and long titles", () => {
    expect(createPostSchema.safeParse({ category: "unknown", title: "제목", body: "본문" }).success).toBe(false);
    expect(
      createPostSchema.safeParse({ category: "question", title: "x".repeat(121), body: "본문" }).success,
    ).toBe(false);
  });

  it("rejects empty comments", () => {
    expect(createCommentSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("caps list page size at fifty", () => {
    expect(listPostsQuerySchema.parse({ limit: "999" }).limit).toBe(50);
  });

  it("rejects client-controlled author fields", () => {
    expect(
      createPostSchema.safeParse({
        category: "question",
        title: "질문 제목",
        body: "질문 본문",
        authorName: "위조 사용자",
      }).success,
    ).toBe(false);
  });
});
