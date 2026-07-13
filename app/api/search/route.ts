import { NextRequest, NextResponse } from "next/server";
import { searchTickers } from "@/lib/market-data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  try {
    return NextResponse.json(await searchTickers(query), {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search tickers." }, { status: 422 });
  }
}
