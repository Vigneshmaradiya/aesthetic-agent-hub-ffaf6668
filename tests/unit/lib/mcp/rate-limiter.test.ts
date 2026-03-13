import { describe, it, expect } from "vitest";
import { TokenBucketRateLimiter } from "@/lib/mcp/rate-limiter";

describe("TokenBucketRateLimiter", () => {
  it("should allow requests within the rate limit", async () => {
    const limiter = new TokenBucketRateLimiter(60);
    // Should not throw or delay significantly
    const start = Date.now();
    await limiter.acquire("test");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it("should start with max tokens", () => {
    const limiter = new TokenBucketRateLimiter(10);
    expect(limiter.getTokens("test")).toBe(10);
  });

  it("should decrement tokens on acquire", async () => {
    const limiter = new TokenBucketRateLimiter(10);
    await limiter.acquire("test");
    expect(limiter.getTokens("test")).toBe(9);
  });

  it("should track buckets per key", async () => {
    const limiter = new TokenBucketRateLimiter(10);
    await limiter.acquire("service-a");
    await limiter.acquire("service-b");
    expect(limiter.getTokens("service-a")).toBe(9);
    expect(limiter.getTokens("service-b")).toBe(9);
  });
});
