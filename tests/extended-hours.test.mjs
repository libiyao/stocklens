import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = fileURLToPath(new URL("../lib/providers/yahoo.ts", import.meta.url));
const source = readFileSync(filename, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const testModule = { exports: {} };
const require = specifier => {
  if (specifier === "../constants") return { DATA_SOURCE: "Yahoo Finance" };
  throw new Error(`Unexpected test dependency: ${specifier}`);
};
new Function("exports", "module", "require", "__filename", "__dirname", compiled)(testModule.exports, testModule, require, filename, dirname(filename));
const { classifyIntradaySession } = testModule.exports;

test("intraday timestamps are classified into US extended sessions", () => {
  const timezone = "America/New_York";
  assert.equal(classifyIntradaySession(Date.UTC(2026, 6, 13, 12, 0) / 1000, timezone), "pre");
  assert.equal(classifyIntradaySession(Date.UTC(2026, 6, 13, 14, 0) / 1000, timezone), "regular");
  assert.equal(classifyIntradaySession(Date.UTC(2026, 6, 13, 21, 0) / 1000, timezone), "post");
  assert.equal(classifyIntradaySession(Date.UTC(2026, 6, 14, 1, 0) / 1000, timezone), null);
});

test("provider trading-period boundaries take precedence", () => {
  const timestamp = Date.UTC(2026, 6, 13, 13, 0) / 1000;
  assert.equal(classifyIntradaySession(timestamp, "America/New_York", { regular: { start: timestamp - 60, end: timestamp + 60 } }), "regular");
});
