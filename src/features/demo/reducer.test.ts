import { describe, expect, it } from "vitest";

import { demoState } from "./fixtures";
import { demoReducer } from "./reducer";

describe("demoReducer", () => {
  it("creates an offer and moves the candidate to offer-sent", () => {
    const next = demoReducer(demoState, {
      type: "offer/created",
      payload: {
        talentId: "talent-lua",
        title: "비공개 추가 오디션 제안",
        purpose: "신인 걸그룹 보컬·퍼포먼스 확인",
        field: "idol",
        dueAt: "2026-09-30T09:00:00.000Z",
        department: "신인개발팀",
        message: "추가 비공개 오디션을 제안드립니다.",
      },
    });

    expect(next.offers.at(-1)?.status).toBe("sent");
    expect(next.candidates.find((item) => item.talentId === "talent-lua")?.stage).toBe("offer-sent");
  });

  it("does not create a duplicate active offer", () => {
    const next = demoReducer(demoState, {
      type: "offer/created",
      payload: {
        talentId: "talent-min",
        title: "중복 제안",
        purpose: "중복 여부 확인",
        field: "idol",
        dueAt: "2026-10-01T09:00:00.000Z",
        department: "신인개발팀",
        message: "중복 요청입니다.",
      },
    });

    expect(next.offers).toHaveLength(demoState.offers.length);
  });

  it("moves an accepted offer to the accepted pipeline stage", () => {
    const next = demoReducer(demoState, {
      type: "offer/responded",
      payload: { offerId: "offer-1", status: "accepted" },
    });

    expect(next.candidates.find((item) => item.talentId === "talent-lua")?.stage).toBe("accepted");
  });

  it("keeps public visibility separate from contact consent", () => {
    const next = demoReducer(demoState, {
      type: "talent/preferences-updated",
      payload: {
        talentId: "talent-lua",
        preferences: {
          visibility: "public",
          openToOffers: false,
          marketingConsent: false,
        },
      },
    });
    const talent = next.talents.find((item) => item.id === "talent-lua");

    expect(talent?.visibility).toBe("public");
    expect(talent?.openToOffers).toBe(false);
  });

  it("resets all changes to a fresh copy of the fixtures", () => {
    const changed = demoReducer(demoState, {
      type: "candidate/moved",
      payload: { candidateId: "candidate-1", stage: "completed" },
    });
    const reset = demoReducer(changed, { type: "demo/reset" });

    expect(reset).toEqual(demoState);
    expect(reset).not.toBe(demoState);
  });

  it("adds and removes a community like without going below zero", () => {
    const id = demoState.communityPosts[0].id;
    const liked = demoReducer(demoState, { type: "community/like-toggled", payload: { postId: id, liked: true } });
    expect(liked.communityPosts[0].likes).toBe((demoState.communityPosts[0].likes ?? 0) + 1);
    const none = demoReducer({ ...demoState, communityPosts: [{ ...demoState.communityPosts[0], likes: 0 }] }, { type: "community/like-toggled", payload: { postId: id, liked: false } });
    expect(none.communityPosts[0].likes).toBe(0);
  });
});
