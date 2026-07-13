import { NextRequest, NextResponse } from "next/server";
import { fetchOHLCV } from "@/lib/market-data";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { TimeRange } from "@/lib/types";

export const dynamic = "force-dynamic";

const isRateLimited = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker") || "";
  const range = (request.nextUrl.searchParams.get("range") || "1Y") as TimeRange;
  if (isRateLimited(request)) return json({ error: "Too many requests. Please wait a minute and try again." }, 429);
  if (!["6M", "1Y", "2Y", "5Y"].includes(range)) return json({ error: "Invalid time range." }, 400);
  try {
    return json(await fetchOHLCV(ticker, range));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to load market data." }, 422);
  }
}
