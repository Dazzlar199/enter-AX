import { createHash } from "node:crypto";

import type { Sql } from "postgres";

import { AppError } from "@/server/shared/errors";
import type { RateLimitInput, RateLimiter } from "@/server/shared/rate-limit";

export class PostgresRateLimiter implements RateLimiter {
  constructor(
    private readonly sql: Sql,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async check(input: RateLimitInput): Promise<void> {
    const now = this.now();
    const start = Math.floor(now / input.windowMs) * input.windowMs;
    const keyHash = createHash("sha256").update(input.key, "utf8").digest("hex");
    const windowStart = new Date(start).toISOString();
    const expiresAt = new Date(start + input.windowMs * 2).toISOString();
    const [bucket] = await this.sql<{ hitCount: number }[]>`
      INSERT INTO rate_limit_buckets (key_hash, window_start, hit_count, expires_at)
      VALUES (${keyHash}, ${windowStart}, 1, ${expiresAt})
      ON CONFLICT (key_hash, window_start)
      DO UPDATE SET hit_count = rate_limit_buckets.hit_count + 1
      RETURNING hit_count AS "hitCount"
    `;
    if (Math.random() < 0.02) {
      await this.sql`DELETE FROM rate_limit_buckets WHERE expires_at < now()`;
    }
    if (bucket.hitCount > input.limit) {
      throw new AppError("RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    }
  }
}
