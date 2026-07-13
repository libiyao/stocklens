import { Candle } from "./types";

export interface RelativePerformance {
  primaryReturn: number;
  comparisonReturn: number;
  relativeSpread: number;
  primaryStart: string;
  comparisonStart: string;
}

function totalReturn(candles: Candle[]) {
  const first = candles.at(0);
  const last = candles.at(-1);
  if (!first || !last || first.close === 0) return 0;
  return (last.close / first.close - 1) * 100;
}

export function calculateRelativePerformance(primary: Candle[], comparison: Candle[]): RelativePerformance | null {
  if (primary.length < 2 || comparison.length < 2) return null;
  const primaryReturn = totalReturn(primary);
  const comparisonReturn = totalReturn(comparison);
  return {
    primaryReturn,
    comparisonReturn,
    relativeSpread: primaryReturn - comparisonReturn,
    primaryStart: primary[0].time,
    comparisonStart: comparison[0].time,
  };
}
