import { NextResponse } from "next/server";

import { workflowPermissionsFor, type WorkflowRole } from "@/features/workflows/permissions";
import { getServerContainer } from "@/server/container";
import { MemoryRateLimiter } from "@/server/shared/rate-limit";
import { executeRequestSchema, executeServerNode } from "@/server/workflows/execute";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BODY_BYTES = 512 * 1024;
const limiter = new MemoryRateLimiter();

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/** Only the app itself may call this endpoint: the Origin must match APP_ORIGIN, or the Host that served the request. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let received: URL;
  try {
    received = new URL(origin);
  } catch {
    return false;
  }
  if (process.env.APP_ORIGIN) return received.origin === new URL(process.env.APP_ORIGIN).origin;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return Boolean(host) && received.host === host;
}

/** Executes one server-side workflow node (HTTP request, AI summary, Slack) for the editor. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }

  try {
    await limiter.check({ key: `workflow-execute:${clientKey(request)}`, limit: 60, windowMs: 60_000 });
  } catch {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  if (process.env.NEXT_PUBLIC_BACKEND_MODE === "api") {
    const sessionResponse = await getServerContainer().handlers.getAgencySession(request);
    if (!sessionResponse.ok) return sessionResponse;
    const session = (await sessionResponse.json()) as { profile?: { role?: WorkflowRole } };
    const role = session.profile?.role;
    if (!role || !workflowPermissionsFor(role).canExecute) {
      return NextResponse.json({ error: "현재 계정은 업무 흐름을 실행할 권한이 없습니다." }, { status: 403 });
    }
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "입력 데이터가 너무 큽니다." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const parsed = executeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "단계 설정이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const items = await executeServerNode(parsed.data);
    return NextResponse.json({ items });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "이 단계를 실행하지 못했습니다.";
    const timedOut = reason instanceof Error && (reason.name === "TimeoutError" || reason.name === "AbortError");
    return NextResponse.json({ error: timedOut ? "응답 시간이 초과되었습니다 (15초)." : message }, { status: 422 });
  }
}
