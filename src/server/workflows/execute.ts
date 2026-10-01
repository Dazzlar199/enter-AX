import { z } from "zod";

import { analyzePlanningDocument } from "@/lib/documents/analyze";
import { readPath, renderTemplate, toItems } from "@/features/workflows/transforms";
import type { WorkflowItem } from "@/features/workflows/types";

import { aiClassify, aiExtract, aiGenerate } from "./ai-nodes";
import { guardedFetch, readLimited } from "./net-guard";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_OUTPUT_ITEMS = 500;
const MAX_AI_INPUT_CHARS = 20_000;

export const serverNodeTypes = ["http.request", "ai.summary", "ai.classify", "ai.extract", "ai.generate", "slack.message"] as const;

export const executeRequestSchema = z.object({
  type: z.enum(serverNodeTypes),
  params: z.record(z.string(), z.string().max(20_000)),
  items: z.array(z.record(z.string(), z.unknown())).max(MAX_OUTPUT_ITEMS),
});

export type ExecuteRequest = z.infer<typeof executeRequestSchema>;

function parseJsonParam(value: string | undefined, label: string): unknown {
  if (!value?.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label}이(가) 올바른 JSON이 아닙니다.`);
  }
}

async function httpRequest(params: Record<string, string>): Promise<WorkflowItem[]> {
  const method = params.method === "POST" ? "POST" : "GET";
  const headers = parseJsonParam(params.headers, "헤더");
  if (headers !== undefined && (typeof headers !== "object" || Array.isArray(headers) || headers === null)) {
    throw new Error("헤더는 {\"이름\": \"값\"} 형태여야 합니다.");
  }
  const body = method === "POST" ? parseJsonParam(params.body, "본문") : undefined;

  const response = await guardedFetch(params.url ?? "", {
    method,
    headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(headers as Record<string, string> | undefined) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await readLimited(response, MAX_RESPONSE_BYTES);
  if (!response.ok) throw new Error(`요청이 실패했습니다 (HTTP ${response.status}).`);

  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    return [{ body: text.slice(0, 5000) }];
  }
  const selected = readPath(data, params.path ?? "");
  if (selected === undefined) throw new Error(`응답에서 '${params.path}' 경로를 찾지 못했습니다.`);
  return toItems(selected).slice(0, MAX_OUTPUT_ITEMS);
}

async function aiSummary(params: Record<string, string>, items: WorkflowItem[]): Promise<WorkflowItem[]> {
  if (items.length === 0) throw new Error("요약할 데이터가 없습니다. 앞 단계의 결과를 확인해 주세요.");
  const topic = params.topic?.trim() || "자동화 데이터";
  const text = JSON.stringify(items, null, 2).slice(0, MAX_AI_INPUT_CHARS);
  const analysis = await analyzePlanningDocument(`# ${topic}\n\n다음은 ${items.length}건의 데이터입니다.\n\n${text}`, `${topic}.md`);
  return [
    {
      summary: analysis.summary,
      goals: analysis.goals,
      strengths: analysis.strengths,
      risks: analysis.risks,
      missingInfo: analysis.missingInfo,
      actionPlan: analysis.actionPlan,
      itemCount: items.length,
    },
  ];
}

async function slackMessage(params: Record<string, string>, items: WorkflowItem[]): Promise<WorkflowItem[]> {
  const webhook = params.webhookUrl?.trim() ?? "";
  if (!/^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+$/.test(webhook)) {
    throw new Error("Slack Incoming Webhook URL(https://hooks.slack.com/services/…)을 입력해 주세요.");
  }
  const text = renderTemplate(params.text ?? "", items).trim();
  if (!text) throw new Error("보낼 메시지를 입력해 주세요.");
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Slack 전송에 실패했습니다 (HTTP ${response.status}).`);
  return [{ sent: true, text, sentAt: new Date().toISOString() }];
}

export async function executeServerNode(request: ExecuteRequest): Promise<WorkflowItem[]> {
  switch (request.type) {
    case "http.request":
      return httpRequest(request.params);
    case "ai.summary":
      return aiSummary(request.params, request.items);
    case "ai.classify":
      return aiClassify(request.params, request.items);
    case "ai.extract":
      return aiExtract(request.params, request.items);
    case "ai.generate":
      return aiGenerate(request.params, request.items);
    case "slack.message":
      return slackMessage(request.params, request.items);
  }
}
