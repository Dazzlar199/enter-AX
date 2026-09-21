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

  it("excludes transitioned jobs from the active review queue", () => {
    const approvalJob = demoState.agentJobs.find((job) => job.status === "approval-required");
    if (!approvalJob) throw new Error("Expected an approval-required fixture job");

    const model = createAgencyOverviewModel({
      ...demoState,
      agentJobs: [{ ...approvalJob, status: "completed" as const, requiresApproval: true }],
    });

    expect(model.reviewQueue.some((item) => item.id === approvalJob.id)).toBe(false);
  });

  it("exposes the required workflow chains and planned integration text", () => {
    const model = createAgencyOverviewModel(demoState);

    expect(model.connections).toEqual(
      expect.arrayContaining([
        { from: "auditions", to: "screening" },
        { from: "screening", to: "approval" },
        { from: "approval", to: "pipeline" },
        { from: "demo-audio", to: "approval" },
        { from: "approval", to: "review-brief" },
        { from: "source-video", to: "content" },
        { from: "content", to: "approval" },
        { from: "approval", to: "channels" },
      ]),
    );
    expect(model.metrics.find((item) => item.id === "integrations")?.value).toBe("연동 예정");
  });
});
