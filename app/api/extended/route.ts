import { NextRequest, NextResponse } from "next/server";
import { fetchExtendedHours } from "@/lib/market-data";

export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const buckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}

export async function GET(request: NextRequest) {
  if (isRateLimited(request)) return NextResponse.json({ error: "Too many requests. Please wait and try again." }, { status: 429 });
  const ticker = request.nextUrl.searchParams.get("ticker") || "";
  try {
    return NextResponse.json(await fetchExtendedHours(ticker), {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load extended-hours data." }, { status: 422 });
  }
}
