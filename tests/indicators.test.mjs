import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = fileURLToPath(new URL("../lib/indicators.ts", import.meta.url));
const source = readFileSync(filename, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const testModule = { exports: {} };
new Function("exports", "module", "__filename", "__dirname", compiled)(testModule.exports, testModule, filename, dirname(filename));
const { calculateMACD, calculateRSI, calculateSMA, calculateTechnicalScores, calculateVolumeProfile } = testModule.exports;

function candles(count = 240) {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.16 + Math.sin(index / 8) * 4;
    return {
      time: new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10),
      timestamp: index,
      open: close - 0.5,
      high: close + 1.5,
      low: close - 1.5,
      close,
      volume: 1_000_000 + index * 1_000,
    };
  });
}

test("SMA preserves alignment and calculates the rolling mean", () => {
  assert.deepEqual(calculateSMA([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
});

test("RSI returns bounded values and reaches 100 for uninterrupted gains", () => {
  const result = calculateRSI(Array.from({ length: 30 }, (_, index) => index + 1), 14);
  assert.equal(result[13], null);
  assert.equal(result.at(-1), 100);
  assert.ok(result.filter(value => value !== null).every(value => value >= 0 && value <= 100));
});

test("RSI remains neutral when price is flat", () => {
  const result = calculateRSI(Array(30).fill(100), 14);
  assert.equal(result.at(-1), 50);
});

test("MACD series stay aligned with the input", () => {
  const result = calculateMACD(Array.from({ length: 80 }, (_, index) => 50 + index * 0.25));
  assert.equal(result.macd.length, 80);
  assert.equal(result.signal.length, 80);
  assert.equal(result.histogram.length, 80);
  assert.ok(result.histogram.every(Number.isFinite));
});

test("volume profile preserves total candle volume", () => {
  const input = candles(40);
  const profile = calculateVolumeProfile(input, 12);
  assert.equal(profile.length, 12);
  assert.equal(profile.reduce((sum, bin) => sum + bin.volume, 0), input.reduce((sum, candle) => sum + candle.volume, 0));
});

test("technical score components remain on a 0 to 100 scale", () => {
  const scores = calculateTechnicalScores(candles(), []);
  Object.values(scores).forEach(score => assert.ok(score >= 0 && score <= 100));
});
