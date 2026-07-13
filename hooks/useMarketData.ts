"use client";

import { useCallback, useEffect, useState } from "react";
import { MarketResponse, TimeRange } from "@/lib/types";

export function useMarketData(ticker: string, range: TimeRange, enabled = true) {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!enabled || !ticker) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/market?ticker=${encodeURIComponent(ticker)}&range=${range}`, { signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load market data.");
      setData(payload);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setError(error instanceof Error ? error.message : "Unable to load market data.");
      setData(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [enabled, range, ticker]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { data, loading, error, reload: () => load() };
}
