"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "stocklens.watchlist";
const DEFAULT_WATCHLIST = ["AAPL", "NVDA", "MSFT", "TSLA", "SPY", "QQQ"];

function cleanTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === "string")) setWatchlist(parsed);
      }
    } catch {
      setWatchlist(DEFAULT_WATCHLIST);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch {
      // Browser storage can be unavailable in private modes; the app still works without persistence.
    }
  }, [hydrated, watchlist]);

  const addTicker = useCallback((ticker: string) => {
    const symbol = cleanTicker(ticker);
    if (!symbol) return;
    setWatchlist(current => [symbol, ...current.filter(item => item !== symbol)].slice(0, 12));
  }, []);

  const removeTicker = useCallback((ticker: string) => {
    const symbol = cleanTicker(ticker);
    setWatchlist(current => current.filter(item => item !== symbol));
  }, []);

  return { watchlist, addTicker, removeTicker };
}
