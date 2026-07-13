"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "stocklens.level-alerts";

export interface LevelAlert {
  id: string;
  ticker: string;
  label: string;
  price: number;
  direction: "above" | "below";
  createdAt: string;
}

export function useLevelAlerts() {
  const [alerts, setAlerts] = useState<LevelAlert[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) setAlerts(parsed);
    } catch {
      setAlerts([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // Alerts are device-local and gracefully degrade when browser storage is unavailable.
    }
  }, [alerts, hydrated]);

  const toggleAlert = useCallback((input: Omit<LevelAlert, "id" | "createdAt">) => {
    const id = `${input.ticker}:${input.label}`;
    setAlerts(current => current.some(alert => alert.id === id)
      ? current.filter(alert => alert.id !== id)
      : [...current, { ...input, id, createdAt: new Date().toISOString() }]);
  }, []);

  const isTracked = useCallback((ticker: string, label: string) => alerts.some(alert => alert.id === `${ticker}:${label}`), [alerts]);

  return { alerts, toggleAlert, isTracked };
}
