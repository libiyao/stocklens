"use client";

import { CheckCircle2, Copy, Download, ImageDown } from "lucide-react";

interface DataQualityBarProps {
  source: string;
  lastCandleDate: string;
  candleCount: number;
  onCopyLink: () => void;
  onExportReport: () => void;
  onExportChart: () => void;
  copied: boolean;
}

export function DataQualityBar({ source, lastCandleDate, candleCount, onCopyLink, onExportReport, onExportChart, copied }: DataQualityBarProps) {
  return (
    <div className="data-quality-bar">
      <div className="data-quality-items">
        <span><CheckCircle2 size={12} /> Real OHLCV</span>
        <span>Source <b>{source}</b></span>
        <span>Last candle <b>{lastCandleDate}</b></span>
        <span><b>{candleCount.toLocaleString()}</b> sessions</span>
        <span>Daily data may be delayed</span>
      </div>
      <div className="data-actions">
        <button onClick={onCopyLink}><Copy size={12} /> {copied ? "Copied" : "Share"}</button>
        <button onClick={onExportChart}><ImageDown size={12} /> Chart PNG</button>
        <button onClick={onExportReport}><Download size={12} /> Analysis</button>
      </div>
    </div>
  );
}
