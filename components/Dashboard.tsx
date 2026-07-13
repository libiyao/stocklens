"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Crosshair, LoaderCircle, Search, ShieldCheck, Sparkles } from "lucide-react";
import { calculateMACD, calculateRSI, calculateTechnicalScores, calculateVolumeProfile, detectSupportResistance, generateTheRead } from "@/lib/indicators";
import { MarketResponse, TimeRange } from "@/lib/types";
import { PriceChart } from "./PriceChart";
import { IndicatorPanel } from "./IndicatorPanel";
import { ScoreRing } from "./ScoreRing";

const ranges: TimeRange[] = ["6M", "1Y", "2Y", "5Y"];
const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export default function Dashboard() {
  const [query, setQuery] = useState("AAPL"), [ticker, setTicker] = useState("AAPL"), [range, setRange] = useState<TimeRange>("1Y");
  const [data, setData] = useState<MarketResponse | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await fetch(`/api/market?ticker=${encodeURIComponent(ticker)}&range=${range}`); const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load data"); setData(null); }
    finally { setLoading(false); }
  }, [ticker, range]);
  useEffect(() => { load(); }, [load]);
  const analysis = useMemo(() => {
    if (!data) return null;
    const candles = data.candles, closes = candles.map(c => c.close), levels = detectSupportResistance(candles), scores = calculateTechnicalScores(candles, levels);
    const current = closes.at(-1)!, previous = closes.at(-2) ?? current, change = current - previous, changePct = change / previous * 100;
    const support = levels.filter(l => l.type === "support").sort((a,b) => b.price-a.price)[0];
    const resistance = levels.filter(l => l.type === "resistance").sort((a,b) => a.price-b.price)[0];
    const atr = candles.slice(-14).reduce((s,c) => s + (c.high-c.low),0)/Math.min(14,candles.length);
    const breakout = resistance?.price ?? current + atr, stretch = breakout + atr * 2.5;
    return { candles, levels, scores, current, change, changePct, support: support?.price ?? current-atr*2, breakout, stretch, rsi: calculateRSI(closes).map(v=>v??50), macd: calculateMACD(closes).histogram, profile: calculateVolumeProfile(candles), read: generateTheRead(candles,scores,levels) };
  }, [data]);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (query.trim()) setTicker(query.trim().toUpperCase()); };
  return <main className="min-h-screen">
    <header className="border-b border-slate-800/80 bg-[#080d17]/90 px-5 py-4 backdrop-blur-xl lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3"><div className="brand-mark"><Crosshair size={19}/></div><div><h1 className="text-lg font-semibold tracking-tight text-white">Stock<span className="text-sky-400">Lens</span></h1><p className="text-[9px] uppercase tracking-[.24em] text-slate-500">Technical intelligence</p></div></div>
        <form onSubmit={submit} className="flex flex-1 items-center gap-2 md:max-w-xl"><label className="search-box"><Search size={15}/><input aria-label="Ticker symbol" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ticker e.g. NVDA"/><kbd>↵</kbd></label><div className="range-group">{ranges.map(r=><button type="button" key={r} onClick={()=>setRange(r)} className={range===r?"active":""}>{r}</button>)}</div></form>
        <div className="hidden items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-300 md:flex"><span className="status-dot"/> Live market data</div>
      </div>
    </header>
    <div className="mx-auto max-w-[1500px] p-4 lg:p-6">
      {loading && <div className="grid min-h-[70vh] place-content-center text-center"><LoaderCircle className="mx-auto mb-4 animate-spin text-sky-400"/><p className="eyebrow">Loading market structure</p></div>}
      {!loading && error && <div className="error-state"><AlertTriangle/><h2>We couldn’t resolve that market</h2><p>{error}</p><button onClick={load}>Try again</button></div>}
      {!loading && data && analysis && <>
        <section className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><div className="mb-1 flex items-center gap-2"><h2 className="text-2xl font-semibold text-white">{data.meta.symbol}</h2><span className="badge">{data.meta.exchange}</span><span className="badge">{data.meta.currency}</span></div><p className="text-sm text-slate-400">{data.meta.name}</p></div>
          <div className="flex items-end gap-3"><span className="text-3xl font-semibold tabular-nums text-white">{fmt.format(analysis.current)}</span><span className={`mb-1 flex items-center gap-1 text-sm font-medium ${analysis.change>=0?"text-emerald-300":"text-rose-300"}`}>{analysis.change>=0?<ArrowUpRight size={16}/>:<ArrowDownRight size={16}/>} {analysis.change>=0?"+":""}{fmt.format(analysis.change)} ({analysis.changePct.toFixed(2)}%)</span></div>
        </section>
        <div className="dashboard-grid">
          <section className="panel chart-card"><div className="panel-title"><span><BarChart3 size={14}/> Price action & scenario paths</span><small>DAILY · {range} · PATHS ARE ILLUSTRATIVE</small></div><PriceChart candles={analysis.candles} levels={analysis.levels} profile={analysis.profile} targets={{ current: analysis.current, support: analysis.support, breakout: analysis.breakout, stretch: analysis.stretch }}/></section>
          <aside className="panel score-card"><div className="panel-title"><span><Activity size={14}/> Technical score</span></div><div className="flex justify-center py-5"><ScoreRing score={analysis.scores.overall}/></div><div className="score-list">{Object.entries(analysis.scores).filter(([k])=>k!=="overall").map(([key,value])=><div key={key}><span className="capitalize">{key}</span><div><i style={{width:`${value}%`}}/></div><b>{value}</b></div>)}</div><div className="mt-5 border-t border-slate-800 pt-4 text-center"><span className={`signal ${analysis.scores.overall>=65?"bullish":analysis.scores.overall<=40?"bearish":"neutral"}`}>{analysis.scores.overall>=65?"Constructive":analysis.scores.overall<=40?"Defensive":"Neutral setup"}</span></div></aside>
          <section className="indicator-grid"><IndicatorPanel title="Relative strength index · 14" values={analysis.rsi} type="rsi"/><IndicatorPanel title="MACD · 12 26 9" values={analysis.macd} type="macd"/></section>
          <aside className="levels-grid">{([[
            "Current price", analysis.current, "sky", Crosshair
          ], [
            "Major support", analysis.support, "green", ShieldCheck
          ], [
            "Breakout trigger", analysis.breakout, "amber", ArrowUpRight
          ], [
            "Stretch target", analysis.stretch, "violet", Sparkles
          ]] as const).map(([label,value,color,Icon])=><div className={`level-card ${color}`} key={label}><div><Icon size={14}/><span>{label}</span></div><b>{fmt.format(value)}</b><small>{label==="Stretch target"?"Illustrative objective":label==="Major support"?"Nearest demand zone":"Derived from structure"}</small></div>)}</aside>
          <section className="panel read-card"><div className="panel-title"><span><Crosshair size={14}/> The read</span><small>RULE-BASED SYNTHESIS</small></div><p>{analysis.read}</p><div className="disclaimer"><AlertTriangle size={13}/> Technical analysis is informational only. Scenario paths are illustrative and are not predictions or investment advice.</div></section>
        </div>
      </>}
    </div>
  </main>;
}
