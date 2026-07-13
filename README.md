# StockLens

StockLens is a dark, institutional-style technical dashboard built with Next.js, TypeScript, Tailwind CSS, and Lightweight Charts. It fetches real daily OHLCV candles from Yahoo Finance through a server-side API route; no synthetic candles are used.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Search a ticker and choose 6M, 1Y, 2Y, or 5Y.

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

All levels are calculated from the OHLCV candles returned for the selected range. Scenario paths are illustrative—not forecasts or investment advice.

## Architecture

- `app/api/market/route.ts` — validated market-data API
- `lib/market-data.ts` — provider abstraction (`fetchOHLCV`)
- `lib/indicators.ts` — pure indicator and analysis functions
- `components/PriceChart.tsx` — Lightweight Charts integration
- `components/Dashboard.tsx` — data state and dashboard composition

Yahoo Finance is used as an unofficial free source and may rate-limit requests. The provider boundary in `lib/market-data.ts` can be replaced with Polygon, Twelve Data, or another licensed feed without changing the analysis components.
