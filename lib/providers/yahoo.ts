import { DATA_SOURCE } from "../constants";
import { classifyIntradaySession, isWithinTradingPeriod, TradingPeriods } from "../market-sessions";
import { ExtendedMarketResponse, IntradayCandle, MarketResponse, MarketState, TimeRange } from "../types";
import { normalizeSymbol } from "./shared";
import { MarketDataProvider, TickerSearchResult } from "./types";

const RANGE_MAP: Record<TimeRange, string> = { "6M": "6mo", "1Y": "1y", "2Y": "2y", "5Y": "5y" };

async function fetchOHLCV(ticker: string, range: TimeRange): Promise<MarketResponse> {
  const symbol = normalizeSymbol(ticker);
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
  return {
    candles,
    meta: {
      symbol: result.meta.symbol,
      name: result.meta.longName || result.meta.shortName || result.meta.symbol,
      currency: result.meta.currency || "USD",
      exchange: result.meta.fullExchangeName || result.meta.exchangeName || "Market",
      source: DATA_SOURCE,
    },
  };
}

function resolveMarketState(periods: TradingPeriods): MarketState {
  const now = Math.floor(Date.now() / 1000);
  if (isWithinTradingPeriod(now, periods.pre)) return "PRE";
  if (isWithinTradingPeriod(now, periods.regular)) return "REGULAR";
  if (isWithinTradingPeriod(now, periods.post)) return "POST";
  return "CLOSED";
}

async function fetchExtendedHours(ticker: string): Promise<ExtendedMarketResponse> {
  const symbol = normalizeSymbol(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=true&events=div%2Csplits`;
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 StockLens/1.0", Accept: "application/json" }, next: { revalidate: 30 } });
  if (!response.ok) throw new Error(response.status === 404 ? "Ticker not found." : "Extended-hours data is unavailable.");
  const json = await response.json();
  if (json.chart?.error) throw new Error(json.chart.error.description || "Extended-hours data is unavailable.");
  const result = json.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result?.timestamp?.length || !quote) throw new Error("No intraday data was returned.");
  const timezone = result.meta.exchangeTimezoneName || "America/New_York";
  const periods: TradingPeriods = result.meta.currentTradingPeriod || {};
  const candles: IntradayCandle[] = result.timestamp.flatMap((timestamp: number, index: number) => {
    const open = quote.open?.[index], high = quote.high?.[index], low = quote.low?.[index], close = quote.close?.[index];
    if ([open, high, low, close].some(value => value == null || !Number.isFinite(value))) return [];
    const session = classifyIntradaySession(timestamp, timezone, periods);
    if (!session) return [];
    const volume = Number.isFinite(quote.volume?.[index]) ? quote.volume[index] : 0;
    return [{ time: new Date(timestamp * 1000).toISOString(), timestamp, open, high, low, close, volume, session }];
  });
  if (!candles.length) throw new Error("No valid intraday candles were returned.");

  const marketState = resolveMarketState(periods);
  const regularCandles = candles.filter(candle => candle.session === "regular");
  const regularPrice = result.meta.regularMarketPrice ?? regularCandles.at(-1)?.close ?? candles.at(-1)!.close;
  const previousClose = result.meta.previousClose ?? result.meta.chartPreviousClose ?? regularPrice;
  const activeExtendedSession = marketState === "PRE" ? "pre" : marketState === "POST" ? "post" : null;
  const extendedCandles = candles.filter(candle => candle.session !== "regular");
  const activeExtendedCandles = activeExtendedSession ? extendedCandles.filter(candle => candle.session === activeExtendedSession) : [];
  const latestExtended = activeExtendedCandles.at(-1) ?? extendedCandles.at(-1);
  const referencePrice = marketState === "PRE" ? previousClose : regularPrice;
  const extendedPrice = latestExtended?.close ?? null;
  const extendedChange = extendedPrice == null ? null : extendedPrice - referencePrice;

  return {
    symbol: result.meta.symbol || symbol,
    currency: result.meta.currency || "USD",
    exchange: result.meta.fullExchangeName || result.meta.exchangeName || "Market",
    timezone,
    source: DATA_SOURCE,
    marketState,
    regularPrice,
    previousClose,
    referencePrice,
    referenceLabel: marketState === "PRE" ? "Previous close" : "Regular close",
    extendedPrice,
    extendedChange,
    extendedChangePct: extendedChange == null || referencePrice === 0 ? null : extendedChange / referencePrice * 100,
    lastUpdated: latestExtended?.timestamp ?? candles.at(-1)!.timestamp,
    candles,
  };
}

async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  const q = query.trim();
  if (q.length < 1 || q.length > 30) return [];
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 StockLens/1.0", Accept: "application/json" }, next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Ticker search is unavailable.");
  const json = await response.json();
  return (json.quotes ?? [])
    .filter((quote: { symbol?: string; shortname?: string; longname?: string }) => quote.symbol)
    .slice(0, 8)
    .map((quote: { symbol: string; shortname?: string; longname?: string; exchDisp?: string; quoteType?: string }) => ({
      symbol: quote.symbol,
      name: quote.longname || quote.shortname || quote.symbol,
      exchange: quote.exchDisp,
      quoteType: quote.quoteType,
    }));
}

export const yahooProvider: MarketDataProvider = {
  name: DATA_SOURCE,
  fetchOHLCV,
  fetchExtendedHours,
  searchTickers,
};
