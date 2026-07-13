export function normalizeSymbol(ticker: string) {
  const symbol = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9.^=-]{1,15}$/.test(symbol)) throw new Error("Enter a valid ticker symbol.");
  return symbol;
}
