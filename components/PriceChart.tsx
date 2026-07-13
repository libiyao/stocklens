"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { CandlestickSeries, ColorType, createChart, HistogramSeries, IChartApi, LineSeries } from "lightweight-charts";
import { calculateSMA } from "@/lib/indicators";
import { Candle, PriceLevel, VolumeBin } from "@/lib/types";

interface ScenarioTargets {
  current: number;
  support: number;
  breakout: number;
  stretch: number;
}

export interface PriceChartHandle {
  exportPng: (filename?: string) => void;
}

function futureTradingDays(from: string, offsets: number[]) {
  const date = new Date(`${from}T12:00:00Z`);
  const dates: string[] = [];
  let tradingDay = 0;
  while (tradingDay < Math.max(...offsets)) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) tradingDay += 1;
    if (offsets.includes(tradingDay)) dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

export const PriceChart = forwardRef<PriceChartHandle, { candles: Candle[]; levels: PriceLevel[]; profile: VolumeBin[]; targets: ScenarioTargets }>(function PriceChart({ candles, levels, profile, targets }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const bullLabel = useRef<HTMLSpanElement>(null);
  const baseLabel = useRef<HTMLSpanElement>(null);
  const bearLabel = useRef<HTMLSpanElement>(null);
  const divider = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({
    exportPng(filename = "stocklens-chart.png") {
      const canvas = chartApi.current?.takeScreenshot();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    },
  }), []);
  useEffect(() => {
    if (!container.current) return;
    const chart = createChart(container.current, {
      width: container.current.clientWidth, height: 440,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#74809a", fontFamily: "Inter, sans-serif", fontSize: 11 },
      grid: { vertLines: { color: "#162033" }, horzLines: { color: "#162033" } },
      rightPriceScale: { borderColor: "#243047", scaleMargins: { top: .08, bottom: .24 } },
      timeScale: { borderColor: "#243047", timeVisible: false, rightOffset: 2 },
      crosshair: { vertLine: { color: "#53627c", labelBackgroundColor: "#27344c" }, horzLine: { color: "#53627c", labelBackgroundColor: "#27344c" } },
    });
    chartApi.current = chart;
    const candleSeries = chart.addSeries(CandlestickSeries, { upColor: "#22d3a6", downColor: "#f35f73", wickUpColor: "#22d3a6", wickDownColor: "#f35f73", borderVisible: false });
    candleSeries.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: .82, bottom: 0 } });
    volumeSeries.setData(candles.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? "rgba(34,211,166,.32)" : "rgba(243,95,115,.3)" })));
    const colors = ["#63b3ff", "#b996ff", "#f3c969", "#ec7fca"];
    [20, 50, 100, 200].forEach((period, n) => {
      const values = calculateSMA(candles.map(c => c.close), period);
      const series = chart.addSeries(LineSeries, { color: colors[n], lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: `SMA ${period}` });
      series.setData(candles.flatMap((c, i) => values[i] == null ? [] : [{ time: c.time, value: values[i]! }]));
    });
    levels.slice(0, 5).forEach(level => candleSeries.createPriceLine({ price: level.price, color: level.type === "support" ? "rgba(34,211,166,.65)" : "rgba(243,201,105,.7)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: level.type === "support" ? "S" : "R" }));

    const lastTime = candles.at(-1)!.time;
    const [day7, day15, day28] = futureTradingDays(lastTime, [7, 15, 28]);
    const downside = Math.max(0.01, targets.support - (targets.current - targets.support) * .7);
    const scenarioDefinitions = [
      { label: bullLabel, color: "#22d3a6", end: targets.stretch, data: [{ time: lastTime, value: targets.current }, { time: day7, value: targets.breakout }, { time: day15, value: targets.breakout * 1.025 }, { time: day28, value: targets.stretch }] },
      { label: baseLabel, color: "#7f91aa", end: targets.support, data: [{ time: lastTime, value: targets.current }, { time: day7, value: (targets.current + targets.support) / 2 }, { time: day15, value: targets.support * 1.015 }, { time: day28, value: targets.support }] },
      { label: bearLabel, color: "#f35f73", end: downside, data: [{ time: lastTime, value: targets.current }, { time: day7, value: targets.support }, { time: day15, value: targets.support * .96 }, { time: day28, value: downside }] },
    ];
    const scenarioSeries = scenarioDefinitions.map(definition => {
      const series = chart.addSeries(LineSeries, { color: definition.color, lineWidth: 2, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      series.setData(definition.data);
      return { ...definition, series };
    });
    chart.timeScale().fitContent();

    const positionScenarioLabels = () => {
      const endX = chart.timeScale().timeToCoordinate(day28);
      const historyX = chart.timeScale().timeToCoordinate(lastTime);
      if (historyX !== null && divider.current) divider.current.style.left = `${historyX}px`;
      scenarioSeries.forEach(({ label, end, series }) => {
        const y = series.priceToCoordinate(end);
        if (label.current && endX !== null && y !== null) {
          label.current.style.left = `${Math.min(endX + 7, (wrapper.current?.clientWidth ?? endX) - 76)}px`;
          label.current.style.top = `${Math.max(25, y - 9)}px`;
        }
      });
    };
    requestAnimationFrame(positionScenarioLabels);
    chart.timeScale().subscribeVisibleLogicalRangeChange(positionScenarioLabels);
    const observer = new ResizeObserver(([entry]) => { chart.applyOptions({ width: entry.contentRect.width }); requestAnimationFrame(positionScenarioLabels); });
    observer.observe(container.current);
    return () => { chartApi.current = null; observer.disconnect(); chart.timeScale().unsubscribeVisibleLogicalRangeChange(positionScenarioLabels); chart.remove(); };
  }, [candles, levels, targets]);
  const maxVolume = Math.max(...profile.map(p => p.volume));
  return (
    <div ref={wrapper} className="relative overflow-hidden">
      <div ref={container} />
      <div ref={divider} className="scenario-divider"><span>HISTORY</span><span>SCENARIOS</span></div>
      <span ref={bullLabel} className="scenario-label bull">Bull path</span>
      <span ref={baseLabel} className="scenario-label base">Base path</span>
      <span ref={bearLabel} className="scenario-label bear">Bear path</span>
      <div className="pointer-events-none absolute right-12 top-9 bottom-[106px] w-24 opacity-40 flex flex-col-reverse justify-stretch">
        {profile.map((bin, i) => <div key={i} className="flex-1 flex items-center justify-end"><div className="h-[85%] bg-violet-400/60 border-r border-violet-300" style={{ width: `${(bin.volume / maxVolume) * 100}%` }} /></div>)}
      </div>
      <div className="absolute left-3 top-2 flex flex-wrap gap-3 text-[10px] font-medium tracking-wide text-slate-400">
        {[['#63b3ff','SMA20'],['#b996ff','SMA50'],['#f3c969','SMA100'],['#ec7fca','SMA200']].map(([color,label]) => <span key={label} className="flex items-center gap-1"><i className="h-0.5 w-3" style={{background: color}} />{label}</span>)}
      </div>
      <span className="absolute right-14 top-2 text-[9px] uppercase tracking-widest text-violet-300/70">Volume profile · paths illustrative</span>
    </div>
  );
});
