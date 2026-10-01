import { expect, it } from "vitest";

import type { AuditRepository } from "@/server/audit/repository";
import type { IdentityRepository } from "@/server/identity/repository";
import type { TenancyRepository } from "@/server/tenancy/repository";

import type { CommunityRepository } from "./repository";

type PlatformRepository = CommunityRepository & IdentityRepository & TenancyRepository & AuditRepository;

export function communityRepositoryContract(name: string, factory: () => Promise<PlatformRepository>) {
  it(`${name}: creates, filters, paginates, comments, and reports without exposing user IDs`, async () => {
    const repository = await factory();
    const suffix = crypto.randomUUID().slice(0, 8);
    const userId = crypto.randomUUID();
    await repository.createCommunityIdentity({
      userId,
      nickname: `user-${suffix}`,
      tokenHash: `hash-${crypto.randomUUID()}`,
      expiresAt: "2026-10-18T00:00:00.000Z",
    });

    const first = await repository.createPost({
      authorUserId: userId,
      category: "question",
      title: "첫 번째 질문",
      body: "첫 번째 본문",
    });
    await repository.createPost({
      authorUserId: userId,
      category: "free",
      title: "두 번째 자유글",
      body: "두 번째 본문",
    });
    const alert = await repository.createPost({
      authorUserId: userId,
      category: "scam-alert",
      title: "사칭 제보",
      body: "촬영비를 먼저 요구했어요",
    });
    expect(alert.category).toBe("scam-alert");
    const filtered = await repository.listPosts({ category: "question", limit: 1 });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]).toMatchObject({ id: first.id, authorNickname: `user-${suffix}` });
    expect(filtered.items[0]).not.toHaveProperty("authorUserId");

    const comment = await repository.createComment({ authorUserId: userId, postId: first.id, body: "답변" });
    expect((await repository.listComments({ postId: first.id, limit: 20 })).items[0]).toMatchObject({ id: comment.id });

    await repository.createReport({
      reporterUserId: userId,
      targetType: "post",
      targetId: first.id,
      reason: "검토가 필요한 신고",
    });
    await expect(repository.createReport({
      reporterUserId: userId,
      targetType: "post",
      targetId: first.id,
      reason: "중복 신고",
    })).rejects.toMatchObject({ code: "CONFLICT" });
  });
}
