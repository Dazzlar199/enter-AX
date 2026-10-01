import { describe, expect, it } from "vitest";

import { readServerConfig } from "./config";

describe("server configuration", () => {
  it("accepts demo mode without database credentials", () => {
    expect(readServerConfig({ NEXT_PUBLIC_BACKEND_MODE: "demo", NODE_ENV: "development" })).toMatchObject({ mode: "demo" });
  });

  it("requires a database and secure cookies for production API mode", () => {
    expect(() => readServerConfig({ NEXT_PUBLIC_BACKEND_MODE: "api", NODE_ENV: "production" })).toThrow();
    expect(() => readServerConfig({
      NEXT_PUBLIC_BACKEND_MODE: "api",
      NODE_ENV: "production",
      DATABASE_URL: "postgres://example",
      APP_ORIGIN: "https://enter-ax.test",
      SESSION_COOKIE_SECURE: "false",
    })).toThrow();
  });
});
