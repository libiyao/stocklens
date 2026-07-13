# StockLens

StockLens is a dark, institutional-style technical dashboard built with Next.js, TypeScript, Tailwind CSS, and Lightweight Charts. It fetches real daily OHLCV candles from Yahoo Finance through a server-side API route; no synthetic candles are used.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Search a ticker and choose 6M, 1Y, 2Y, or 5Y.

Use Node.js 20. Before shipping a change, run:

```bash
npm run typecheck
npm test
npm run build
```

## Production deployment

The app is ready to deploy as a standard Next.js application. Vercel is the simplest path because it supports Next.js API routes and server rendering without extra configuration.

### Deploy on Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New Project** and import that repository.
3. Use the default Next.js settings:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: Next.js default
4. Set the Node.js version to `20.x` if Vercel does not pick it up from `package.json`.
5. Deploy.

After deployment, Vercel will provide a live URL such as `https://stocklens.vercel.app`. You can later attach a custom domain from the Vercel project settings.

### Production notes

- `package.json` pins Node to `20.x` for consistent hosting builds.
- The market-data route sends CDN cache headers and includes a small per-IP rate limit to reduce accidental provider abuse.
- Yahoo Finance is an unofficial free source; for serious public traffic, replace `lib/market-data.ts` with a licensed provider such as Polygon, Twelve Data, or another market-data API.
- Technical levels and scenario paths are informational only and are not investment advice.

## Included analysis

- Candlesticks, volume, SMA 20/50/100/200
- RSI 14 and MACD 12/26/9
- Volume-at-price profile
- Clustered swing support/resistance
- Current price, major support, breakout trigger, and stretch target
- Bull/base/bear illustrative paths
- Trend, momentum, volume, structure, and composite scores
- Rule-based “The Read” summary
- Plain-language score methodology
- Relative performance comparison against another ticker
- Device-local watchlist and key-level tracking
- Shareable ticker URLs such as `/stock/NVDA?range=2Y`
- Ticker/company autocomplete
- Data source, last-candle, and candle-count quality strip
- Chart PNG and text analysis exports

All levels are calculated from the OHLCV candles returned for the selected range. Scenario paths are illustrative—not forecasts or investment advice.

## Architecture

- `app/api/market/route.ts` — validated and cached market-data API
- `app/api/search/route.ts` — cached ticker search API
- `app/stock/[ticker]/page.tsx` — shareable ticker routes
- `lib/providers/` — replaceable market-data provider interface and Yahoo adapter
- `lib/market-data.ts` — active provider gateway
- `lib/indicators.ts` — pure indicator functions
- `lib/analysis.ts` — dashboard-level technical analysis orchestration
- `lib/comparison.ts` — relative-performance calculations
- `hooks/` — reusable market, search, watchlist, and level-tracker state
- `components/PriceChart.tsx` — Lightweight Charts integration and PNG export
- `components/Dashboard.tsx` — page composition; feature details live in focused child components
- `tests/indicators.test.mjs` — indicator invariants using Node’s built-in test runner

Yahoo Finance is used as an unofficial free source and may rate-limit requests. A Polygon, Twelve Data, or licensed feed adapter can implement `MarketDataProvider` and be selected in `lib/market-data.ts` without changing the UI or analysis layer.

Watchlists and tracked levels are stored only in the current browser. They do not send email or push notifications. Durable multi-device alerts would require authentication, a database, scheduled price checks, and a notification provider.
