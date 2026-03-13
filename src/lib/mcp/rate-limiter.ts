interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>();
  private maxTokens: number;
  private refillRateMs: number;

  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute;
    this.refillRateMs = 60000 / requestsPerMinute;
  }

  async acquire(key: string): Promise<void> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const refill = Math.floor(elapsed / this.refillRateMs);
    if (refill > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refill);
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) {
      const waitMs = this.refillRateMs - (now - bucket.lastRefill);
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitMs)));
      bucket.tokens = 1;
      bucket.lastRefill = Date.now();
    }

    bucket.tokens--;
  }

  getTokens(key: string): number {
    return this.buckets.get(key)?.tokens ?? this.maxTokens;
  }
}
