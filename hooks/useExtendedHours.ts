"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExtendedMarketResponse } from "@/lib/types";

const REFRESH_INTERVAL_MS = 60_000;

export function useExtendedHours(ticker: string) {
  const [data, setData] = useState<ExtendedMarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const activeRequests = useRef(0);

  const load = useCallback(async (signal?: AbortSignal, background = false) => {
    if (background && activeRequests.current > 0) return;
    activeRequests.current += 1;
    background ? setRefreshing(true) : setLoading(true);
    if (!background) {
      setData(null);
      setError("");
    }
    try {
      const response = await fetch(`/api/extended?ticker=${encodeURIComponent(ticker)}`, { signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load extended-hours data.");
      setData(payload);
      setError("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setError(error instanceof Error ? error.message : "Unable to load extended-hours data.");
    } finally {
      activeRequests.current = Math.max(0, activeRequests.current - 1);
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [ticker]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") load(controller.signal, true);
    }, REFRESH_INTERVAL_MS);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [load]);

  return { data, loading, refreshing, error, refresh: () => load(undefined, true) };
}
