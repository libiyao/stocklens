import { MarketResponse, TimeRange } from "./types";

const RANGE_MAP: Record<TimeRange, string> = { "6M": "6mo", "1Y": "1y", "2Y": "2y", "5Y": "5y" };

export async function fetchOHLCV(ticker: string, range: TimeRange): Promise<MarketResponse> {
  const symbol = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9.^=-]{1,15}$/.test(symbol)) throw new Error("Enter a valid ticker symbol.");
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${RANGE_MAP[range]}&interval=1d&events=div%2Csplits`;
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 StockLens/1.0", Accept: "application/json" }, next: { revalidate: 900 } });
  if (!response.ok) throw new Error(response.status === 404 ? "Ticker not found." : "Market data provider is unavailable.");
  const json = await response.json();
  if (json.chart?.error) throw new Error(json.chart.error.description || "Ticker not found.");
  const result = json.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result?.timestamp?.length || !quote) throw new Error("No market data found for this ticker and range.");
  const candles = result.timestamp.flatMap((timestamp: number, i: number) => {
    const values = [quote.open?.[i], quote.high?.[i], quote.low?.[i], quote.close?.[i], quote.volume?.[i]];
    if (values.some(v => v == null || !Number.isFinite(v))) return [];
    return [{ time: new Date(timestamp * 1000).toISOString().slice(0, 10), timestamp, open: values[0], high: values[1], low: values[2], close: values[3], volume: values[4] }];
  });
  if (!candles.length) throw new Error("No valid candles were returned.");
  return { candles, meta: { symbol: result.meta.symbol, name: result.meta.longName || result.meta.shortName || result.meta.symbol, currency: result.meta.currency || "USD", exchange: result.meta.fullExchangeName || result.meta.exchangeName || "Market" } };
}
