import { describe, expect, it } from "vitest";

import { automationAccessResponse } from "./automation-guard";

const request = new Request("http://localhost/api/x");
const signedIn = async () => Response.json({ profile: {} });
const signedOut = async () => Response.json({ error: "no" }, { status: 401 });

describe("automationAccessResponse", () => {
  it("allows local development and tests", async () => {
    expect(await automationAccessResponse(request, { NODE_ENV: "development" }, signedOut)).toBeNull();
    expect(await automationAccessResponse(request, { NODE_ENV: "test" }, signedOut)).toBeNull();
  });

  it("refuses production demo mode unless explicitly enabled", async () => {
    expect((await automationAccessResponse(request, { NODE_ENV: "production" }, signedIn))?.status).toBe(403);
    expect(
      await automationAccessResponse(request, { NODE_ENV: "production", ENABLE_CONTENT_AUTOMATION: "true" }, signedOut),
    ).toBeNull();
  });

  it("requires an agency session in production API mode", async () => {
    const env = { NODE_ENV: "production", NEXT_PUBLIC_BACKEND_MODE: "api" };
    expect(await automationAccessResponse(request, env, signedIn)).toBeNull();
    expect((await automationAccessResponse(request, env, signedOut))?.status).toBe(401);
  });
});
