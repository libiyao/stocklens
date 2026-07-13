"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Crosshair, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";
import { useTickerSearch } from "@/hooks/useTickerSearch";
import { useWatchlist } from "@/hooks/useWatchlist";
import { buildTechnicalAnalysis } from "@/lib/analysis";
import { DEFAULT_RANGE, DEFAULT_TICKER } from "@/lib/constants";
import { TimeRange } from "@/lib/types";
import { ComparePanel } from "./ComparePanel";
import { DashboardHeader } from "./DashboardHeader";
import { DataQualityBar } from "./DataQualityBar";
import { IndicatorPanel } from "./IndicatorPanel";
import { LevelTracker } from "./LevelTracker";
import { PriceChart, PriceChartHandle } from "./PriceChart";
import { ScoreRing } from "./ScoreRing";
import { WatchlistBar } from "./WatchlistBar";

interface DashboardProps {
  initialTicker?: string;
  initialRange?: TimeRange;
}

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function normalizeTicker(value: string) {
  return value.trim().toUpperCase();
}

export default function Dashboard({ initialTicker = DEFAULT_TICKER, initialRange = DEFAULT_RANGE }: DashboardProps) {
  const router = useRouter();
  const chartRef = useRef<PriceChartHandle>(null);
  const normalizedInitialTicker = normalizeTicker(initialTicker) || DEFAULT_TICKER;
  const [query, setQuery] = useState(normalizedInitialTicker);
  const [ticker, setTicker] = useState(normalizedInitialTicker);
  const [range, setRange] = useState<TimeRange>(initialRange);
  const [copied, setCopied] = useState(false);
  const { data, loading, error, reload } = useMarketData(ticker, range);
  const { suggestions, searching, clearSuggestions } = useTickerSearch(query, ticker);
  const { watchlist, addTicker, removeTicker } = useWatchlist();
  const analysis = useMemo(() => data ? buildTechnicalAnalysis(data) : null, [data]);

  useEffect(() => {
    const nextTicker = normalizeTicker(initialTicker) || DEFAULT_TICKER;
    setTicker(nextTicker);
    setQuery(nextTicker);
  }, [initialTicker]);

  useEffect(() => setRange(initialRange), [initialRange]);

  const updateRoute = (nextTicker: string, nextRange: TimeRange) => {
    router.push(`/stock/${encodeURIComponent(nextTicker)}?range=${nextRange}`);
  };

  const selectTicker = (value: string) => {
    const nextTicker = normalizeTicker(value);
    if (!nextTicker) return;
    setTicker(nextTicker);
    setQuery(nextTicker);
    clearSuggestions();
    updateRoute(nextTicker, range);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    selectTicker(suggestions[0]?.symbol || query);
  };

  const changeRange = (nextRange: TimeRange) => {
    setRange(nextRange);
    updateRoute(ticker, nextRange);
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const exportAnalysis = () => {
    if (!data || !analysis) return;
    const report = [
      `StockLens Technical Analysis — ${data.meta.symbol}`,
      `${data.meta.name} · ${range} · ${analysis.dataQuality.lastCandleDate}`,
      "",
      `Current price: ${fmt.format(analysis.current)} ${data.meta.currency}`,
      `Session change: ${analysis.change >= 0 ? "+" : ""}${fmt.format(analysis.change)} (${analysis.changePct.toFixed(2)}%)`,
      `Major support: ${fmt.format(analysis.support)}`,
      `Breakout trigger: ${fmt.format(analysis.breakout)}`,
      `Stretch target: ${fmt.format(analysis.stretch)}`,
      `Technical score: ${analysis.scores.overall}/100`,
      "",
      "The Read",
      analysis.read,
      "",
      "Score methodology",
      ...analysis.explanations.map(item => `- ${item}`),
      "",
      `Source: ${analysis.dataQuality.source}; ${analysis.dataQuality.candleCount} real daily OHLCV candles.`,
      "Scenario paths are illustrative, not forecasts or investment advice.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.meta.symbol}-${range}-stocklens-analysis.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen">
      <DashboardHeader
        query={query}
        onQueryChange={setQuery}
        onSubmit={submit}
        onSelectTicker={selectTicker}
        suggestions={suggestions}
        searching={searching}
        range={range}
        onRangeChange={changeRange}
      />
      <div className="mx-auto max-w-[1500px] px-4 pt-3 lg:px-6">
        <WatchlistBar watchlist={watchlist} currentTicker={ticker} onSelect={selectTicker} onAdd={() => addTicker(ticker)} onRemove={removeTicker} />
      </div>
      <div className="mx-auto max-w-[1500px] p-4 pt-3 lg:p-6 lg:pt-3">
        {loading && <div className="grid min-h-[70vh] place-content-center text-center"><LoaderCircle className="mx-auto mb-4 animate-spin text-sky-400" /><p className="eyebrow">Loading market structure</p></div>}
        {!loading && error && <div className="error-state"><AlertTriangle /><h2>We couldn’t resolve that market</h2><p>{error}</p><button onClick={reload}>Try again</button></div>}
        {!loading && data && analysis && (
          <>
            <section className="market-heading">
              <div>
                <div className="mb-1 flex items-center gap-2"><h2 className="text-2xl font-semibold text-white">{data.meta.symbol}</h2><span className="badge">{data.meta.exchange}</span><span className="badge">{data.meta.currency}</span></div>
                <p className="text-sm text-slate-400">{data.meta.name}</p>
              </div>
              <div className="flex items-end gap-3"><span className="text-3xl font-semibold tabular-nums text-white">{fmt.format(analysis.current)}</span><span className={`mb-1 flex items-center gap-1 text-sm font-medium ${analysis.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{analysis.change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />} {analysis.change >= 0 ? "+" : ""}{fmt.format(analysis.change)} ({analysis.changePct.toFixed(2)}%)</span></div>
            </section>

            <DataQualityBar
              source={analysis.dataQuality.source}
              lastCandleDate={analysis.dataQuality.lastCandleDate}
              candleCount={analysis.dataQuality.candleCount}
              onCopyLink={copyShareLink}
              onExportReport={exportAnalysis}
              onExportChart={() => chartRef.current?.exportPng(`${data.meta.symbol}-${range}-stocklens-chart.png`)}
              copied={copied}
            />

            <div className="dashboard-grid">
              <section className="panel chart-card">
                <div className="panel-title"><span><BarChart3 size={14} /> Price action & scenario paths</span><small>DAILY · {range} · PATHS ARE ILLUSTRATIVE</small></div>
                <PriceChart ref={chartRef} candles={analysis.candles} levels={analysis.levels} profile={analysis.profile} targets={{ current: analysis.current, support: analysis.support, breakout: analysis.breakout, stretch: analysis.stretch }} />
              </section>

              <aside className="panel score-card">
                <div className="panel-title"><span><Activity size={14} /> Technical score</span></div>
                <div className="flex justify-center py-5"><ScoreRing score={analysis.scores.overall} /></div>
                <div className="score-list">{Object.entries(analysis.scores).filter(([key]) => key !== "overall").map(([key, value]) => <div key={key}><span className="capitalize">{key}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}</b></div>)}</div>
                <div className="mt-5 border-t border-slate-800 pt-4 text-center"><span className={`signal ${analysis.scores.overall >= 65 ? "bullish" : analysis.scores.overall <= 40 ? "bearish" : "neutral"}`}>{analysis.scores.overall >= 65 ? "Constructive" : analysis.scores.overall <= 40 ? "Defensive" : "Neutral setup"}</span></div>
              </aside>

              <section className="indicator-grid"><IndicatorPanel title="Relative strength index · 14" values={analysis.rsi} type="rsi" /><IndicatorPanel title="MACD · 12 26 9" values={analysis.macd} type="macd" /></section>

              <aside className="levels-grid">{([
                ["Current price", analysis.current, "sky", Crosshair],
                ["Major support", analysis.support, "green", ShieldCheck],
                ["Breakout trigger", analysis.breakout, "amber", ArrowUpRight],
                ["Stretch target", analysis.stretch, "violet", Sparkles],
              ] as const).map(([label, value, color, Icon]) => <div className={`level-card ${color}`} key={label}><div><Icon size={14} /><span>{label}</span></div><b>{fmt.format(value)}</b><small>{label === "Stretch target" ? "Illustrative objective" : label === "Major support" ? "Nearest demand zone" : "Derived from structure"}</small></div>)}</aside>

              <section className="utility-grid">
                <ComparePanel primaryTicker={data.meta.symbol} primaryCandles={analysis.candles} range={range} />
                <LevelTracker ticker={data.meta.symbol} currentPrice={analysis.current} levels={[
                  { label: "Major support", price: analysis.support, direction: "below" },
                  { label: "Breakout trigger", price: analysis.breakout, direction: "above" },
                  { label: "Stretch target", price: analysis.stretch, direction: "above" },
                ]} />
              </section>

              <section className="panel read-card">
                <div className="panel-title"><span><Crosshair size={14} /> The read</span><small>RULE-BASED SYNTHESIS</small></div>
                <p>{analysis.read}</p>
                <div className="explanation-grid">{analysis.explanations.map((explanation, index) => <div key={explanation}><b>{String(index + 1).padStart(2, "0")}</b><span>{explanation}</span></div>)}</div>
                <div className="disclaimer"><AlertTriangle size={13} /> Technical analysis is informational only. Scenario paths are illustrative and are not predictions or investment advice.</div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
