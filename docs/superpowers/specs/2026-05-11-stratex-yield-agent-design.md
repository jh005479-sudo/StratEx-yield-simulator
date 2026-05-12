# StratEx Yield Agent Design

## Goal

Build a localhost proposal-grade StratEx branded yield simulator dashboard with DeFiLlama-backed rate feeds, risk/news monitoring, and animated “agents working” feedback. The app is simulator-only and does not accept private keys or prepare live transactions.

## Scope

The simulator handles `ETH`, `WETH`, `USDC`, `USDT`, `XRP`, `ARB`, `WBTC`, and `ADA` across Ethereum, Base, Arbitrum, and Optimism. It applies selectable low, medium, and high risk tiers, deduplicates raw DeFiLlama pools, requires canonical token-address or known-wrapper proof, and seeks target blended rates rather than maximizing headline yield.

## Architecture

The project is a Vite React app with a colocated Express API. The API fetches DeFiLlama yield data, asset prices, RPC gas estimates when URLs are configured, fallback gas/transaction timing when not configured, and current-month DeFi risk items. Shared TypeScript core modules perform all strategy filtering, scoring, allocation, USD normalization, adapter assumptions, and reporting so they can be tested without the UI.

## Dashboard

The main screen uses StratEx-inspired dark blue/cyan astronaut branding and a generated astronaut command-center hero. It has a left notifications panel, central capital allocation simulator panel, right exploit/risk panel, simulator environment status light, TVL-weighted rate feed tiles, APR/APY breakdown charts, platform-specific strategy cards, adapter assumptions, and source-link dropdowns under each position.

## Simulator Safety

The app has no live deployment endpoint. Simulations are blocked when market data is fallback or stale, and degraded data is treated as display-only. Protocol adapter metadata is used for simulator assumptions, not executable calldata.

## Visual And Motion

ImageGen provides a new project-local StratEx-style astronaut/vault background. HyperFrames provides a standalone HTML/GSAP source animation for the “agents working” motif, while the app uses lightweight React/CSS animation for interactive feedback when simulations or deployments are triggered.

## Testing

Vitest covers the core safety filters and simulator math. Build verification covers TypeScript and Vite bundling. Browser verification checks the running localhost dashboard after implementation.
