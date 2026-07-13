import { yahooProvider } from "./providers/yahoo";
import { MarketResponse, TimeRange } from "./types";

const provider = yahooProvider;

export async function fetchOHLCV(ticker: string, range: TimeRange): Promise<MarketResponse> {
  return provider.fetchOHLCV(ticker, range);
}

export async function searchTickers(query: string) {
  return provider.searchTickers(query);
}
