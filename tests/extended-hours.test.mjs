import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const { classifyIntradaySession } = loadTypeScript(new URL("../lib/market-sessions.ts", import.meta.url));

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
