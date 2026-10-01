import { ZodError } from "zod";

import { AppError, toErrorPayload } from "@/server/shared/errors";

export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

export function errorResponse(error: unknown, requestId: string): Response {
  const normalized = error instanceof ZodError
    ? new AppError(
        "VALIDATION_FAILED",
        "입력값을 확인해 주세요.",
        Object.fromEntries(
          Object.entries(error.flatten().fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])),
        ),
      )
    : error;
  const payload = toErrorPayload(normalized, requestId);
  return jsonResponse(payload.body, payload.status, { "x-request-id": requestId });
}
