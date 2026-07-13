"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock3, LoaderCircle, RefreshCw } from "lucide-react";
import { useExtendedHours } from "@/hooks/useExtendedHours";
import { IntradayChart } from "./IntradayChart";

type SessionView = "regular" | "extended";

const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

const stateLabels = {
  PRE: "Pre-market",
  REGULAR: "Regular session",
  POST: "After hours",
  CLOSED: "Market closed",
} as const;

export function ExtendedHoursPanel({ ticker }: { ticker: string }) {
  const [view, setView] = useState<SessionView>("extended");
  const { data, loading, refreshing, error, refresh } = useExtendedHours(ticker);
  const visibleCandles = useMemo(() => {
    if (!data) return [];
    const filtered = view === "regular" ? data.candles.filter(candle => candle.session === "regular") : data.candles;
    return filtered.length ? filtered : data.candles;
  }, [data, view]);

  if (loading && !data) return (
    <section className="panel extended-panel extended-loading"><LoaderCircle size={17} className="animate-spin" /><span>Loading today’s market sessions</span></section>
  );

  if (!data) return (
    <section className="panel extended-panel extended-error"><AlertTriangle size={15} /><span><b>Extended-hours data unavailable</b><small>{error}</small></span><button onClick={refresh}>Try again</button></section>
  );

  const isRegular = data.marketState === "REGULAR";
  const activePrice = isRegular ? data.regularPrice : data.extendedPrice ?? data.regularPrice;
  const activeReference = isRegular ? data.previousClose : data.referencePrice;
  const activeChange = activePrice - activeReference;
  const activeChangePct = activeReference === 0 ? 0 : activeChange / activeReference * 100;
  const extendedCount = data.candles.filter(candle => candle.session !== "regular").length;
  const updated = new Intl.DateTimeFormat("en-US", { timeZone: data.timezone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(data.lastUpdated * 1000));

  return (
    <section className="panel extended-panel">
      <div className="extended-heading">
        <div className="extended-title"><span className={`session-pulse ${data.marketState.toLowerCase()}`} /><div><span>Today’s market sessions</span><b>{stateLabels[data.marketState]}</b></div></div>
        <div className="extended-quote">
          <strong>{priceFormat.format(activePrice)}</strong>
          <span className={activeChange >= 0 ? "positive" : "negative"}>{activeChange >= 0 ? "+" : ""}{priceFormat.format(activeChange)} ({activeChange >= 0 ? "+" : ""}{activeChangePct.toFixed(2)}%)</span>
          <small>vs. {isRegular ? "previous close" : data.referenceLabel.toLowerCase()}</small>
        </div>
        <div className="extended-controls">
          <div className="session-view-toggle" aria-label="Intraday session view">
            <button className={view === "regular" ? "active" : ""} aria-pressed={view === "regular"} onClick={() => setView("regular")}>Regular</button>
            <button className={view === "extended" ? "active" : ""} aria-pressed={view === "extended"} onClick={() => setView("extended")}>Extended</button>
          </div>
          <button className="extended-refresh" aria-label="Refresh extended-hours data" onClick={refresh}><RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /></button>
        </div>
      </div>
      <div className="extended-meta">
        <span><Clock3 size={11} /> Updated {updated}</span>
        <span>Regular close <b>{priceFormat.format(data.regularPrice)}</b></span>
        <span>Extended prints <b>{extendedCount}</b></span>
        <span>5-minute candles · {data.source}</span>
        {error && <span className="extended-warning">Refresh delayed</span>}
      </div>
      <div className="session-legend"><span className="pre">Pre-market</span><span className="regular">Regular</span><span className="post">After hours</span><small>{view === "extended" ? "All available sessions" : "Regular session only"}</small></div>
      <IntradayChart candles={visibleCandles} />
      <div className="extended-disclaimer"><Activity size={12} /> Extended-session prices are displayed separately and do not change daily SMA, RSI, MACD, technical scores, or scenario weights.</div>
    </section>
  );
}
