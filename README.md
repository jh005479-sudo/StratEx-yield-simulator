# StratEx Yield Simulator

Proposal-grade StratEx branded DeFi yield strategy simulator. The app models multi-position yield routes, market data quality, risk constraints, historical durability, execution friction, and allocation outcomes without creating transactions or moving funds.

## What It Does

- Scans live DeFiLlama yield markets for `ETH`, `WETH`, `USDC`, `USDT`, `XRP`, `ARB`, `WBTC`, and `ADA` across Ethereum, Base, Arbitrum, and Optimism.
- Builds simulated multi-position routes for three risk modes:
  - `Low`: blue-chip, single-asset, no-IL routes on battle-tested protocols.
  - `Medium`: curated blue-chip and mid-tier opportunities with broader multi-asset routing.
  - `High`: wider DeFiLlama discovery across eligible markets, chains, DEXs, vaults, and strategy platforms.
- Targets realistic risk-adjusted yield bands instead of blindly maximizing headline APY.
- Normalizes position sizing to USD notional, estimates token-denominated and USD-denominated yield, and includes gas, bridge, wrap/unwrap, approval, deposit, and timing friction.
- Uses TVL-weighted rates, 30-day context, base/reward APY split, volatility, market depth, source freshness, and current-month DeFi exploit monitoring.
- Applies hard allocator guardrails such as minimum TVL, no-bridge routing, single-asset-only routing, base-yield-only routing, max protocol allocation, and max chain allocation.
- Deduplicates raw DeFiLlama pools, validates asset exposure with canonical token/address proof and known-wrapper metadata, and blocks simulations when market data is stale or fallback-only.
- Provides top-level workspaces for route building, constraints, historical backtesting, stress testing, rebalance analysis, and an exportable investment memo.
- Scores route confidence from liquidity depth, yield durability, diversification, execution friction, and route risk.
- Generates stress scenarios for gas spikes, reward unwind, TVL drain, depeg assumptions, APY shocks, and bridge-delay risk.
- Compares rebalance cadences after expected execution costs and observed volatility.
- Presents a StratEx-style astronaut command dashboard with animated agent activity, anomaly notifications, protocol assumptions, position cards, source links, and current exploit awareness.

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
