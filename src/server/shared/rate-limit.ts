import { AppError } from "./errors";

export interface RateLimitInput {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimiter {
  check(input: RateLimitInput): Promise<void>;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, number>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  async check(input: RateLimitInput): Promise<void> {
    const windowStart = Math.floor(this.now() / input.windowMs) * input.windowMs;
    const bucketKey = `${input.key}:${windowStart}`;
    const count = (this.buckets.get(bucketKey) ?? 0) + 1;
    this.buckets.set(bucketKey, count);
    if (count > input.limit) {
      throw new AppError("RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    }
  }
}
