import { describe, expect, it } from "vitest";

import { AppError } from "./errors";
import { decodeCursor, encodeCursor } from "./page";

describe("cursor encoding", () => {
  it("round-trips a stable feed cursor", () => {
    const value = {
      createdAt: "2026-09-18T00:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000001",
    };
    expect(decodeCursor(encodeCursor(value))).toEqual(value);
  });

  it("rejects malformed cursors", () => {
    expect(() => decodeCursor("not-a-cursor")).toThrowError(AppError);
  });
});
