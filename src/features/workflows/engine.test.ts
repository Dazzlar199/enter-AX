import { describe, expect, it, vi } from "vitest";

import { emptyRun, executionOrder, resolveApproval, runWorkflow } from "./engine";
import type { WorkflowDefinition, WorkflowNode } from "./types";

const node = (id: string, type: WorkflowNode["type"]): WorkflowNode => ({ id, type, name: id, position: { x: 0, y: 0 }, params: {} });

const definition: WorkflowDefinition = {
  id: "wf",
  name: "test",
  updatedAt: "",
  nodes: [node("start", "trigger.manual"), node("fetch", "logic.fields"), node("gate", "human.approval"), node("act", "app.review")],
  edges: [
    { id: "e1", source: "start", target: "fetch" },
    { id: "e2", source: "fetch", target: "gate" },
    { id: "e3", source: "gate", target: "act" },
  ],
};

describe("workflow engine", () => {
  it("orders nodes topologically and rejects cycles", () => {
    expect(executionOrder(definition)).toEqual(["start", "fetch", "gate", "act"]);
    expect(() => executionOrder({ ...definition, edges: [...definition.edges, { id: "loop", source: "act", target: "start" }] })).toThrow("순환");
  });

  it("passes items along and pauses at the approval node", async () => {
    const execute = vi.fn(async (current: WorkflowNode, input: Record<string, unknown>[]) =>
      current.id === "start" ? [{ n: 1 }, { n: 2 }] : input.map((item) => ({ ...item, via: current.id })),
    );
    const state = await runWorkflow(definition, emptyRun(definition), execute, () => {});

    expect(state.status).toBe("waiting");
    expect(state.nodes.fetch.output).toEqual([{ n: 1, via: "fetch" }, { n: 2, via: "fetch" }]);
    expect(state.nodes.gate).toMatchObject({ status: "waiting", input: state.nodes.fetch.output });
    expect(state.nodes.act.status).toBe("idle");
    expect(execute).not.toHaveBeenCalledWith(expect.objectContaining({ id: "act" }), expect.anything());
  });

  it("continues after approval without re-running finished nodes", async () => {
    const execute = vi.fn(async (current: WorkflowNode, input: Record<string, unknown>[]) => (current.id === "start" ? [{ n: 1 }] : input));
    const paused = await runWorkflow(definition, emptyRun(definition), execute, () => {});
    execute.mockClear();

    const finished = await runWorkflow(definition, resolveApproval(paused, "gate", true), execute, () => {});

    expect(finished.status).toBe("success");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(finished.nodes.act.output).toEqual([{ n: 1 }]);
  });

  it("skips everything downstream of a rejection or an error", async () => {
    const execute = async (current: WorkflowNode) => {
      if (current.id === "fetch") throw new Error("boom");
      return [{}];
    };
    const failed = await runWorkflow(definition, emptyRun(definition), execute, () => {});
    expect(failed.status).toBe("error");
    expect(failed.nodes.fetch).toMatchObject({ status: "error", error: "boom" });
    expect(failed.nodes.gate.status).toBe("skipped");

    const ok = async () => [{}];
    const paused = await runWorkflow(definition, emptyRun(definition), ok, () => {});
    const rejected = await runWorkflow(definition, resolveApproval(paused, "gate", false), ok, () => {});
    expect(rejected.nodes.gate.status).toBe("rejected");
    expect(rejected.nodes.act.status).toBe("skipped");
  });
});
