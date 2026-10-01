import { describe, expect, it } from "vitest";

import { demoState } from "@/features/demo/fixtures";

import { createAgencyOverviewModel } from "./overviewModel";

describe("createAgencyOverviewModel", () => {
  it("derives every metric from app data", () => {
    const model = createAgencyOverviewModel(demoState);
    expect(model.metrics.find((item) => item.id === "candidates")?.value).toBe(demoState.candidates.length);
    expect(model.metrics.find((item) => item.id === "favorites")?.value).toBe(demoState.favoriteTalentIds.length);
  });

  it("lists only candidates waiting on the team", () => {
    const model = createAgencyOverviewModel({
      ...demoState,
      candidates: demoState.candidates.map((candidate, index) => ({ ...candidate, stage: index === 0 ? "internal-review" : "discovered" })),
    });
    expect(model.attention).toHaveLength(1);
    expect(model.attention[0].stageLabel).toBe("내부 검토");
    expect(model.metrics.find((item) => item.id === "action")?.value).toBe(1);
  });

  it("shows the newest applicants first", () => {
    const model = createAgencyOverviewModel(demoState);
    const dates = model.newTalents.map((talent) => talent.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(model.newTalents.length).toBeLessThanOrEqual(4);
  });
});
