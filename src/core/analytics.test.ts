import { describe, expect, it } from 'vitest'
import {
  buildBacktest,
  buildInvestmentMemo,
  compareRebalance,
  scoreStrategyConfidence,
  stressStrategy,
} from './analytics'
import type { PoolHistoryPoint, StrategyResult } from './types'

const strategy = (overrides: Partial<StrategyResult> = {}): StrategyResult => ({
  id: 'strategy-usdc-low-100000-base',
  mode: 'test',
  asset: 'USDC',
  deployedAsset: 'USDC',
  amount: 100_000,
  assetPriceUsd: 1,
  notionalUsd: 100_000,
  preferredChain: 'Base',
  riskTier: 'low',
  target: { min: 7, max: 10 },
  blendedApr: 6,
  expectedAnnualYield: 6_000,
  expectedAnnualYieldUsd: 6_000,
  expectedMonthlyYield: 500,
  expectedMonthlyYieldUsd: 500,
  targetStatus: 'below-target',
  estimatedCostsUsd: 18,
  estimatedCompletionSeconds: 960,
  platformBreakdown: [
    { platform: 'aave-v3', platformLabel: 'Aave V3', aprContribution: 3.2, allocationPct: 52 },
    { platform: 'morpho-blue', platformLabel: 'Morpho Blue', aprContribution: 2.8, allocationPct: 48 },
  ],
  marketUniverse: {
    scannedPools: 80,
    eligiblePools: 24,
    selectedPools: 2,
  },
  executionSteps: [
    { kind: 'approve', label: 'Approve Aave', chain: 'Base', estimatedGasUsd: 0.04, estimatedSeconds: 6 },
    { kind: 'deposit', label: 'Deposit Aave', chain: 'Base', estimatedGasUsd: 0.09, estimatedSeconds: 8 },
  ],
  positions: [
    {
      id: 'aave-usdc',
      platform: 'aave-v3',
      platformLabel: 'Aave V3',
      chain: 'Base',
      asset: 'USDC',
      amount: 52_000,
      amountUsd: 52_000,
      allocationPct: 52,
      apr: 6.2,
      apyBase: 6,
      apyReward: 0.2,
      apyMean30d: 5.9,
      expectedAnnualYield: 3_224,
      expectedAnnualYieldUsd: 3_224,
      riskGrade: 'A-',
      riskTier: 'low',
      tvlUsd: 150_000_000,
      exposure: 'single',
      wrapperKind: 'canonical',
      rationale: 'Blue chip single asset.',
      sourcePoolId: 'pool-aave',
      componentAssets: ['USDC'],
      adapter: {
        protocol: 'aave-v3',
        chain: 'Base',
        depositTarget: '0xpool',
        approvalTarget: '0xpool',
        withdrawalPath: 'withdraw',
        minDepositUsd: 100,
        approveGasUnits: 70_000,
        depositGasUnits: 135_000,
        withdrawGasUnits: 150_000,
        notes: 'adapter',
      },
      contracts: [],
      url: 'https://defillama.com/yields/pool/pool-aave',
    },
    {
      id: 'morpho-usdc',
      platform: 'morpho-blue',
      platformLabel: 'Morpho Blue',
      chain: 'Base',
      asset: 'USDC',
      amount: 48_000,
      amountUsd: 48_000,
      allocationPct: 48,
      apr: 5.8,
      apyBase: 5.6,
      apyReward: 0.2,
      apyMean30d: 5.4,
      expectedAnnualYield: 2_784,
      expectedAnnualYieldUsd: 2_784,
      riskGrade: 'A-',
      riskTier: 'low',
      tvlUsd: 90_000_000,
      exposure: 'single',
      wrapperKind: 'canonical',
      rationale: 'Blue chip single asset.',
      sourcePoolId: 'pool-morpho',
      componentAssets: ['USDC'],
      adapter: {
        protocol: 'morpho-blue',
        chain: 'Base',
        depositTarget: '0xmorpho',
        approvalTarget: '0xmorpho',
        withdrawalPath: 'redeem',
        minDepositUsd: 100,
        approveGasUnits: 70_000,
        depositGasUnits: 190_000,
        withdrawGasUnits: 210_000,
        notes: 'adapter',
      },
      contracts: [],
      url: 'https://defillama.com/yields/pool/pool-morpho',
    },
  ],
  createdAt: '2026-05-11T12:00:00.000Z',
  ...overrides,
})

const history = (values: number[]): PoolHistoryPoint[] =>
  values.map((apy, index) => ({
    timestamp: new Date(Date.UTC(2026, 4, index + 1)).toISOString(),
    apy,
    apyBase: apy - 0.2,
    apyReward: 0.2,
    tvlUsd: 100_000_000 - index * 1_000_000,
    il7d: 0,
  }))

describe('decision analytics', () => {
  it('builds a weighted historical backtest from pool APY histories', () => {
    const result = buildBacktest(strategy(), {
      'pool-aave': history([6, 7, 8]),
      'pool-morpho': history([4, 5, 6]),
    }, 30)

    expect(result.horizonDays).toBe(30)
    expect(result.observedDays).toBe(3)
    expect(result.averageApy).toBeCloseTo(6.04, 2)
    expect(result.projectedYieldUsd).toBeCloseTo(6_040, -1)
    expect(result.dataQuality).toBe('partial')
  })

  it('scores route confidence from depth, durability, execution friction, and risk concentration', () => {
    const result = scoreStrategyConfidence(strategy(), {
      horizonDays: 30,
      observedDays: 30,
      averageApy: 5.9,
      minApy: 5.1,
      maxApy: 6.8,
      volatility: 0.35,
      projectedYieldUsd: 5_900,
      worstMonthlyYieldUsd: 390,
      drawdownEstimatePct: 0.7,
      dataQuality: 'complete',
    })

    expect(result.score).toBeGreaterThan(75)
    expect(result.grade).toMatch(/A|B/)
    expect(result.factors.map((factor) => factor.label)).toContain('Liquidity depth')
  })

  it('stress tests yield, gas, depeg, reward haircut, and bridge delay shocks', () => {
    const result = stressStrategy(strategy(), {
      gasMultiplier: 5,
      apyShockPct: 35,
      rewardHaircutPct: 100,
      tvlShockPct: 40,
      depegPct: 2,
      bridgeDelayHours: 24,
    })

    expect(result.stressedApy).toBeLessThan(6)
    expect(result.stressedAnnualYieldUsd).toBeLessThan(6_000)
    expect(result.stressedExecutionCostUsd).toBe(90)
    expect(result.warnings.length).toBeGreaterThan(2)
  })

  it('compares rebalancing cadence net of execution costs', () => {
    const result = compareRebalance(strategy(), {
      horizonDays: 90,
      observedDays: 90,
      averageApy: 6,
      minApy: 3.8,
      maxApy: 8.4,
      volatility: 1.1,
      projectedYieldUsd: 6_000,
      worstMonthlyYieldUsd: 320,
      drawdownEstimatePct: 2.2,
      dataQuality: 'complete',
    }, 'monthly')

    expect(result.cadence).toBe('monthly')
    expect(result.netAnnualYieldUsd).toBeGreaterThan(strategy().expectedAnnualYieldUsd)
    expect(result.verdict).toContain('rebalance')
  })

  it('builds an exportable investment memo payload', () => {
    const route = strategy()
    const memo = buildInvestmentMemo(route, {
      confidence: scoreStrategyConfidence(route),
      backtest: buildBacktest(route, {}, 30),
      stress: stressStrategy(route),
      rebalance: compareRebalance(route, undefined, 'threshold'),
      constraints: {
        noBridge: true,
        excludeWrappedAssets: true,
        singleAssetOnly: true,
        baseYieldOnly: false,
        minTvlUsd: 10_000_000,
        maxProtocolAllocationPct: 60,
        maxChainAllocationPct: 100,
      },
    })

    expect(memo.title).toContain('StratEx')
    expect(memo.summary).toContain('USDC')
    expect(memo.assumptions.length).toBeGreaterThan(3)
    expect(memo.positions).toHaveLength(2)
  })
})
