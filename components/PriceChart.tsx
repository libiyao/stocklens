"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { CandlestickSeries, ColorType, createChart, HistogramSeries, IChartApi, LineSeries } from "lightweight-charts";
import { calculateSMA } from "@/lib/indicators";
import { ScenarioAnalysis, ScenarioKind } from "@/lib/scenarios";
import { Candle, PriceLevel, VolumeBin } from "@/lib/types";

export interface PriceChartHandle {
  exportPng: (filename?: string) => void;
}

export type ChartViewMode = "focus" | "full";

const SMA_DEFINITIONS = [
  { period: 20, color: "#63b3ff" },
  { period: 50, color: "#b996ff" },
  { period: 100, color: "#f3c969" },
  { period: 200, color: "#ec7fca" },
] as const;

const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

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

function interpolatePath(path: ScenarioAnalysis["scenarios"][number]["path"]) {
  const endOffset = path.at(-1)!.offset;
  return Array.from({ length: endOffset + 1 }, (_, offset) => {
    const rightIndex = path.findIndex(point => point.offset >= offset);
    const right = path[Math.max(0, rightIndex)];
    const left = path[Math.max(0, rightIndex - 1)] ?? right;
    if (right.offset === left.offset) return { offset, value: right.value };
    const progress = (offset - left.offset) / (right.offset - left.offset);
    return { offset, value: left.value + (right.value - left.value) * progress };
  });
}

export const PriceChart = forwardRef<PriceChartHandle, { candles: Candle[]; levels: PriceLevel[]; profile: VolumeBin[]; scenarios: ScenarioAnalysis; viewMode: ChartViewMode }>(function PriceChart({ candles, levels, profile, scenarios, viewMode }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const bullLabel = useRef<HTMLSpanElement>(null);
  const baseLabel = useRef<HTMLSpanElement>(null);
  const bearLabel = useRef<HTMLSpanElement>(null);
  const bullTarget = useRef<HTMLDivElement>(null);
  const baseTarget = useRef<HTMLDivElement>(null);
  const bearTarget = useRef<HTMLDivElement>(null);
  const bullConnector = useRef<HTMLDivElement>(null);
  const baseConnector = useRef<HTMLDivElement>(null);
  const bearConnector = useRef<HTMLDivElement>(null);
  const divider = useRef<HTMLDivElement>(null);
  const decisionZone = useRef<HTMLDivElement>(null);
  const volumeShelf = useRef<HTMLDivElement>(null);
  const volumeLabel = useRef<HTMLSpanElement>(null);
  const maxScenarioOffset = useMemo(() => Math.max(...scenarios.scenarios.flatMap(scenario => scenario.path.map(point => point.offset))), [scenarios]);
  const movingAverages = useMemo(() => {
    const closes = candles.map(candle => candle.close);
    return SMA_DEFINITIONS.map(definition => {
      const values = calculateSMA(closes, definition.period);
      return { ...definition, values, latest: values.at(-1) };
    });
  }, [candles]);
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
    movingAverages.forEach(({ period, color, values }) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: "",
      });
      series.setData(candles.flatMap((c, i) => values[i] == null ? [] : [{ time: c.time, value: values[i]! }]));
      series.applyOptions({ priceLineVisible: false, lastValueVisible: false, title: "" });
    });
    levels.slice(0, 5).forEach(level => candleSeries.createPriceLine({ price: level.price, color: level.type === "support" ? "rgba(34,211,166,.65)" : "rgba(243,201,105,.7)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: level.type === "support" ? "S" : "R" }));

    const lastTime = candles.at(-1)!.time;
    const offsets = Array.from({ length: maxScenarioOffset }, (_, index) => index + 1);
    const dates = futureTradingDays(lastTime, offsets);
    const dateByOffset = new Map(offsets.map((offset, index) => [offset, dates[index]]));
    const labels: Record<ScenarioKind, typeof bullLabel> = { bull: bullLabel, base: baseLabel, bear: bearLabel };
    const connectors: Record<ScenarioKind, typeof bullConnector> = { bull: bullConnector, base: baseConnector, bear: bearConnector };
    const targetBands: Record<ScenarioKind, typeof bullTarget> = { bull: bullTarget, base: baseTarget, bear: bearTarget };
    const scenarioDefinitions = scenarios.scenarios.map(scenario => ({
      ...scenario,
      label: labels[scenario.id],
      connector: connectors[scenario.id],
      targetBand: targetBands[scenario.id],
      end: scenario.path.at(-1)!.value,
      endTime: dateByOffset.get(scenario.path.at(-1)!.offset)!,
      targetStartTime: dateByOffset.get(scenario.path.find(point => point.phase === "target")?.offset ?? scenario.path.at(-1)!.offset)!,
      data: interpolatePath(scenario.path).map(point => ({ time: point.offset === 0 ? lastTime : dateByOffset.get(point.offset)!, value: point.value })),
    }));
    const scenarioSeries = scenarioDefinitions.map(definition => {
      const series = chart.addSeries(LineSeries, { color: definition.color, lineWidth: 2, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      series.setData(definition.data);
      return { ...definition, series };
    });
    chart.timeScale().fitContent();

    const positionScenarioLabels = () => {
      const historyX = chart.timeScale().timeToCoordinate(lastTime);
      if (historyX !== null && divider.current) divider.current.style.left = `${historyX}px`;
      if (historyX !== null) {
        const shelfLeft = Math.max(8, historyX - 98);
        if (volumeShelf.current) volumeShelf.current.style.left = `${shelfLeft}px`;
        if (volumeLabel.current) volumeLabel.current.style.left = `${shelfLeft}px`;
      }
      const decisionTime = dateByOffset.get(scenarios.decisionZone.days);
      const decisionX = decisionTime ? chart.timeScale().timeToCoordinate(decisionTime) : null;
      if (historyX !== null && decisionX !== null && decisionZone.current) {
        decisionZone.current.style.left = `${historyX}px`;
        decisionZone.current.style.width = `${Math.max(22, decisionX - historyX)}px`;
      }
      const wrapperWidth = wrapper.current?.clientWidth ?? 0;
      const labelRailX = Math.max(24, wrapperWidth - 130);
      const positions = scenarioSeries.flatMap(definition => {
        const endX = chart.timeScale().timeToCoordinate(definition.endTime);
        const y = definition.series.priceToCoordinate(definition.end);
        return endX === null || y === null ? [] : [{ ...definition, endX, y, labelY: y - 9 }];
      }).sort((a, b) => a.labelY - b.labelY);
      const minimumLabelY = 42;
      const maximumLabelY = Math.max(minimumLabelY + 60, (container.current?.clientHeight ?? 440) - 128);
      positions.forEach((position, index) => {
        position.labelY = Math.max(minimumLabelY, position.labelY, index === 0 ? minimumLabelY : positions[index - 1].labelY + 25);
      });
      const overflow = Math.max(0, (positions.at(-1)?.labelY ?? 0) - maximumLabelY);
      positions.forEach(position => { position.labelY -= overflow; });

      positions.forEach(({ label, connector, endX, y, labelY }) => {
        if (label.current) {
          label.current.style.left = `${labelRailX}px`;
          label.current.style.top = `${labelY}px`;
        }
        if (connector.current) {
          const destinationX = labelRailX - 4;
          const destinationY = labelY + 9;
          const deltaX = destinationX - endX;
          const deltaY = destinationY - y;
          connector.current.style.left = `${endX}px`;
          connector.current.style.top = `${y}px`;
          connector.current.style.width = `${Math.hypot(deltaX, deltaY)}px`;
          connector.current.style.transform = `rotate(${Math.atan2(deltaY, deltaX)}rad)`;
        }
      });

      scenarioSeries.forEach(({ targetBand, target, targetStartTime, endTime, series }) => {
        const endX = chart.timeScale().timeToCoordinate(endTime);
        const targetStartX = chart.timeScale().timeToCoordinate(targetStartTime);
        const targetTop = series.priceToCoordinate(target.high);
        const targetBottom = series.priceToCoordinate(target.low);
        if (targetBand.current && targetStartX !== null && endX !== null && targetTop !== null && targetBottom !== null) {
          targetBand.current.style.left = `${targetStartX}px`;
          targetBand.current.style.width = `${Math.max(8, Math.min(endX, labelRailX - 8) - targetStartX)}px`;
          targetBand.current.style.top = `${Math.min(targetTop, targetBottom)}px`;
          targetBand.current.style.height = `${Math.max(5, Math.abs(targetBottom - targetTop))}px`;
        }
      });
    };
    requestAnimationFrame(positionScenarioLabels);
    chart.timeScale().subscribeVisibleLogicalRangeChange(positionScenarioLabels);
    const observer = new ResizeObserver(([entry]) => { chart.applyOptions({ width: entry.contentRect.width }); requestAnimationFrame(positionScenarioLabels); });
    observer.observe(container.current);
    return () => { chartApi.current = null; observer.disconnect(); chart.timeScale().unsubscribeVisibleLogicalRangeChange(positionScenarioLabels); chart.remove(); };
  }, [candles, levels, maxScenarioOffset, movingAverages, scenarios]);
  useEffect(() => {
    const chart = chartApi.current;
    if (!chart) return;
    const historyBars = viewMode === "focus" ? Math.min(115, candles.length) : candles.length;
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(-1, candles.length - historyBars - 1),
      to: candles.length - 1 + maxScenarioOffset + 18,
    });
  }, [candles.length, maxScenarioOffset, viewMode]);
  const maxVolume = Math.max(...profile.map(p => p.volume));
  return (
    <div ref={wrapper} className="relative overflow-hidden">
      <div ref={container} />
      <div ref={decisionZone} className="scenario-decision-zone"><span>{scenarios.decisionZone.days}D decision zone</span></div>
      <div ref={divider} className="scenario-divider"><span>HISTORY</span><span>CONDITIONAL</span></div>
      <span ref={bullLabel} className="scenario-label bull">Bull · {scenarios.scenarios.find(scenario => scenario.id === "bull")?.setupWeight}%</span>
      <span ref={baseLabel} className="scenario-label base">Base · {scenarios.scenarios.find(scenario => scenario.id === "base")?.setupWeight}%</span>
      <span ref={bearLabel} className="scenario-label bear">Bear · {scenarios.scenarios.find(scenario => scenario.id === "bear")?.setupWeight}%</span>
      <div ref={bullConnector} className="scenario-connector bull" />
      <div ref={baseConnector} className="scenario-connector base" />
      <div ref={bearConnector} className="scenario-connector bear" />
      <div ref={bullTarget} className="scenario-target-band bull" />
      <div ref={baseTarget} className="scenario-target-band base" />
      <div ref={bearTarget} className="scenario-target-band bear" />
      <div ref={volumeShelf} className="volume-profile-shelf pointer-events-none absolute top-9 bottom-[106px] w-[5.5rem] flex flex-col-reverse justify-stretch">
        {profile.map((bin, i) => <div key={i} className="flex-1 flex items-center justify-end"><div className="h-[85%] bg-violet-400/60 border-r border-violet-300" style={{ width: `${(bin.volume / maxVolume) * 100}%` }} /></div>)}
      </div>
      <div className="sma-legend absolute left-3 top-2 flex flex-wrap gap-3 text-[10px] font-medium tracking-wide text-slate-400">
        {movingAverages.map(({ period, color, latest }) => <span key={period} className="flex items-center gap-1"><i className="h-0.5 w-3" style={{ background: color }} />SMA{period}<b>{latest == null ? "—" : priceFormat.format(latest)}</b></span>)}
      </div>
      <span ref={volumeLabel} className="volume-profile-label absolute top-2 text-[8px] uppercase tracking-widest text-violet-300/70">Volume shelf</span>
    </div>
  );
});
