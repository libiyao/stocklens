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
