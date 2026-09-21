export type WorkflowNodeKind = "input" | "process" | "approval" | "output";
export type WorkflowNodeState = "active" | "waiting" | "complete" | "planned";

export type WorkflowNode = {
  id: string;
  column: "inputs" | "services" | "outputs";
  kind: WorkflowNodeKind;
  state: WorkflowNodeState;
  label: string;
  detail: string;
  href?: string;
  badge?: string;
};

export type WorkflowConnection = { from: string; to: string };
export type OverviewMetric = { id: string; label: string; value: number | string; href: string };
export type OverviewActivity = { id: string; label: string; meta: string; state: WorkflowNodeState };

export type AgencyOverviewModel = {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  metrics: OverviewMetric[];
  recentRuns: OverviewActivity[];
  reviewQueue: OverviewActivity[];
};
