"use client";

import { useEffect, useRef } from "react";
import { AreaSeries, ColorType, createChart, HistogramSeries, UTCTimestamp } from "lightweight-charts";
import { IntradayCandle } from "@/lib/types";

const volumeColors = {
  pre: "rgba(243,201,105,.34)",
  regular: "rgba(99,179,255,.3)",
  post: "rgba(185,150,255,.34)",
} as const;

export function IntradayChart({ candles }: { candles: IntradayCandle[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !candles.length) return;
    const chart = createChart(container.current, {
      width: container.current.clientWidth,
      height: 190,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#6e7c94", fontFamily: "Inter, sans-serif", fontSize: 10 },
      grid: { vertLines: { color: "#152035" }, horzLines: { color: "#152035" } },
      rightPriceScale: { borderColor: "#243047", scaleMargins: { top: .1, bottom: .26 } },
      timeScale: { borderColor: "#243047", timeVisible: true, secondsVisible: false },
      crosshair: { vertLine: { color: "#4c5d77", labelBackgroundColor: "#27344c" }, horzLine: { color: "#4c5d77", labelBackgroundColor: "#27344c" } },
    });
    const priceSeries = chart.addSeries(AreaSeries, {
      lineColor: "#63b3ff",
      topColor: "rgba(99,179,255,.2)",
      bottomColor: "rgba(99,179,255,.01)",
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });
    priceSeries.setData(candles.map(candle => ({ time: candle.timestamp as UTCTimestamp, value: candle.close })));
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "intraday-volume", lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("intraday-volume").applyOptions({ scaleMargins: { top: .8, bottom: 0 } });
    volumeSeries.setData(candles.map(candle => ({ time: candle.timestamp as UTCTimestamp, value: candle.volume, color: volumeColors[candle.session] })));
    chart.timeScale().fitContent();
    const observer = new ResizeObserver(([entry]) => chart.applyOptions({ width: entry.contentRect.width }));
    observer.observe(container.current);
    return () => { observer.disconnect(); chart.remove(); };
  }, [candles]);

  return <div ref={container} className="intraday-chart" />;
}
