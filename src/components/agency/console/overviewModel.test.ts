import { describe, expect, it } from "vitest";
import { demoState } from "@/features/demo/fixtures";
import { createAgencyOverviewModel } from "./overviewModel";

describe("createAgencyOverviewModel", () => {
  it("derives operational metrics from demo fixtures", () => {
    const model = createAgencyOverviewModel(demoState);

    expect(model.metrics.find((item) => item.id === "candidates")?.value).toBe(demoState.candidates.length);
    expect(model.metrics.find((item) => item.id === "approvals")?.value).toBe(
      demoState.agentJobs.filter((job) => job.status === "approval-required").length,
    );
  });

  it("keeps consequential automation behind a human approval node", () => {
    const model = createAgencyOverviewModel(demoState);

    expect(model.nodes.some((node) => node.kind === "approval" && node.label === "담당자 승인")).toBe(true);
    expect(model.nodes.some((node) => /자동 합격|외모 점수/.test(node.label))).toBe(false);
  });
});
