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

  describe("branching", () => {
    const branching = (ifParams: Record<string, string>): WorkflowDefinition => ({
      id: "wf-if",
      name: "branch",
      updatedAt: "",
      nodes: [
        node("start", "trigger.manual"),
        { ...node("split", "logic.if"), params: ifParams },
        node("yes", "logic.fields"),
        node("no", "logic.fields"),
        node("join", "logic.merge"),
      ],
      edges: [
        { id: "e1", source: "start", target: "split" },
        { id: "e2", source: "split", target: "yes", sourceHandle: "true" },
        { id: "e3", source: "split", target: "no", sourceHandle: "false" },
        { id: "e4", source: "yes", target: "join" },
        { id: "e5", source: "no", target: "join" },
      ],
    });
    const run = (def: WorkflowDefinition, items: Record<string, unknown>[]) =>
      runWorkflow(def, emptyRun(def), async (current, input) => (current.id === "start" ? items : input.map((item) => ({ ...item, via: current.id }))), () => {});

    it("routes items down the matching handle and merges both sides", async () => {
      const state = await run(branching({ field: "분야", operator: "contains", value: "보컬" }), [{ 분야: "보컬" }, { 분야: "댄스" }]);
      expect(state.nodes.yes.output).toEqual([{ 분야: "보컬", via: "yes" }]);
      expect(state.nodes.no.output).toEqual([{ 분야: "댄스", via: "no" }]);
      expect(state.nodes.join.output).toHaveLength(2);
      expect(state.status).toBe("success");
    });

    it("skips an empty branch and still lets the merge node finish", async () => {
      const state = await run(branching({ field: "분야", operator: "contains", value: "보컬" }), [{ 분야: "보컬" }]);
      expect(state.nodes.no.status).toBe("skipped");
      expect(state.nodes.yes.status).toBe("success");
      expect(state.nodes.join).toMatchObject({ status: "success", output: [{ 분야: "보컬", via: "join" }] });
    });

    it("skips downstream of a non-merge node when its branch is skipped", async () => {
      const def = branching({ field: "분야", operator: "contains", value: "보컬" });
      def.edges = def.edges.filter((edge) => edge.id !== "e5");
      def.nodes.push(node("after", "logic.fields"));
      def.edges.push({ id: "e6", source: "no", target: "after" });
      const state = await run(def, [{ 분야: "보컬" }]);
      expect(state.nodes.after.status).toBe("skipped");
    });
  });

  it("sends switch items to their case handle and skips unused cases", async () => {
    const def: WorkflowDefinition = {
      id: "wf-switch",
      name: "switch",
      updatedAt: "",
      nodes: [
        node("start", "trigger.manual"),
        { ...node("route", "logic.switch"), params: { field: "분야", operator: "equals", case1: "보컬", case2: "댄스" } },
        node("a", "logic.fields"),
        node("b", "logic.fields"),
        node("rest", "logic.fields"),
      ],
      edges: [
        { id: "e1", source: "start", target: "route" },
        { id: "e2", source: "route", target: "a", sourceHandle: "case1" },
        { id: "e3", source: "route", target: "b", sourceHandle: "case2" },
        { id: "e4", source: "route", target: "rest", sourceHandle: "other" },
      ],
    };
    const state = await runWorkflow(def, emptyRun(def), async (current, input) => (current.id === "start" ? [{ 분야: "보컬" }, { 분야: "배우" }] : input), () => {});
    expect(state.nodes.a.output).toEqual([{ 분야: "보컬" }]);
    expect(state.nodes.b.status).toBe("skipped");
    expect(state.nodes.rest.output).toEqual([{ 분야: "배우" }]);
  });
});
