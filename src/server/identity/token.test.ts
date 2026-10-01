import { describe, expect, it } from "vitest";

import { generateSessionToken, hashSessionToken } from "./token";

describe("session tokens", () => {
  it("generates a 256-bit base64url token", () => {
    expect(generateSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("hashes tokens deterministically without retaining the source", () => {
    expect(hashSessionToken("same-token")).toBe(hashSessionToken("same-token"));
    expect(hashSessionToken("same-token")).not.toBe(hashSessionToken("other-token"));
    expect(hashSessionToken("same-token")).not.toContain("same-token");
  });
});
