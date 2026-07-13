import { Candle, PriceLevel, TechnicalScores, VolumeBin } from "./types";

export function calculateSMA(values: number[], period: number): (number | null)[] {
  let sum = 0;
  return values.map((value, index) => {
    sum += value;
    if (index >= period) sum -= values[index - period];
    return index >= period - 1 ? sum / period : null;
  });
}

function calculateEMA(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  return values.reduce<number[]>((out, value, index) => {
    out.push(index === 0 ? value : value * k + out[index - 1] * (1 - k));
    return out;
  }, []);
}

export function calculateRSI(values: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);
  if (values.length <= period) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    gains += Math.max(0, change);
    losses += Math.max(0, -change);
  }
  let avgGain = gains / period, avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, change)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -change)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export function calculateMACD(values: number[]) {
  const fast = calculateEMA(values, 12), slow = calculateEMA(values, 26);
  const macd = values.map((_, i) => fast[i] - slow[i]);
  const signal = calculateEMA(macd, 9);
  return { macd, signal, histogram: macd.map((v, i) => v - signal[i]) };
}

export function calculateVolumeProfile(candles: Candle[], bins = 24): VolumeBin[] {
  if (!candles.length) return [];
  const min = Math.min(...candles.map(c => c.low));
  const max = Math.max(...candles.map(c => c.high));
  const step = (max - min) / bins || 1;
  const profile = Array.from({ length: bins }, (_, i) => ({ low: min + i * step, high: min + (i + 1) * step, volume: 0 }));
  candles.forEach(c => {
    const typical = (c.high + c.low + c.close) / 3;
    const index = Math.min(bins - 1, Math.max(0, Math.floor((typical - min) / step)));
    profile[index].volume += c.volume;
  });
  return profile;
}

export function detectSupportResistance(candles: Candle[]): PriceLevel[] {
  if (candles.length < 10) return [];
  const candidates: { price: number; type: "support" | "resistance" }[] = [];
  const window = 4;
  for (let i = window; i < candles.length - window; i++) {
    const nearby = candles.slice(i - window, i + window + 1);
    if (candles[i].low === Math.min(...nearby.map(c => c.low))) candidates.push({ price: candles[i].low, type: "support" });
    if (candles[i].high === Math.max(...nearby.map(c => c.high))) candidates.push({ price: candles[i].high, type: "resistance" });
  }
  const tolerance = candles.at(-1)!.close * 0.018;
  const clusters: PriceLevel[] = [];
  candidates.forEach(candidate => {
    const match = clusters.find(level => level.type === candidate.type && Math.abs(level.price - candidate.price) <= tolerance);
    if (match) {
      match.price = (match.price * match.touches + candidate.price) / (match.touches + 1);
      match.touches += 1;
      match.strength = Math.min(100, match.touches * 18);
    } else clusters.push({ ...candidate, touches: 1, strength: 18 });
  });
  const current = candles.at(-1)!.close;
  return clusters.filter(l => l.type === "support" ? l.price < current : l.price > current).sort((a, b) => b.strength - a.strength || Math.abs(a.price - current) - Math.abs(b.price - current));
}

export function calculateTechnicalScores(candles: Candle[], levels: PriceLevel[]): TechnicalScores {
  const closes = candles.map(c => c.close), current = closes.at(-1)!;
  const sma20 = calculateSMA(closes, 20).at(-1), sma50 = calculateSMA(closes, 50).at(-1), sma200 = calculateSMA(closes, 200).at(-1);
  const rsi = calculateRSI(closes).at(-1) ?? 50;
  const macd = calculateMACD(closes);
  const hist = macd.histogram.at(-1) ?? 0;
  const averageVolume = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / Math.min(20, candles.length);
  const volumeRatio = candles.at(-1)!.volume / (averageVolume || 1);
  const trend = Math.round(50 + (sma20 && current > sma20 ? 14 : -14) + (sma50 && current > sma50 ? 13 : -13) + (sma200 && current > sma200 ? 13 : -13));
  const momentum = Math.round(Math.max(0, Math.min(100, 50 + (rsi - 50) * 0.7 + (hist > 0 ? 15 : -15))));
  const volume = Math.round(Math.max(20, Math.min(100, 45 + (volumeRatio - 1) * 35)));
  const structure = Math.round(Math.min(100, 45 + Math.min(3, levels.filter(l => l.strength >= 36).length) * 12));
  const overall = Math.round(trend * .35 + momentum * .3 + volume * .15 + structure * .2);
  return { trend, momentum, volume, structure, overall };
}

export function generateTheRead(candles: Candle[], scores: TechnicalScores, levels: PriceLevel[]): string {
  const close = candles.at(-1)!.close;
  const sma50 = calculateSMA(candles.map(c => c.close), 50).at(-1);
  const support = levels.find(l => l.type === "support");
  const resistance = levels.find(l => l.type === "resistance");
  const posture = scores.overall >= 65 ? "constructive" : scores.overall <= 40 ? "defensive" : "balanced";
  const trend = sma50 && close > sma50 ? "above its 50-day trend" : "below its 50-day trend";
  return `The tape is ${posture}, with price trading ${trend}. ${resistance ? `A decisive close above ${resistance.price.toFixed(2)} would improve the structure` : "No clean overhead trigger is established"}${support ? `, while ${support.price.toFixed(2)} is the key level for buyers to defend.` : "."} Momentum and participation should confirm any break; the scenario paths shown are illustrative, not forecasts.`;
}
