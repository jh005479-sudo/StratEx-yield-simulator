import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import { z } from 'zod'
import { ALLOWED_ASSETS, ALLOWED_CHAINS } from '../core/config'
import { buildStrategyAnalytics, DEFAULT_STRATEGY_CONSTRAINTS, DEFAULT_STRESS_SCENARIO } from '../core/analytics'
import { buildStrategy, detectOpportunities, summarizeAssetRates } from '../core/strategy'
import type { RebalanceCadence, RiskTier, StressScenario, SupportedChain, YieldAsset } from '../core/types'
import { fetchYieldMarkets } from './defillama'
import { fetchGasSnapshot } from './gas'
import { fetchPoolHistories } from './history'
import { fetchAssetPrices } from './prices'
import { fetchRiskFeed } from './risks'

const app = express()
const port = Number(process.env.API_PORT ?? 8787)

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, max-age=0')
  next()
})

const strategyInput = z.object({
  asset: z.enum(ALLOWED_ASSETS),
  amount: z.coerce.number().positive(),
  preferredChain: z.enum(ALLOWED_CHAINS),
  riskTier: z.enum(['low', 'medium', 'high']).default('low'),
  backtestDays: z.coerce.number().int().min(30).max(180).default(90),
  rebalanceCadence: z.enum(['none', 'monthly', 'quarterly', 'threshold']).default('threshold'),
  constraints: z.object({
    noBridge: z.boolean().default(false),
    excludeWrappedAssets: z.boolean().default(false),
    singleAssetOnly: z.boolean().default(false),
    baseYieldOnly: z.boolean().default(false),
    minTvlUsd: z.coerce.number().min(0).default(0),
    maxProtocolAllocationPct: z.coerce.number().min(1).max(100).default(100),
    maxChainAllocationPct: z.coerce.number().min(1).max(100).default(100),
  }).default({ ...DEFAULT_STRATEGY_CONSTRAINTS }),
  stressScenario: z.object({
    gasMultiplier: z.coerce.number().min(1).max(20).default(2),
    apyShockPct: z.coerce.number().min(0).max(100).default(25),
    rewardHaircutPct: z.coerce.number().min(0).max(100).default(50),
    tvlShockPct: z.coerce.number().min(0).max(100).default(25),
    depegPct: z.coerce.number().min(0).max(20).default(0),
    bridgeDelayHours: z.coerce.number().min(0).max(168).default(6),
  }).default({ ...DEFAULT_STRESS_SCENARIO }),
})

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'stratex-yield-agent-api',
    updatedAt: new Date().toISOString(),
  })
})

app.get('/api/markets', async (_req, res) => {
  const markets = await fetchYieldMarkets()
  res.json(markets)
})

app.get('/api/rates', async (_req, res) => {
  const markets = await fetchYieldMarkets()
  const parsedRiskTier = z.enum(['low', 'medium', 'high']).safeParse(_req.query.riskTier ?? 'low')
  const riskTier = parsedRiskTier.success ? parsedRiskTier.data : 'low'
  res.json({
    source: markets.source,
    updatedAt: markets.updatedAt,
    riskTier,
    rates: summarizeAssetRates(markets.pools, riskTier),
  })
})

app.get('/api/opportunities', async (_req, res) => {
  const markets = await fetchYieldMarkets()
  res.json({
    source: markets.source,
    updatedAt: markets.updatedAt,
    opportunities: detectOpportunities(markets.pools),
  })
})

app.get('/api/gas', async (_req, res) => {
  res.json(await fetchGasSnapshot())
})

app.get('/api/prices', async (_req, res) => {
  res.json(await fetchAssetPrices())
})

app.get('/api/risks', async (_req, res) => {
  res.json(await fetchRiskFeed())
})

app.post('/api/simulate', async (req, res) => {
  const parsed = strategyInput.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const [markets, gas, prices] = await Promise.all([fetchYieldMarkets(), fetchGasSnapshot(), fetchAssetPrices()])
    const strategy = buildStrategy({
      ...parsed.data,
      asset: parsed.data.asset as YieldAsset,
      preferredChain: parsed.data.preferredChain as SupportedChain,
      riskTier: parsed.data.riskTier as RiskTier,
      pools: markets.pools,
      constraints: parsed.data.constraints,
      marketSource: markets.source,
      marketUpdatedAt: markets.updatedAt,
      assetPricesUsd: prices.prices,
      gasAssumptions: Object.fromEntries(
        gas.chains.map((chain) => [
          chain.chain,
          {
            approveUsd: chain.estimatedApproveUsd,
            depositUsd: chain.estimatedDepositUsd,
            bridgeUsd: chain.estimatedBridgeUsd,
            blockTimeSeconds: chain.blockTimeSeconds,
          },
        ]),
      ),
    })
    const histories = await fetchPoolHistories(strategy, parsed.data.backtestDays)
    strategy.analytics = buildStrategyAnalytics(strategy, {
      histories,
      horizonDays: parsed.data.backtestDays,
      stressScenario: parsed.data.stressScenario as StressScenario,
      rebalanceCadence: parsed.data.rebalanceCadence as RebalanceCadence,
      constraints: parsed.data.constraints,
    })
    res.json({ source: markets.source, strategy })
  } catch (error) {
    res.status(422).json({ error: error instanceof Error ? error.message : 'Unable to build strategy' })
  }
})

app.listen(port, () => {
  console.log(`StratEx Yield Agent API listening on http://localhost:${port}`)
})
