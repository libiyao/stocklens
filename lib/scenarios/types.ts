import { VolumeBin } from "../types";

export type ScenarioKind = "bull" | "base" | "bear";
export type ScenarioConfidence = "Low" | "Moderate" | "High";

export interface PriceRange {
  low: number;
  high: number;
}

export interface ScenarioCondition {
  label: string;
  price?: number;
  range?: PriceRange;
}

export interface ScenarioEvidence {
  factor: "Trend" | "Momentum" | "Structure" | "Volume" | "Volatility";
  impact: "supporting" | "opposing" | "neutral";
  contribution: number;
  detail: string;
}

export interface ScenarioPathPoint {
  offset: number;
  value: number;
  phase: "current" | "decision" | "trigger" | "target";
}

export interface MarketScenario {
  id: ScenarioKind;
  label: string;
  color: string;
  setupWeight: number;
  horizonDays: number;
  trigger: ScenarioCondition;
  invalidation: ScenarioCondition;
  target: PriceRange;
  summary: string;
  path: ScenarioPathPoint[];
  evidence: ScenarioEvidence[];
}

export interface ScenarioAnalysis {
  scenarios: MarketScenario[];
  leadingScenario: ScenarioKind;
  confidence: ScenarioConfidence;
  regime: string;
  decisionZone: PriceRange & { days: number };
  methodology: string;
}

export interface ScenarioEngineInput {
  support: number;
  breakout: number;
  stretch: number;
  downside: number;
  profile: VolumeBin[];
}
