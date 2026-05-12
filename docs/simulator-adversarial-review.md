# StratEx Yield Simulator Adversarial Review

Date: 2026-05-11

## Scope

This review covers the simulator-only StratEx dashboard, strategy construction logic, DeFiLlama market ingestion, supported assets, supported chains, risk feed, gas modeling, and dashboard wording.

The runtime app is simulator-only: the Express API exposes markets, rates, opportunities, gas, risks, and simulation endpoints, but no live deployment endpoint.

## Evidence Collected

- Initial audit `npm test`: 4 test files passed, 14 tests passed.
- Post-patch `npm test`: 4 test files passed, 20 tests passed.
- Post-patch `npm run lint`: passed with no reported errors.
- Post-patch `npm run build`: TypeScript and Vite build succeeded.
- Advanced analytics patch `npm test`: 5 test files passed, 26 tests passed.
- Advanced analytics patch `npm run lint`: passed with no reported errors.
- Advanced analytics patch `npm run build`: TypeScript and Vite build succeeded.
- `/api/simulate` USDC medium route returned live source, 7 positions, complete historical analytics, confidence score 80, threshold rebalance recommendation, and an exportable memo title.
- Browser verification on `http://localhost:5174/`: route build, constraints, backtest, stress lab, rebalance, and memo tabs rendered after a real simulation with no console errors.
- `/api/rates?riskTier=low`: live DeFiLlama source, USDC 4.22%, USDT 3.09%, ETH 1.45%, WETH 1.34%, WBTC 0.02%, XRP/ARB/ADA 0 eligible low-risk pools.
- `/api/rates?riskTier=medium`: live DeFiLlama source, USDC 8.54%, USDT 4.87%, ETH 9.28%, WETH 9.24%, WBTC 5.18%, XRP 9.65%, ARB 19.39%, ADA 0 eligible medium-risk pools.
- `/api/gas`: Ethereum fell back to static gas, Base/Arbitrum/Optimism used RPC gas. ETH price source returned $2,326.
- `/api/risks`: DeFiLlama hack source returned 5 current-month incidents on Ethereum or Arbitrum, dated 2026-05-01 through 2026-05-10.
- `/api/simulate` XRP medium route selected the same Uniswap V3 UXRP-WETH DeFiLlama pool twice under two internal IDs.

## High-Severity Findings

1. Duplicate pool expansion can create fake diversification.
   A raw DeFiLlama pool is expanded into one internal row per inferred asset. The route selector diversifies by protocol and chain, but not by raw DeFiLlama pool id. In the XRP medium simulation, the same Uniswap V3 UXRP-WETH pool appeared twice as separate positions: `77c0d868-9f87-41f1-980f-990cca319f08-XRP` and `77c0d868-9f87-41f1-980f-990cca319f08-WETH`.

   Impact: blended APR, selected market count, position count, route diversification, and execution steps can all be overstated.

   Required fix: keep a separate `rawPoolId`, deduplicate before selection, and represent multi-asset pools once with a component-asset list.

2. Asset inference is too permissive for XRP, ADA, ARB, and wrapped variants.
   The simulator relies partly on symbol substring matching. This admits false positives such as `ADAI-AUSDC-AUSDT` and `ADAI-ASUSD` as ADA because the token text starts with `ADA`. It also treats wrapped/synthetic rows such as CBXRP, UXRP, CBADA, XRP20, NADA, and LBTC/WBTC-related vaults as if they were clean requested-asset routes unless the risk tier filters them out.

   Impact: a user can ask for ADA, XRP, WBTC, or ARB and see markets that are not a direct deployable position in the requested asset, or are derivative/wrapped exposure with materially different risk.

   Required fix: use chain-specific canonical token-address allowlists for every supported asset and mark derivative wrappers explicitly instead of treating symbol text as sufficient proof.

3. Non-USD asset simulations do not convert position value or execution cost consistently.
   The amount entered by the user is treated as token units for allocation and expected yield, while gas and bridge costs are shown in USD. Only ETH price is fetched for gas conversion. There is no WBTC/XRP/ADA/ARB/USD conversion, token decimals handling, min-deposit check, or USD notional normalization.

   Impact: `1.2 WBTC`, `100000 XRP`, and `100000 USDC` use the same arithmetic shape even though their USD notionals and execution-cost impact are completely different.

   Required fix: require a clear input mode, either token units or USD notional, then fetch current prices for all supported assets and calculate both token-denominated and USD-denominated yield.

## Medium-Severity Findings

4. Rate tiles are simple means, not TVL-weighted or durability-adjusted rates.
   The app averages all eligible pool APYs equally. A small high-APR pool can move the displayed asset average as much as a deep lending market. DeFiLlama exposes richer fields such as base APY, reward APY, 30-day mean APY, APY volatility, TVL, volume, IL risk, and exposure, but the headline tile only uses current `apy`.

   Impact: dashboard rate feeds can look more precise and more durable than the underlying market data supports, especially in medium/high risk modes.

   Required fix: show TVL-weighted current APY, 30-day mean, base vs rewards, and volatility/dispersion bands.

5. Gas and bridge costs are directional, not quote-accurate.
   Gas uses live chain gas price where RPC works, then applies fixed approve/deposit gas units. Bridge cost and latency are static per chain. Ethereum RPC fell back during this audit, so a Base-to-Ethereum simulation used static Ethereum gas and a fixed $9.40 bridge estimate.

   Impact: cross-chain routes may understate cost and time, especially where canonical bridge finality, relayer fees, L1 data fees, protocol-specific gas, approvals already in place, or withdrawal paths matter.

   Required fix: use protocol adapter gas profiles and live bridge quote APIs before presenting cross-chain routes as cost-accurate.

6. APY was presented as APR and treated as stable annualized return.
   DeFiLlama's field is `apy`, and its methodology includes pool fees, supplying yield, and reward yield. The UI now labels the market data as APY and shows 30-day/base/reward context, but expected annual yield remains a linear estimate and still needs production-grade volatility and liquidity haircuts before any real capital process.

   Impact: expected annual yield is useful as a first-pass estimate, but not a capital-accurate forecast.

   Required fix: preserve APY naming in source data, show source context, and apply historical volatility and reward-quality haircuts.

## Low-Severity Findings

7. Fallback data can produce valid-looking results.
   If DeFiLlama yield fetching fails or returns too few pools, the server returns fallback pools. The UI does expose the source field, but simulation is not hard-gated when data is degraded.

   Required fix: block strategy simulation, or require an explicit degraded-data acknowledgement, when market source is fallback.

8. The current-month risk feed works, but failure mode is quiet.
   The risk endpoint filters to the current UTC month and relevant chains, which matches the requirement. If DeFiLlama hacks fetch fails, it returns an empty fallback list.

   Required fix: display feed failure as an amber/red degraded state rather than as a calm empty incident list.

9. Documentation was stale around live deployment and earlier scope.
   README and old superpowers planning docs mentioned private-key deployment and the original four-asset/two-chain mandate during the audit. They have since been updated to describe simulator-only behavior, eight supported assets, and four supported chains.

   Required fix: update public-facing docs before sharing the proposal to avoid confusing the simulator boundary.

## Recommended Fix Order

1. Deduplicate raw DeFiLlama pools and add regression tests for the XRP duplicate route. Addressed in `src/core/strategy.ts` and `src/core/strategy.test.ts`.
2. Replace symbol-based asset proof with canonical token-address allowlists and wrapper classifications. Addressed with strict symbol aliases, token-address mappings, and `wrapperKind` metadata.
3. Add all-asset USD price normalization and display token units plus USD notional. Addressed with DeFiLlama price fetching, `notionalUsd`, and USD yield fields.
4. Replace simple mean rate tiles with TVL-weighted current APY, 30-day mean, base/reward split, and volatility. Addressed in `summarizeAssetRates` and rate cards.
5. Add protocol adapter metadata for gas, deposit target, allowance target, withdrawal path, caps, and min deposits. Addressed with `PROTOCOL_ADAPTERS`, adapter metadata on positions, and protocol-scaled gas estimates.
6. Gate simulations when data source is fallback or stale. Addressed in `buildStrategy` and enforced by `/api/simulate`.

## Residual Limits

- Bridge costs are still model assumptions, not live bridge quotes.
- Protocol adapters are explicit simulator assumptions, not executable calldata builders.
- The simulator now includes historical pool-chart backtesting, confidence scoring, stress tests, route constraints, rebalance analysis, and an exportable memo. APY remains a market-data estimate; production capital deployment would still need protocol-specific withdrawal-liquidity checks, executable adapters, and live bridge quotes.
