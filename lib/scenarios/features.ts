import { calculateMACD, calculateRSI, calculateSMA } from "../indicators";
import { Candle, VolumeBin } from "../types";

export interface ScenarioFeatures {
  current: number;
  atr: number;
  atrPct: number;
  atrPercentile: number;
  compression: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  trendSignal: number;
  momentumSignal: number;
  volumeSignal: number;
  structureSignal: number;
  rangePosition: number;
  rsi: number;
  macdHistogram: number;
  macdImproving: boolean;
  latestVolumeRatio: number;
  upVolumeShare: number;
  pointOfControl: number;
}

const clamp = (value: number, min = -1, max = 1) => Math.min(max, Math.max(min, value));

function trueRanges(candles: Candle[]) {
  return candles.map((candle, index) => {
    const previousClose = candles[index - 1]?.close ?? candle.close;
    return Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
  });
}

function rollingAverage(values: number[], period: number) {
  return values.map((_, index) => {
    if (index < period - 1) return null;
    const sample = values.slice(index - period + 1, index + 1);
    return sample.reduce((sum, value) => sum + value, 0) / period;
  });
}

function percentileRank(values: number[], current: number) {
  if (!values.length) return 0.5;
  return values.filter(value => value <= current).length / values.length;
}

function movingAverageSignal(values: (number | null)[], current: number, atr: number) {
  const latest = values.at(-1);
  if (latest == null) return null;
  const prior = values.at(-11) ?? latest;
  const position = clamp((current - latest) / Math.max(atr * 1.5, current * 0.005));
  const slope = clamp((latest - prior) / Math.max(atr * 1.5, current * 0.005));
  return position * 0.65 + slope * 0.35;
}

function pointOfControl(profile: VolumeBin[], fallback: number) {
  const strongest = [...profile].sort((a, b) => b.volume - a.volume)[0];
  return strongest ? (strongest.low + strongest.high) / 2 : fallback;
}

export function calculateScenarioFeatures(candles: Candle[], support: number, breakout: number, profile: VolumeBin[]): ScenarioFeatures {
  const closes = candles.map(candle => candle.close);
  const current = closes.at(-1)!;
  const ranges = trueRanges(candles);
  const atrSeries = rollingAverage(ranges, 14).filter((value): value is number => value != null);
  const atr = atrSeries.at(-1) ?? ranges.at(-1) ?? current * 0.02;
  const recentAtr = atrSeries.slice(-252);
  const atrPercentile = percentileRank(recentAtr, atr);
  const sma20Values = calculateSMA(closes, 20);
  const sma50Values = calculateSMA(closes, 50);
  const sma200Values = calculateSMA(closes, 200);
  const averageSignals = [
    movingAverageSignal(sma20Values, current, atr),
    movingAverageSignal(sma50Values, current, atr),
    movingAverageSignal(sma200Values, current, atr),
  ].filter((value): value is number => value != null && Number.isFinite(value));
  const trendSignal = clamp(averageSignals.reduce((sum, value) => sum + value, 0) / Math.max(1, averageSignals.length));
  const rsi = calculateRSI(closes).at(-1) ?? 50;
  const macd = calculateMACD(closes).histogram;
  const macdHistogram = macd.at(-1) ?? 0;
  const macdPrior = macd.at(-4) ?? macdHistogram;
  const momentumSignal = clamp(clamp((rsi - 50) / 22) * 0.55 + clamp(macdHistogram / Math.max(atr * 0.12, current * 0.001)) * 0.3 + clamp((macdHistogram - macdPrior) / Math.max(atr * 0.08, current * 0.0005)) * 0.15);
  const recent = candles.slice(-20);
  const averageVolume = recent.reduce((sum, candle) => sum + candle.volume, 0) / Math.max(1, recent.length);
  const latest = candles.at(-1)!;
  const latestVolumeRatio = latest.volume / Math.max(1, averageVolume);
  const upVolume = recent.filter(candle => candle.close >= candle.open).reduce((sum, candle) => sum + candle.volume, 0);
  const totalVolume = recent.reduce((sum, candle) => sum + candle.volume, 0);
  const upVolumeShare = upVolume / Math.max(1, totalVolume);
  const directionalLatest = latest.close >= latest.open ? 1 : -1;
  const volumeSignal = clamp((upVolumeShare - 0.5) * 2 * 0.65 + directionalLatest * clamp(latestVolumeRatio - 1, -0.75, 1.25) * 0.35);
  const rangeWidth = Math.max(breakout - support, atr);
  const rangePosition = clamp((current - support) / rangeWidth, 0, 1);
  const structureSignal = clamp(rangePosition * 2 - 1);

  return {
    current,
    atr,
    atrPct: atr / current * 100,
    atrPercentile,
    compression: 1 - atrPercentile,
    sma20: sma20Values.at(-1) ?? null,
    sma50: sma50Values.at(-1) ?? null,
    sma200: sma200Values.at(-1) ?? null,
    trendSignal,
    momentumSignal,
    volumeSignal,
    structureSignal,
    rangePosition,
    rsi,
    macdHistogram,
    macdImproving: macdHistogram > macdPrior,
    latestVolumeRatio,
    upVolumeShare,
    pointOfControl: pointOfControl(profile, (support + breakout) / 2),
  };
}
