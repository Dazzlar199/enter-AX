import { describe, expect, it } from "vitest";

import { MemoryRateLimiter } from "./rate-limit";

describe("MemoryRateLimiter", () => {
  it("limits a key inside a fixed window and resets after it", async () => {
    let now = 1_000;
    const limiter = new MemoryRateLimiter(() => now);

    await limiter.check({ key: "user:1", limit: 2, windowMs: 1_000 });
    await limiter.check({ key: "user:1", limit: 2, windowMs: 1_000 });
    await expect(limiter.check({ key: "user:1", limit: 2, windowMs: 1_000 })).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });

    now = 2_000;
    await expect(limiter.check({ key: "user:1", limit: 2, windowMs: 1_000 })).resolves.toBeUndefined();
  });
});
