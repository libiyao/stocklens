import { MarketResponse, TimeRange } from "../types";

export interface MarketDataProvider {
  name: string;
  fetchOHLCV(ticker: string, range: TimeRange): Promise<MarketResponse>;
  searchTickers(query: string): Promise<TickerSearchResult[]>;
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  quoteType?: string;
}
