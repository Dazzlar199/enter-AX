export type AppErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const statusByCode: Record<AppErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorPayload(error: unknown, requestId: string) {
  const appError =
    error instanceof AppError
      ? error
      : new AppError("INTERNAL_ERROR", "요청을 처리하지 못했습니다.");
  return {
    status: statusByCode[appError.code],
    body: {
      error: {
        code: appError.code,
        message: appError.message,
        requestId,
        ...(appError.fields ? { fields: appError.fields } : {}),
      },
    },
  };
}
