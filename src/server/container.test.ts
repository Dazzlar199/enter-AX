import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import { createServerContainer } from "./container";

describe("server dependency container", () => {
  it("does not create PostgreSQL dependencies in demo mode", () => {
    const sqlFactory = vi.fn();
    const container = createServerContainer({
      config: { mode: "demo", nodeEnv: "development", appOrigin: "http://localhost:3000", secureCookies: false },
      sqlFactory,
    });
    expect(container.handlers).toBeDefined();
    expect(sqlFactory).not.toHaveBeenCalled();
  });

  it("creates PostgreSQL dependencies in API mode", () => {
    const fakeSql = (() => undefined) as unknown as Sql;
    const sqlFactory = vi.fn(() => fakeSql);
    const container = createServerContainer({
      config: {
        mode: "api",
        nodeEnv: "production",
        databaseUrl: "postgres://example",
        appOrigin: "https://enter-ax.test",
        secureCookies: true,
      },
      sqlFactory,
    });
    expect(container.handlers).toBeDefined();
    expect(sqlFactory).toHaveBeenCalledOnce();
  });

  it("wires agency session handlers in both modes", () => {
    const demoContainer = createServerContainer({
      config: { mode: "demo", nodeEnv: "development", appOrigin: "http://localhost:3000", secureCookies: false },
      sqlFactory: vi.fn(),
    });
    expect(demoContainer.handlers.postAgencySession).toBeInstanceOf(Function);
    expect(demoContainer.handlers.getAgencySession).toBeInstanceOf(Function);
    expect(demoContainer.handlers.deleteAgencySession).toBeInstanceOf(Function);
  });
});
