export type TimeRange = "6M" | "1Y" | "2Y" | "5Y";

export interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface QuoteMeta {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  source: string;
}

export interface MarketResponse {
  candles: Candle[];
  meta: QuoteMeta;
}

export type IntradaySession = "pre" | "regular" | "post";
export type MarketState = "PRE" | "REGULAR" | "POST" | "CLOSED";

export interface IntradayCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  session: IntradaySession;
}

export interface ExtendedMarketResponse {
  symbol: string;
  currency: string;
  exchange: string;
  timezone: string;
  source: string;
  marketState: MarketState;
  regularPrice: number;
  previousClose: number;
  referencePrice: number;
  referenceLabel: "Previous close" | "Regular close";
  extendedPrice: number | null;
  extendedChange: number | null;
  extendedChangePct: number | null;
  lastUpdated: number;
  candles: IntradayCandle[];
}

export interface PriceLevel {
  price: number;
  strength: number;
  touches: number;
  type: "support" | "resistance";
}

export interface VolumeBin {
  low: number;
  high: number;
  volume: number;
}

export interface TechnicalScores {
  trend: number;
  momentum: number;
  volume: number;
  structure: number;
  overall: number;
}
