"use client";

import { useEffect, useState } from "react";
import { TickerSearchResult } from "@/lib/providers/types";

export function useTickerSearch(query: string, selectedTicker: string) {
  const [suggestions, setSuggestions] = useState<TickerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const normalized = query.trim().toUpperCase();
    if (!normalized || normalized === selectedTicker) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const payload = await response.json();
        setSuggestions(response.ok && Array.isArray(payload) ? payload : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedTicker]);

  return { suggestions, searching, clearSuggestions: () => setSuggestions([]) };
}
