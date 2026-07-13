import { Candle } from "../types";
import { calculateScenarioFeatures, ScenarioFeatures } from "./features";
import { MarketScenario, PriceRange, ScenarioAnalysis, ScenarioConfidence, ScenarioEngineInput, ScenarioEvidence, ScenarioKind } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function normalizeWeights(raw: Record<ScenarioKind, number>): Record<ScenarioKind, number> {
  const entries = Object.entries(raw) as Array<[ScenarioKind, number]>;
  const exponents = entries.map(([id, score]) => [id, Math.exp(clamp(score, -1.35, 1.35) / 1.05)] as const);
  const total = exponents.reduce((sum, [, value]) => sum + value, 0);
  const exact = exponents.map(([id, value]) => ({ id, value: value / total * 100 }));
  const weights = Object.fromEntries(exact.map(item => [item.id, Math.floor(item.value)])) as Record<ScenarioKind, number>;
  let remaining = 100 - Object.values(weights).reduce((sum, value) => sum + value, 0);
  exact.sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value))).forEach(item => {
    if (remaining > 0) {
      weights[item.id] += 1;
      remaining -= 1;
    }
  });
  return weights;
}

function factorContributions(kind: ScenarioKind, features: ScenarioFeatures) {
  if (kind === "bull") return {
    Trend: features.trendSignal * 25,
    Momentum: features.momentumSignal * 20,
    Structure: features.structureSignal * 25,
    Volume: features.volumeSignal * 15,
    Volatility: (features.atrPercentile - 0.45) * 15 * 0.55,
  };
  if (kind === "bear") return {
    Trend: -features.trendSignal * 25,
    Momentum: -features.momentumSignal * 20,
    Structure: -features.structureSignal * 25,
    Volume: -features.volumeSignal * 15,
    Volatility: (features.atrPercentile - 0.45) * 15 * 0.55,
  };
  return {
    Trend: (0.45 - Math.abs(features.trendSignal)) * 25,
    Momentum: (0.45 - Math.abs(features.momentumSignal)) * 20,
    Structure: (0.45 - Math.abs(features.structureSignal)) * 25,
    Volume: (0.45 - Math.abs(features.volumeSignal)) * 15,
    Volatility: (features.compression - 0.4) * 15,
  };
}

function evidence(kind: ScenarioKind, features: ScenarioFeatures, support: number, breakout: number): ScenarioEvidence[] {
  const contributions = factorContributions(kind, features);
  const availableAverages = [features.sma20, features.sma50, features.sma200].filter((value): value is number => value != null);
  const averagesAbove = availableAverages.filter(value => features.current > value).length;
  const details = {
    Trend: `Price is above ${averagesAbove} of ${availableAverages.length} available moving averages; the combined trend signal is ${features.trendSignal >= 0 ? "positive" : "negative"}.`,
    Momentum: `RSI is ${Math.round(features.rsi)} and MACD momentum is ${features.macdHistogram >= 0 ? "positive" : "negative"}${features.macdImproving ? " and improving" : " and fading"}.`,
    Structure: `Price is ${Math.round(features.rangePosition * 100)}% through the ${fmt.format(support)}–${fmt.format(breakout)} decision range.`,
    Volume: `Latest volume is ${features.latestVolumeRatio.toFixed(2)}× its 20-day average; up-volume represents ${Math.round(features.upVolumeShare * 100)}% of recent participation.`,
    Volatility: `ATR is ${features.atrPct.toFixed(1)}% of price and sits in the ${Math.round(features.atrPercentile * 100)}th percentile of the recent sample.`,
  } as const;

  return (Object.entries(contributions) as Array<[ScenarioEvidence["factor"], number]>).map(([factor, contribution]) => ({
    factor,
    contribution: Math.round(contribution),
    impact: contribution > 2 ? "supporting" : contribution < -2 ? "opposing" : "neutral",
    detail: details[factor],
  }));
}

function safeRange(low: number, high: number, fallback: number, atr: number): PriceRange {
  if (Number.isFinite(low) && Number.isFinite(high) && high > low) return { low: Math.max(0.01, low), high };
  return { low: Math.max(0.01, fallback - atr * 0.5), high: fallback + atr * 0.5 };
}

function confidence(weights: Record<ScenarioKind, number>): ScenarioConfidence {
  const ordered = Object.values(weights).sort((a, b) => b - a);
  const spread = ordered[0] - ordered[1];
  if (ordered[0] >= 55 && spread >= 20) return "High";
  if (ordered[0] >= 42 && spread >= 9) return "Moderate";
  return "Low";
}

function regime(features: ScenarioFeatures) {
  const volatility = features.atrPercentile >= 0.7 ? "expanding volatility" : features.atrPercentile <= 0.3 ? "compressed volatility" : "normal volatility";
  const direction = features.trendSignal >= 0.45 ? "uptrend" : features.trendSignal <= -0.45 ? "downtrend" : "range transition";
  return `${direction} · ${volatility}`;
}

export function calculateScenarios(candles: Candle[], input: ScenarioEngineInput): ScenarioAnalysis {
  const features = calculateScenarioFeatures(candles, input.support, input.breakout, input.profile);
  const contributions = {
    bull: factorContributions("bull", features),
    base: factorContributions("base", features),
    bear: factorContributions("bear", features),
  };
  const raw = Object.fromEntries((Object.entries(contributions) as Array<[ScenarioKind, Record<string, number>]>).map(([kind, factors]) => [
    kind,
    Object.values(factors).reduce((sum, value) => sum + value, 0) / 38,
  ])) as Record<ScenarioKind, number>;
  const weights = normalizeWeights(raw);
  const atr = features.atr;
  const current = features.current;
  const decisionDays = 5;
  const decisionZone = safeRange(Math.max(input.support, current - atr * 0.65), Math.min(input.breakout, current + atr * 0.65), current, atr);
  const bullMid = Math.max(input.stretch, input.breakout + atr * 2.2);
  const bullTarget = safeRange(Math.max(input.breakout + atr * 1.25, bullMid - atr * 0.6), bullMid + atr * 0.6, bullMid, atr);
  const baseCenter = clamp(features.pointOfControl, input.support + atr * 0.35, input.breakout - atr * 0.35);
  const baseTarget = safeRange(Math.max(input.support, baseCenter - atr * 0.65), Math.min(input.breakout, baseCenter + atr * 0.65), baseCenter, atr);
  const bearMid = Math.min(input.downside, input.support - atr * 1.6);
  const bearTarget = safeRange(bearMid - atr * 0.55, Math.min(input.support - atr * 0.45, bearMid + atr * 0.55), bearMid, atr);
  const leadingScenario = (Object.entries(weights) as Array<[ScenarioKind, number]>).sort((a, b) => b[1] - a[1])[0][0];

  const scenarios: MarketScenario[] = [
    {
      id: "bull",
      label: "Bull scenario",
      color: "#22d3a6",
      setupWeight: weights.bull,
      horizonDays: 28,
      trigger: { label: `Daily close above ${fmt.format(input.breakout)} with volume confirmation`, price: input.breakout },
      invalidation: { label: `Close below major support at ${fmt.format(input.support)}`, price: input.support },
      target: bullTarget,
      summary: `A confirmed breakout opens a measured-move zone at ${fmt.format(bullTarget.low)}–${fmt.format(bullTarget.high)}. Momentum and participation must confirm the move.`,
      path: [
        { offset: 0, value: current, phase: "current" },
        { offset: decisionDays, value: decisionZone.high, phase: "decision" },
        { offset: 8, value: input.breakout, phase: "trigger" },
        { offset: 17, value: bullTarget.low, phase: "target" },
        { offset: 28, value: (bullTarget.low + bullTarget.high) / 2, phase: "target" },
      ],
      evidence: evidence("bull", features, input.support, input.breakout),
    },
    {
      id: "base",
      label: "Base scenario",
      color: "#7f91aa",
      setupWeight: weights.base,
      horizonDays: 28,
      trigger: { label: `Price remains between ${fmt.format(input.support)} and ${fmt.format(input.breakout)}`, range: { low: input.support, high: input.breakout } },
      invalidation: { label: "Confirmed daily close outside the decision range", range: { low: input.support, high: input.breakout } },
      target: baseTarget,
      summary: `A range outcome favors rotation around the high-volume area, with an equilibrium zone at ${fmt.format(baseTarget.low)}–${fmt.format(baseTarget.high)}.`,
      path: [
        { offset: 0, value: current, phase: "current" },
        { offset: decisionDays, value: (decisionZone.low + decisionZone.high) / 2, phase: "decision" },
        { offset: 10, value: baseTarget.high, phase: "trigger" },
        { offset: 19, value: baseTarget.low, phase: "target" },
        { offset: 28, value: baseCenter, phase: "target" },
      ],
      evidence: evidence("base", features, input.support, input.breakout),
    },
    {
      id: "bear",
      label: "Bear scenario",
      color: "#f35f73",
      setupWeight: weights.bear,
      horizonDays: 28,
      trigger: { label: `Daily close below ${fmt.format(input.support)} with expanding sell volume`, price: input.support },
      invalidation: { label: `Recovery above the broken support at ${fmt.format(input.support)}`, price: input.support },
      target: bearTarget,
      summary: `A support failure exposes the next volatility-adjusted demand zone at ${fmt.format(bearTarget.low)}–${fmt.format(bearTarget.high)}.`,
      path: [
        { offset: 0, value: current, phase: "current" },
        { offset: decisionDays, value: decisionZone.low, phase: "decision" },
        { offset: 8, value: input.support, phase: "trigger" },
        { offset: 17, value: bearTarget.high, phase: "target" },
        { offset: 28, value: (bearTarget.low + bearTarget.high) / 2, phase: "target" },
      ],
      evidence: evidence("bear", features, input.support, input.breakout),
    },
  ];

  return {
    scenarios,
    leadingScenario,
    confidence: confidence(weights),
    regime: regime(features),
    decisionZone: { ...decisionZone, days: decisionDays },
    methodology: "Setup weights combine trend (25%), structure (25%), momentum (20%), volume (15%), and volatility (15%). They are normalized model weights, not calibrated forecast probabilities.",
  };
}
