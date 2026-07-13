import type { NextRequest } from "next/server";

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  maxBuckets?: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

function clientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export function createRateLimiter({ windowMs, maxRequests, maxBuckets = 2_000 }: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();

  function prune(now: number) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    while (buckets.size >= maxBuckets) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey == null) break;
      buckets.delete(oldestKey);
    }
  }

  return (request: NextRequest) => {
    const now = Date.now();
    if (buckets.size >= maxBuckets) prune(now);
    const key = clientKey(request);
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    bucket.count += 1;
    return bucket.count > maxRequests;
  };
}
