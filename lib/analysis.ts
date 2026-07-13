import { calculateMACD, calculateRSI, calculateTechnicalScores, calculateVolumeProfile, detectSupportResistance, generateTheRead } from "./indicators";
import { Candle, MarketResponse, PriceLevel, TechnicalScores, VolumeBin } from "./types";

export interface TechnicalAnalysis {
  candles: Candle[];
  levels: PriceLevel[];
  scores: TechnicalScores;
  current: number;
  previous: number;
  change: number;
  changePct: number;
  support: number;
  breakout: number;
  stretch: number;
  downside: number;
  rsi: number[];
  macd: number[];
  profile: VolumeBin[];
  read: string;
  explanations: string[];
  dataQuality: {
    lastCandleDate: string;
    candleCount: number;
    source: string;
  };
}

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function averageTrueRange(candles: Candle[], period = 14) {
  const sample = candles.slice(-period);
  return sample.reduce((sum, candle, index) => {
    const previousClose = index === 0 ? candle.close : sample[index - 1].close;
    const trueRange = Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
    return sum + trueRange;
  }, 0) / Math.max(1, sample.length);
}

function nearestLevels(levels: PriceLevel[], current: number) {
  const support = levels.filter(level => level.type === "support" && level.price < current).sort((a, b) => b.price - a.price)[0];
  const resistance = levels.filter(level => level.type === "resistance" && level.price > current).sort((a, b) => a.price - b.price)[0];
  return { support, resistance };
}

function buildExplanations(candles: Candle[], scores: TechnicalScores, levels: PriceLevel[], current: number) {
  const { support, resistance } = nearestLevels(levels, current);
  const latestVolume = candles.at(-1)!.volume;
  const averageVolume = candles.slice(-20).reduce((sum, candle) => sum + candle.volume, 0) / Math.min(20, candles.length);
  const rsi = calculateRSI(candles.map(candle => candle.close)).at(-1) ?? 50;
  return [
    `Trend score is ${scores.trend}/100 based on price location versus major moving averages.`,
    `Momentum score is ${scores.momentum}/100 with RSI near ${Math.round(rsi)} and MACD histogram direction folded into the model.`,
    `Volume score is ${scores.volume}/100; latest volume is ${(latestVolume / Math.max(1, averageVolume)).toFixed(2)}× the recent 20-day average.`,
    support ? `Nearest support is ${numberFormat.format(support.price)}, ${Math.abs((current / support.price - 1) * 100).toFixed(1)}% below the current price.` : "No nearby support cluster was detected in the visible range.",
    resistance ? `Nearest breakout trigger is ${numberFormat.format(resistance.price)}, ${Math.abs((resistance.price / current - 1) * 100).toFixed(1)}% above the current price.` : "No nearby resistance cluster was detected in the visible range.",
  ];
}

export function buildTechnicalAnalysis(data: MarketResponse): TechnicalAnalysis {
  const candles = data.candles;
  const closes = candles.map(candle => candle.close);
  const levels = detectSupportResistance(candles);
  const scores = calculateTechnicalScores(candles, levels);
  const current = closes.at(-1)!;
  const previous = closes.at(-2) ?? current;
  const change = current - previous;
  const changePct = previous === 0 ? 0 : (change / previous) * 100;
  const atr = averageTrueRange(candles);
  const { support, resistance } = nearestLevels(levels, current);
  const supportPrice = support?.price ?? Math.max(0.01, current - atr * 2);
  const breakout = resistance?.price ?? current + atr;
  const stretch = breakout + atr * 2.5;
  const downside = Math.max(0.01, supportPrice - (current - supportPrice) * 0.7);

  return {
    candles,
    levels,
    scores,
    current,
    previous,
    change,
    changePct,
    support: supportPrice,
    breakout,
    stretch,
    downside,
    rsi: calculateRSI(closes).map(value => value ?? 50),
    macd: calculateMACD(closes).histogram,
    profile: calculateVolumeProfile(candles),
    read: generateTheRead(candles, scores, levels),
    explanations: buildExplanations(candles, scores, levels, current),
    dataQuality: {
      lastCandleDate: candles.at(-1)!.time,
      candleCount: candles.length,
      source: data.meta.source,
    },
  };
}
