import { describe, expect, it } from "vitest";

import { automationDisabledResponse } from "./automation-guard";

describe("automationDisabledResponse", () => {
  it("allows local development and tests", () => {
    expect(automationDisabledResponse({ NODE_ENV: "development" })).toBeNull();
    expect(automationDisabledResponse({ NODE_ENV: "test" })).toBeNull();
  });

  it("refuses production unless explicitly enabled", () => {
    expect(automationDisabledResponse({ NODE_ENV: "production" })?.status).toBe(403);
    expect(automationDisabledResponse({ NODE_ENV: "production", ENABLE_CONTENT_AUTOMATION: "true" })).toBeNull();
  });
});
