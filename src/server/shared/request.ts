import { randomUUID } from "node:crypto";

import { AppError } from "./errors";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,100}$/;

export function getRequestId(request: Request): string {
  const value = request.headers.get("x-request-id");
  return value && SAFE_REQUEST_ID.test(value) ? value : randomUUID();
}

export function assertSameOrigin(request: Request, configuredOrigin: string): void {
  const origin = request.headers.get("origin");
  let expected: string;
  let received: string | null = null;
  try {
    expected = new URL(configuredOrigin).origin;
    received = origin ? new URL(origin).origin : null;
  } catch {
    throw new AppError("FORBIDDEN", "요청 출처를 확인할 수 없습니다.");
  }
  if (!received || received !== expected) {
    throw new AppError("FORBIDDEN", "허용되지 않은 요청 출처입니다.");
  }
}
