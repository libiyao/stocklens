"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRightLeft, LoaderCircle } from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";
import { calculateRelativePerformance } from "@/lib/comparison";
import { Candle, TimeRange } from "@/lib/types";

interface ComparePanelProps {
  primaryTicker: string;
  primaryCandles: Candle[];
  range: TimeRange;
}

export function ComparePanel({ primaryTicker, primaryCandles, range }: ComparePanelProps) {
  const [query, setQuery] = useState("SPY");
  const [comparisonTicker, setComparisonTicker] = useState("SPY");
  const { data, loading, error } = useMarketData(comparisonTicker, range, comparisonTicker !== primaryTicker);
  const comparison = useMemo(() => data ? calculateRelativePerformance(primaryCandles, data.candles) : null, [data, primaryCandles]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim().toUpperCase();
    if (value && value !== primaryTicker) setComparisonTicker(value);
  };

  return (
    <section className="panel utility-card">
      <div className="panel-title"><span><ArrowRightLeft size={14} /> Relative performance</span><small>SELECTED RANGE</small></div>
      <div className="utility-body">
        <form className="compare-form" onSubmit={submit}>
          <label>Compare {primaryTicker} with</label>
          <div><input aria-label="Comparison ticker" value={query} onChange={event => setQuery(event.target.value.toUpperCase())} /><button>Compare</button></div>
        </form>
        {loading && <div className="utility-loading"><LoaderCircle size={16} className="animate-spin" /> Loading comparison</div>}
        {!loading && error && <p className="utility-error">{error}</p>}
        {!loading && comparison && data && (
          <div className="comparison-stats">
            <div><span>{primaryTicker}</span><b className={comparison.primaryReturn >= 0 ? "positive" : "negative"}>{comparison.primaryReturn >= 0 ? "+" : ""}{comparison.primaryReturn.toFixed(1)}%</b></div>
            <div><span>{data.meta.symbol}</span><b className={comparison.comparisonReturn >= 0 ? "positive" : "negative"}>{comparison.comparisonReturn >= 0 ? "+" : ""}{comparison.comparisonReturn.toFixed(1)}%</b></div>
            <div className="spread"><span>Relative spread</span><b className={comparison.relativeSpread >= 0 ? "positive" : "negative"}>{comparison.relativeSpread >= 0 ? "+" : ""}{comparison.relativeSpread.toFixed(1)} pts</b></div>
          </div>
        )}
      </div>
    </section>
  );
}
