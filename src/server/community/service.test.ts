import { describe, expect, it } from "vitest";

import { MemoryPlatformRepository } from "@/server/testing/memory-platform";

import { CommunityService } from "./service";

function actor(userId = "00000000-0000-4000-8000-000000000001") {
  return {
    sessionId: "00000000-0000-4000-8000-000000000011",
    userId,
    nickname: "루아",
    expiresAt: "2026-10-18T00:00:00.000Z",
    revokedAt: null,
    userStatus: "active" as const,
    profileStatus: "active" as const,
  };
}

describe("CommunityService", () => {
  it("uses the authenticated actor as author and filters the feed", async () => {
    let current = "2026-09-18T00:00:00.000Z";
    const repository = new MemoryPlatformRepository(() => current);
    repository.seedViewer(actor());
    const service = new CommunityService(repository, repository);

    await service.createPost(actor(), { category: "question", title: "질문 제목", body: "질문 본문" }, "req-1");
    current = "2026-09-18T01:00:00.000Z";
    await service.createPost(actor(), { category: "free", title: "자유 제목", body: "자유 본문" }, "req-2");

    const page = await service.listPosts({ category: "question", limit: 20 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ authorNickname: "루아", category: "question" });
    expect(page.items[0]).not.toHaveProperty("authorUserId");
  });

  it("requires a session for mutations", async () => {
    const repository = new MemoryPlatformRepository();
    const service = new CommunityService(repository, repository);

    await expect(
      service.createPost(null, { category: "free", title: "제목입니다", body: "본문입니다" }, "req-1"),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("creates comments only for a published post", async () => {
    const repository = new MemoryPlatformRepository();
    repository.seedViewer(actor());
    const service = new CommunityService(repository, repository);

    await expect(
      service.createComment(
        actor(),
        "00000000-0000-4000-8000-000000000088",
        { body: "댓글" },
        "req-1",
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("prevents duplicate open reports and excludes content from audit metadata", async () => {
    const repository = new MemoryPlatformRepository();
    repository.seedViewer(actor());
    const service = new CommunityService(repository, repository);
    const post = await service.createPost(
      actor(),
      { category: "information", title: "정보 제목", body: "민감한 본문" },
      "req-1",
    );

    await service.report(actor(), { targetType: "post", targetId: post.id, reason: "신고 사유" }, "req-2");
    await expect(
      service.report(actor(), { targetType: "post", targetId: post.id, reason: "다른 사유" }, "req-3"),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const serializedAudit = JSON.stringify(repository.auditEvents);
    expect(serializedAudit).not.toContain("민감한 본문");
    expect(serializedAudit).not.toContain("신고 사유");
  });

  it("masks phone numbers and chat invites before storing posts and comments", async () => {
    const repository = new MemoryPlatformRepository();
    repository.seedViewer(actor());
    const service = new CommunityService(repository, repository);

    const post = await service.createPost(
      actor(),
      { category: "scam-alert", title: "사칭 제보", body: "010-1234-5678 로 연락 왔고 https://open.kakao.com/o/x 초대함" },
      "req-1",
    );
    expect(post.body).toBe("010-****-**** 로 연락 왔고 [외부 채팅 링크 삭제됨] 초대함");

    const comment = await service.createComment(actor(), post.id, { body: "저도 01099998888 에서 왔어요" }, "req-2");
    expect(comment.body).toBe("저도 010-****-**** 에서 왔어요");
    expect(JSON.stringify(repository.auditEvents)).not.toContain("1234");
  });
});
