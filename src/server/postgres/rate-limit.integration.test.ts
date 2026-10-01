import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { PostgresRateLimiter } from "./rate-limit";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;
const sql = databaseUrl ? postgres(databaseUrl, { max: 2 }) : null;

integrationDescribe("PostgresRateLimiter", () => {
  afterAll(async () => {
    await sql?.end();
  });

  it("shares counts without persisting the raw key", async () => {
    const rawKey = `ip:${crypto.randomUUID()}`;
    const first = new PostgresRateLimiter(sql!, () => 1_000);
    const second = new PostgresRateLimiter(sql!, () => 1_000);
    await first.check({ key: rawKey, limit: 2, windowMs: 1_000 });
    await second.check({ key: rawKey, limit: 2, windowMs: 1_000 });
    await expect(first.check({ key: rawKey, limit: 2, windowMs: 1_000 })).rejects.toMatchObject({ code: "RATE_LIMITED" });
    const rows = await sql!`SELECT key_hash FROM rate_limit_buckets WHERE key_hash = ${rawKey}`;
    expect(rows).toHaveLength(0);
  });
});
