import { describe, expect, it } from "vitest";

import { assertSameOrigin, getRequestId } from "./request";

describe("request security helpers", () => {
  it("preserves a safe request ID and replaces an unsafe one", () => {
    expect(getRequestId(new Request("https://enter-ax.test", { headers: { "x-request-id": "req_1.safe" } }))).toBe("req_1.safe");
    expect(getRequestId(new Request("https://enter-ax.test", { headers: { "x-request-id": "bad id!" } }))).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  it("allows only the configured mutation origin", () => {
    expect(() => assertSameOrigin(new Request("https://enter-ax.test/api", {
      method: "POST",
      headers: { origin: "https://enter-ax.test" },
    }), "https://enter-ax.test")).not.toThrow();
    expect(() => assertSameOrigin(new Request("https://enter-ax.test/api", {
      method: "POST",
      headers: { origin: "https://evil.test" },
    }), "https://enter-ax.test")).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });
});
