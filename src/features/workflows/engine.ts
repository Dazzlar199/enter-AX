import type { NodeRunState, RunState, WorkflowDefinition, WorkflowItem, WorkflowNode } from "./types";

export type NodeExecutor = (node: WorkflowNode, input: WorkflowItem[]) => Promise<WorkflowItem[]>;

export class WorkflowGraphError extends Error {}

/** Topological order of the graph (Kahn). Throws when the graph has a cycle. */
export function executionOrder(definition: WorkflowDefinition): string[] {
  const indegree = new Map(definition.nodes.map((node) => [node.id, 0]));
  const children = new Map<string, string[]>(definition.nodes.map((node) => [node.id, []]));
  for (const edge of definition.edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    children.get(edge.source)?.push(edge.target);
  }
  const queue = definition.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const child of children.get(id) ?? []) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) queue.push(child);
    }
  }
  if (order.length !== definition.nodes.length) throw new WorkflowGraphError("연결이 순환하고 있습니다. 순환 연결을 끊어 주세요.");
  return order;
}

export function emptyRun(definition: WorkflowDefinition): RunState {
  return { status: "idle", nodes: Object.fromEntries(definition.nodes.map((node) => [node.id, { status: "idle" as const }])) };
}

function summarize(nodes: Record<string, NodeRunState>): RunState["status"] {
  const states = Object.values(nodes).map((node) => node.status);
  if (states.includes("error")) return "error";
  if (states.includes("waiting")) return "waiting";
  if (states.includes("running")) return "running";
  return "success";
}

/**
 * Runs every node whose parents have all succeeded, in graph order.
 * Nodes that already succeeded are kept, so calling this again after an approval resumes the run.
 * Approval nodes stop the run in `waiting` until {@link resolveApproval} is called.
 */
export async function runWorkflow(
  definition: WorkflowDefinition,
  previous: RunState,
  execute: NodeExecutor,
  onUpdate: (state: RunState) => void,
): Promise<RunState> {
  const order = executionOrder(definition);
  const byId = new Map(definition.nodes.map((node) => [node.id, node]));
  const parents = new Map<string, string[]>(definition.nodes.map((node) => [node.id, []]));
  for (const edge of definition.edges) parents.get(edge.target)?.push(edge.source);

  let nodes: Record<string, NodeRunState> = { ...previous.nodes };
  const commit = (id: string, next: NodeRunState, status: RunState["status"] = "running") => {
    nodes = { ...nodes, [id]: next };
    onUpdate({ status, nodes });
  };

  for (const id of order) {
    const node = byId.get(id)!;
    const current = nodes[id] ?? { status: "idle" };
    if (current.status === "success" || current.status === "waiting" || current.status === "rejected") continue;

    const parentStates = (parents.get(id) ?? []).map((parentId) => nodes[parentId]?.status ?? "idle");
    if (parentStates.some((status) => status === "error" || status === "rejected" || status === "skipped")) {
      commit(id, { status: "skipped" });
      continue;
    }
    if (parentStates.some((status) => status !== "success")) continue;

    const input = (parents.get(id) ?? []).flatMap((parentId) => nodes[parentId]?.output ?? []);

    if (node.type === "human.approval") {
      commit(id, { status: "waiting", input });
      continue;
    }

    const startedAt = Date.now();
    commit(id, { status: "running", input, startedAt });
    try {
      const output = await execute(node, input);
      commit(id, { status: "success", input, output, startedAt, finishedAt: Date.now() });
    } catch (reason) {
      const error = reason instanceof Error ? reason.message : "이 단계를 실행하지 못했습니다.";
      commit(id, { status: "error", input, error, startedAt, finishedAt: Date.now() });
    }
  }

  const finalState: RunState = { status: summarize(nodes), nodes };
  onUpdate(finalState);
  return finalState;
}

/** Records the approver's decision; call {@link runWorkflow} afterwards to continue. */
export function resolveApproval(state: RunState, nodeId: string, approved: boolean): RunState {
  const node = state.nodes[nodeId];
  if (!node || node.status !== "waiting") return state;
  const next: NodeRunState = approved
    ? { ...node, status: "success", output: node.input ?? [], finishedAt: Date.now() }
    : { ...node, status: "rejected", finishedAt: Date.now() };
  return { status: "running", nodes: { ...state.nodes, [nodeId]: next } };
}
