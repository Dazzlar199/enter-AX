import { describe, expect, it } from "vitest";

import { AppError, toErrorPayload } from "./errors";

describe("application error mapping", () => {
  it("maps an authentication error to the public error envelope", () => {
    expect(toErrorPayload(new AppError("UNAUTHENTICATED", "로그인이 필요합니다."), "req-1")).toEqual({
      status: 401,
      body: {
        error: {
          code: "UNAUTHENTICATED",
          message: "로그인이 필요합니다.",
          requestId: "req-1",
        },
      },
    });
  });

  it("hides unexpected error details", () => {
    expect(toErrorPayload(new Error("database password leaked"), "req-2")).toEqual({
      status: 500,
      body: {
        error: {
          code: "INTERNAL_ERROR",
          message: "요청을 처리하지 못했습니다.",
          requestId: "req-2",
        },
      },
    });
  });
});
