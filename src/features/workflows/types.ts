import { z } from "zod";

export const builtInNodeTypes = [
  "trigger.manual",
  "trigger.googleforms",
  "app.talents",
  "app.review",
  "app.post",
  "http.request",
  "logic.filter",
  "logic.fields",
  "ai.summary",
  "human.approval",
  "slack.message",
  "kakaotalk.alimtalk",
  "gmail.send",
  "notion.sync",
  "sheets.append",
  "gdrive.upload",
  "youtube.upload",
  "instagram.post",
  "tiktok.upload",
  "openai.analyze",
  "ai.dance_pose",
  "media.ffmpeg_cut",
  "calendar.schedule",
  "ar.duplicate_audio",
  "audition.score_filter",
] as const;

export const nodeTypes = builtInNodeTypes;

export type BuiltInNodeType = (typeof builtInNodeTypes)[number];
export type WorkflowNodeType = BuiltInNodeType | (string & {});

/** One unit of data flowing between nodes, like an n8n item. */
export type WorkflowItem = Record<string, unknown>;

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1).max(60),
  position: z.object({ x: z.number(), y: z.number() }),
  params: z.record(z.string(), z.string()),
});

export const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});

export const workflowDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  nodes: z.array(workflowNodeSchema).max(80),
  edges: z.array(workflowEdgeSchema).max(200),
  updatedAt: z.string(),
});

export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

export type NodeRunStatus = "idle" | "running" | "success" | "error" | "waiting" | "rejected" | "skipped";

export type NodeRunState = {
  status: NodeRunStatus;
  input?: WorkflowItem[];
  output?: WorkflowItem[];
  error?: string;
  startedAt?: number;
  finishedAt?: number;
};

export type RunState = {
  status: "idle" | "running" | "waiting" | "success" | "error";
  nodes: Record<string, NodeRunState>;
};
