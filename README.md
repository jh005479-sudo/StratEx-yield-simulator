# StratEx Yield Simulator

Local proposal dashboard for a StratEx branded DeFi yield simulator. This app is simulator-only: it does not accept private keys, prepare transactions, or deploy funds.

## What It Does

- Scans live DeFiLlama yield markets across Ethereum, Base, Arbitrum, and Optimism.
- Supports `ETH`, `WETH`, `USDC`, `USDT`, `XRP`, `ARB`, `WBTC`, and `ADA`.
- Builds multi-position simulated routes by risk tier:
  - Low: blue-chip, single-asset, no-IL rows.
  - Medium: curated mid/blue-chip protocols with multi-asset routes allowed.
  - High: broader DeFiLlama discovery across minor markets and chains.
- Deduplicates raw DeFiLlama source pools so one LP/vault cannot appear twice as fake diversification.
- Uses canonical token-address proof plus known wrapper classifications instead of loose substring matching.
- Fetches asset prices for USD notional normalization and reports token yield plus USD yield.
- Shows TVL-weighted APY, 30-day context, base/reward split, gas/bridge/wrap friction, adapter assumptions, anomaly notifications, and a current-month DeFi exploit feed.
- Separates advanced simulator workflows into top-level pages for route build, hard constraints, historical backtest, stress testing, rebalance analysis, and an exportable investment memo.
- Pulls DeFiLlama pool chart history for simulated positions and uses it to score confidence, data quality, projected yield, volatility, and rebalance economics.
- Lets the user apply route constraints such as minimum TVL, max allocation per protocol or chain, no-bridge routes, single-asset-only routes, and base-yield-only routes before strategy construction.
- Blocks strategy simulation when market data is fallback or stale.

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The app proxies `/api/*` to the local Express API on `http://localhost:8787`.

## Environment

Copy `.env.example` to `.env` if you want custom RPC endpoints.

```bash
cp .env.example .env
```

Supported RPC variables:

```bash
ETHEREUM_RPC_URL=
BASE_RPC_URL=
ARBITRUM_RPC_URL=
OPTIMISM_RPC_URL=
```

## Verification

```bash
npm test
npm run lint
npm run build
```

## HyperFrames

The standalone HyperFrames source for the “agents working” animation is in:

```text
hyperframes/agent-motion/index.html
```

Its visual identity notes live beside it in `hyperframes/agent-motion/DESIGN.md`.
