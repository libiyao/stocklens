import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

function loadTypeScript(relativePath, dependencies = {}) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const testModule = { exports: {} };
  const require = specifier => {
    if (specifier in dependencies) return dependencies[specifier];
    throw new Error(`Unexpected test dependency: ${specifier}`);
  };
  new Function("exports", "module", "require", "__filename", "__dirname", compiled)(testModule.exports, testModule, require, filename, dirname(filename));
  return testModule.exports;
}

const indicators = loadTypeScript("../lib/indicators.ts");
const features = loadTypeScript("../lib/scenarios/features.ts", { "../indicators": indicators });
const { calculateScenarios } = loadTypeScript("../lib/scenarios/engine.ts", { "./features": features });

function trendingCandles(count = 260) {
  return Array.from({ length: count }, (_, index) => {
    const close = 80 + index * 0.22 + Math.sin(index / 10) * 0.8;
    return {
      time: new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10),
      timestamp: index,
      open: close - 0.45,
      high: close + 1,
      low: close - 1,
      close,
      volume: 900_000 + index * 2_000,
    };
  });
}

function scenarioInput(candles) {
  const current = candles.at(-1).close;
  return {
    support: current - 15,
    breakout: current + 3,
    stretch: current + 12,
    downside: current - 25,
    profile: indicators.calculateVolumeProfile(candles),
  };
}

test("scenario weights form a complete three-way distribution", () => {
  const candles = trendingCandles();
  const analysis = calculateScenarios(candles, scenarioInput(candles));
  assert.equal(analysis.scenarios.length, 3);
  assert.equal(analysis.scenarios.reduce((sum, scenario) => sum + scenario.setupWeight, 0), 100);
  assert.ok(analysis.scenarios.every(scenario => scenario.setupWeight >= 0 && scenario.setupWeight <= 100));
  assert.ok(analysis.scenarios.some(scenario => scenario.id === analysis.leadingScenario));
});

test("every scenario exposes a concrete conditional path and explanation", () => {
  const candles = trendingCandles();
  const current = candles.at(-1).close;
  const analysis = calculateScenarios(candles, scenarioInput(candles));
  analysis.scenarios.forEach(scenario => {
    assert.equal(scenario.path[0].offset, 0);
    assert.equal(scenario.path[0].value, current);
    assert.ok(scenario.path.every((point, index) => index === 0 || point.offset > scenario.path[index - 1].offset));
    assert.ok(scenario.target.high > scenario.target.low);
    assert.equal(scenario.evidence.length, 5);
    assert.ok(scenario.trigger.label.length > 10);
    assert.ok(scenario.invalidation.label.length > 10);
  });
});

test("a persistent rising tape weighs bull above bear", () => {
  const candles = trendingCandles();
  const analysis = calculateScenarios(candles, scenarioInput(candles));
  const bull = analysis.scenarios.find(scenario => scenario.id === "bull");
  const bear = analysis.scenarios.find(scenario => scenario.id === "bear");
  assert.ok(bull.setupWeight > bear.setupWeight);
});
