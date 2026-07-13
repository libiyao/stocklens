import { NextRequest, NextResponse } from "next/server";
import { fetchExtendedHours } from "@/lib/market-data";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const isRateLimited = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

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
