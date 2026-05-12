import { describe, expect, it } from 'vitest'
import {
  buildStrategy,
  detectOpportunities,
  filterEligiblePools,
  summarizeAssetRates,
} from './strategy'
import type { ChainName, DeFiYieldPool, RiskTier, YieldAsset } from './types'

const pool = (
  overrides: Partial<DeFiYieldPool> & {
    asset?: YieldAsset
    chain?: ChainName
    project?: string
    apy?: number
    riskTier?: RiskTier
  },
): DeFiYieldPool => ({
  id: overrides.id ?? `${overrides.project ?? 'aave-v3'}-${overrides.asset ?? 'USDC'}`,
  project: overrides.project ?? 'aave-v3',
  chain: overrides.chain ?? 'Base',
  symbol: overrides.symbol ?? overrides.asset ?? 'USDC',
  asset: overrides.asset ?? 'USDC',
  apy: overrides.apy ?? 8.1,
  tvlUsd: overrides.tvlUsd ?? 22_000_000,
  poolMeta: overrides.poolMeta ?? 'Core market',
  exposure: overrides.exposure ?? 'single',
  ilRisk: overrides.ilRisk ?? 'no',
  stablecoin: overrides.stablecoin ?? true,
  apyBase: overrides.apyBase,
  apyReward: overrides.apyReward,
  apyMean30d: overrides.apyMean30d,
  wrapperKind: overrides.wrapperKind,
  url: overrides.url ?? 'https://defillama.com/yields',
  contracts: overrides.contracts ?? [
    {
      label: `${overrides.project ?? 'Aave'} ${overrides.chain ?? 'Base'} core`,
      address: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      explorerUrl:
        'https://basescan.org/address/0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    },
  ],
})

describe('filterEligiblePools', () => {
  it('keeps only allowed assets, target chains, blue-chip protocols, and conservative yields', () => {
    const pools = [
      pool({ id: 'base-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Base', apy: 8.1 }),
      pool({ id: 'arb-morpho-usdc', project: 'morpho-blue', asset: 'USDC', chain: 'Arbitrum', apy: 9.2 }),
      pool({ id: 'polygon-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Polygon', apy: 8.4 }),
      pool({ id: 'base-smallcap', project: 'unknown-farm', asset: 'USDC', chain: 'Base', apy: 8.9 }),
      pool({ id: 'base-dai', project: 'aave-v3', asset: 'USDC', symbol: 'DAI', chain: 'Base', apy: 8.2 }),
      pool({ id: 'base-usdc-spacex', project: 'uniswap-v3', asset: 'USDC', symbol: 'USDC-SPACEX', chain: 'Base', apy: 9.2 }),
      pool({ id: 'base-too-hot', project: 'pendle', asset: 'USDC', chain: 'Base', apy: 24.2 }),
    ]

    const eligible = filterEligiblePools(pools, 'USDC', 'low')

    expect(eligible.map((item) => item.id)).toEqual(['base-aave-usdc', 'arb-morpho-usdc'])
  })

  it('accepts single-asset Morpho vault symbols when their underlying token is allowed', () => {
    const morphoReceipt = pool({
      id: 'base-morpho-steakusdc',
      project: 'morpho-blue',
      asset: 'USDC',
      symbol: 'STEAKUSDC',
      chain: 'Base',
      apy: 4.23,
      tvlUsd: 469_000_000,
    }) as DeFiYieldPool & { underlyingTokens: string[] }
    morphoReceipt.underlyingTokens = ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913']

    const riskyPair = pool({
      id: 'base-uniswap-usdc-spacex',
      project: 'uniswap-v3',
      asset: 'USDC',
      symbol: 'USDC-SPACEX',
      chain: 'Base',
      apy: 9.2,
      tvlUsd: 51_000_000,
      exposure: 'multi',
      ilRisk: 'yes',
    })

    const eligible = filterEligiblePools([morphoReceipt, riskyPair], 'USDC', 'low')

    expect(eligible.map((item) => item.id)).toEqual(['base-morpho-steakusdc'])
  })

  it('widens the universe by risk tier without weakening low-risk gates', () => {
    const pools = [
      pool({ id: 'low-aave', project: 'aave-v3', asset: 'ARB', symbol: 'ARB', chain: 'Arbitrum', apy: 2.2, tvlUsd: 25_000_000, stablecoin: false }),
      pool({ id: 'medium-uni', project: 'uniswap-v3', asset: 'ARB', symbol: 'ARB-WETH', chain: 'Arbitrum', apy: 14.2, tvlUsd: 4_000_000, exposure: 'multi', ilRisk: 'yes', stablecoin: false }),
      pool({ id: 'high-minor', project: 'tiny-vault', asset: 'ARB', symbol: 'ARB', chain: 'Optimism', apy: 37.5, tvlUsd: 80_000, exposure: 'single', ilRisk: 'no', stablecoin: false }),
    ]

    expect(filterEligiblePools(pools, 'ARB', 'low').map((item) => item.id)).toEqual(['low-aave'])
    expect(filterEligiblePools(pools, 'ARB', 'medium').map((item) => item.id)).toEqual(['low-aave', 'medium-uni'])
    expect(filterEligiblePools(pools, 'ARB', 'high').map((item) => item.id)).toEqual([
      'low-aave',
      'medium-uni',
      'high-minor',
    ])
  })
})

describe('buildStrategy', () => {
  it('builds a multi-position stablecoin strategy inside the target band', () => {
    const result = buildStrategy({
      asset: 'USDC',
      amount: 100_000,
      preferredChain: 'Base',
      riskTier: 'low',
      pools: [
        pool({ id: 'base-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Base', apy: 7.4 }),
        pool({ id: 'base-morpho-usdc', project: 'morpho-blue', asset: 'USDC', chain: 'Base', apy: 8.8 }),
        pool({ id: 'arb-pendle-usdc', project: 'pendle', asset: 'USDC', chain: 'Arbitrum', apy: 10.4 }),
        pool({ id: 'arb-curve-usdc', project: 'curve-dex', asset: 'USDC', chain: 'Arbitrum', apy: 6.9 }),
      ],
    })

    expect(result.mode).toBe('test')
    expect(result.asset).toBe('USDC')
    expect(result.target.min).toBe(7)
    expect(result.target.max).toBe(10)
    expect(result.blendedApr).toBeGreaterThanOrEqual(7)
    expect(result.blendedApr).toBeLessThanOrEqual(10)
    expect(result.positions.length).toBeGreaterThanOrEqual(3)
    expect(result.positions.reduce((sum, position) => sum + position.amount, 0)).toBeCloseTo(100_000, 2)
    expect(result.positions.every((position) => position.apr <= 20)).toBe(true)
    expect(result.executionSteps.some((step) => step.kind === 'bridge')).toBe(true)
  })

  it('does not use high DEX LP fee APR as safe deployable simulator yield', () => {
    const result = buildStrategy({
      asset: 'USDC',
      amount: 100_000,
      preferredChain: 'Base',
      riskTier: 'low',
      pools: [
        pool({
          id: 'base-aave-usdc',
          project: 'aave-v3',
          asset: 'USDC',
          chain: 'Base',
          apy: 3.27,
          tvlUsd: 26_400_000,
        }),
        pool({
          id: 'arb-aave-usdc',
          project: 'aave-v3',
          asset: 'USDC',
          chain: 'Arbitrum',
          apy: 3.07,
          tvlUsd: 20_700_000,
        }),
        pool({
          id: 'base-aerodrome-usdc-usdt',
          project: 'aerodrome',
          asset: 'USDC',
          symbol: 'USDC-USDT',
          chain: 'Base',
          apy: 19.12,
          tvlUsd: 1_020_000,
          exposure: 'multi',
          ilRisk: 'no',
        }),
      ],
    })

    expect(result.blendedApr).toBeLessThan(4)
    expect(result.targetStatus).toBe('below-target')
    expect(result.positions.map((position) => position.platformLabel)).toEqual(['Aave V3', 'Aave V3'])
  })

  it('prefers protocol diversity before adding a second market from the same protocol', () => {
    const morphoReceipt = pool({
      id: 'base-morpho-bbqusd',
      project: 'morpho-blue',
      asset: 'USDC',
      symbol: 'BBQUSDC',
      chain: 'Base',
      apy: 4.35,
      tvlUsd: 120_000_000,
    }) as DeFiYieldPool & { underlyingTokens: string[] }
    morphoReceipt.underlyingTokens = ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913']

    const result = buildStrategy({
      asset: 'USDC',
      amount: 100_000,
      preferredChain: 'Base',
      riskTier: 'low',
      pools: [
        pool({ id: 'base-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Base', apy: 4.7 }),
        pool({ id: 'arb-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Arbitrum', apy: 4.55 }),
        morphoReceipt,
      ],
    })

    expect(result.positions.map((position) => position.platformLabel)).toEqual([
      'Aave V3',
      'Morpho Blue',
      'Aave V3',
    ])
  })

  it('prefers chain diversity within a protocol before adding another same-chain market', () => {
    const morphoBasePrimary = pool({
      id: 'base-morpho-primary-usdc',
      project: 'morpho-blue',
      asset: 'USDC',
      symbol: 'STEAKUSDC',
      chain: 'Base',
      apy: 5.9,
      tvlUsd: 120_000_000,
    }) as DeFiYieldPool & { underlyingTokens: string[] }
    const morphoBaseSecondary = pool({
      id: 'base-morpho-secondary-usdc',
      project: 'morpho-blue',
      asset: 'USDC',
      symbol: 'BBQUSDC',
      chain: 'Base',
      apy: 5.8,
      tvlUsd: 110_000_000,
    }) as DeFiYieldPool & { underlyingTokens: string[] }
    const morphoArbitrum = pool({
      id: 'arb-morpho-usdc',
      project: 'morpho-blue',
      asset: 'USDC',
      symbol: 'BBQUSDC',
      chain: 'Arbitrum',
      apy: 5.2,
      tvlUsd: 60_000_000,
    }) as DeFiYieldPool & { underlyingTokens: string[] }
    morphoBasePrimary.underlyingTokens = ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913']
    morphoBaseSecondary.underlyingTokens = ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913']
    morphoArbitrum.underlyingTokens = ['0xaf88d065e77c8cC2239327C5EDb3A432268e5831']

    const result = buildStrategy({
      asset: 'USDC',
      amount: 100_000,
      preferredChain: 'Base',
      riskTier: 'low',
      pools: [
        morphoBasePrimary,
        morphoBaseSecondary,
        morphoArbitrum,
        pool({ id: 'base-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Base', apy: 4.7 }),
        pool({ id: 'arb-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Arbitrum', apy: 4.6 }),
      ],
    })

    expect(result.positions.map((position) => position.id)).toEqual([
      'base-morpho-primary-usdc',
      'base-aave-usdc',
      'arb-morpho-usdc',
      'arb-aave-usdc',
      'base-morpho-secondary-usdc',
    ])
  })

  it('adds wrapping friction for ETH strategies and reports WETH-compatible positions', () => {
    const result = buildStrategy({
      asset: 'ETH',
      amount: 12,
      preferredChain: 'Base',
      riskTier: 'low',
      pools: [
        pool({ id: 'base-aave-weth', project: 'aave-v3', asset: 'WETH', symbol: 'WETH', chain: 'Base', apy: 5.5, stablecoin: false }),
        pool({ id: 'base-morpho-weth', project: 'morpho-blue', asset: 'WETH', symbol: 'WETH', chain: 'Base', apy: 6.1, stablecoin: false }),
        pool({ id: 'arb-pendle-weth', project: 'pendle', asset: 'WETH', symbol: 'WETH', chain: 'Arbitrum', apy: 6.6, stablecoin: false }),
      ],
    })

    expect(result.asset).toBe('ETH')
    expect(result.target).toEqual({ min: 5, max: 7 })
    expect(result.blendedApr).toBeGreaterThanOrEqual(5)
    expect(result.blendedApr).toBeLessThanOrEqual(7)
    expect(result.executionSteps[0].kind).toBe('wrap')
    expect(result.positions.every((position) => position.asset === 'WETH')).toBe(true)
  })

  it('builds simulator routes for newly supported assets and chains', () => {
    const result = buildStrategy({
      asset: 'WBTC',
      amount: 1.2,
      preferredChain: 'Ethereum',
      riskTier: 'medium',
      pools: [
        pool({ id: 'eth-aave-wbtc', project: 'aave-v3', asset: 'WBTC', symbol: 'WBTC', chain: 'Ethereum', apy: 0.4, tvlUsd: 240_000_000, stablecoin: false }),
        pool({ id: 'arb-curve-wbtc-eth', project: 'curve-dex', asset: 'WBTC', symbol: 'WBTC-WETH', chain: 'Arbitrum', apy: 2.8, tvlUsd: 12_000_000, exposure: 'multi', ilRisk: 'yes', stablecoin: false }),
        pool({ id: 'op-velodrome-wbtc-usdc', project: 'velodrome-v2', asset: 'WBTC', symbol: 'WBTC-USDC', chain: 'Optimism', apy: 8.4, tvlUsd: 1_600_000, exposure: 'multi', ilRisk: 'yes', stablecoin: false }),
      ],
    })

    expect(result.asset).toBe('WBTC')
    expect(result.riskTier).toBe('medium')
    expect(result.positions.map((position) => position.chain)).toContain('Optimism')
    expect(result.executionSteps.some((step) => step.kind === 'bridge')).toBe(true)
  })

  it('does not select the same source market twice when DeFiLlama expands a multi-asset pool', () => {
    const result = buildStrategy({
      asset: 'XRP',
      amount: 100_000,
      preferredChain: 'Base',
      riskTier: 'medium',
      pools: [
        pool({
          id: 'moonwell-cbxrp',
          project: 'moonwell-lending',
          asset: 'XRP',
          symbol: 'CBXRP',
          chain: 'Base',
          apy: 1.26,
          tvlUsd: 2_300_000,
          stablecoin: false,
        }),
        pool({
          id: 'uniswap-uxrp-weth-XRP',
          project: 'uniswap-v3',
          asset: 'XRP',
          symbol: 'UXRP-WETH',
          chain: 'Base',
          apy: 13.85,
          tvlUsd: 1_100_000,
          exposure: 'multi',
          ilRisk: 'yes',
          stablecoin: false,
          url: 'https://defillama.com/yields/pool/uxrp-weth',
        }),
        pool({
          id: 'uniswap-uxrp-weth-WETH',
          project: 'uniswap-v3',
          asset: 'WETH',
          symbol: 'UXRP-WETH',
          chain: 'Base',
          apy: 13.85,
          tvlUsd: 1_100_000,
          exposure: 'multi',
          ilRisk: 'yes',
          stablecoin: false,
          url: 'https://defillama.com/yields/pool/uxrp-weth',
        }),
      ],
    })

    expect(result.positions.map((position) => position.id)).toEqual(['moonwell-cbxrp', 'uniswap-uxrp-weth-XRP'])
    expect(new Set(result.positions.map((position) => position.url)).size).toBe(result.positions.length)
  })

  it('normalizes non-stable assets to USD notional before reporting yield', () => {
    const result = buildStrategy({
      asset: 'WBTC',
      amount: 1,
      preferredChain: 'Ethereum',
      riskTier: 'low',
      assetPricesUsd: {
        ETH: 3_000,
        WETH: 3_000,
        USDC: 1,
        USDT: 1,
        XRP: 0.5,
        ARB: 0.7,
        WBTC: 50_000,
        ADA: 0.45,
      },
      pools: [
        pool({ id: 'aave-wbtc', project: 'aave-v3', asset: 'WBTC', symbol: 'WBTC', chain: 'Ethereum', apy: 2, tvlUsd: 200_000_000, stablecoin: false }),
        pool({ id: 'morpho-wbtc', project: 'morpho-blue', asset: 'WBTC', symbol: 'WBTC', chain: 'Ethereum', apy: 3, tvlUsd: 80_000_000, stablecoin: false }),
      ],
    } as Parameters<typeof buildStrategy>[0])

    expect(result.notionalUsd).toBe(50_000)
    expect(result.expectedAnnualYieldUsd).toBeCloseTo(result.notionalUsd * (result.blendedApr / 100), 2)
  })

  it('annotates positions with adapter execution assumptions', () => {
    const result = buildStrategy({
      asset: 'USDC',
      amount: 100_000,
      preferredChain: 'Base',
      riskTier: 'low',
      pools: [
        pool({ id: 'base-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Base', apy: 4.5 }),
        pool({ id: 'base-morpho-usdc', project: 'morpho-blue', asset: 'USDC', chain: 'Base', apy: 4.8 }),
      ],
    })

    expect(result.positions[0].adapter?.depositTarget).toBeTruthy()
    expect(result.positions[0].adapter?.withdrawalPath).toBeTruthy()
    expect(result.executionSteps.some((step) => step.kind === 'deposit' && step.adapter?.minDepositUsd)).toBe(true)
  })

  it('blocks simulation when market data is fallback or stale', () => {
    expect(() =>
      buildStrategy({
        asset: 'USDC',
        amount: 100_000,
        preferredChain: 'Base',
        riskTier: 'low',
        marketSource: 'fallback',
        pools: [
          pool({ id: 'base-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Base', apy: 4.5 }),
          pool({ id: 'base-morpho-usdc', project: 'morpho-blue', asset: 'USDC', chain: 'Base', apy: 4.8 }),
        ],
      } as Parameters<typeof buildStrategy>[0]),
    ).toThrow(/live DeFiLlama/i)
  })

  it('applies hard route constraints before allocation', () => {
    const result = buildStrategy({
      asset: 'USDC',
      amount: 100_000,
      preferredChain: 'Base',
      riskTier: 'medium',
      constraints: {
        noBridge: true,
        excludeWrappedAssets: true,
        singleAssetOnly: true,
        baseYieldOnly: true,
        minTvlUsd: 20_000_000,
        maxProtocolAllocationPct: 60,
        maxChainAllocationPct: 100,
      },
      pools: [
        pool({ id: 'base-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Base', apy: 5.2, tvlUsd: 90_000_000, apyBase: 5.2, apyReward: 0 }),
        pool({ id: 'base-morpho-usdc', project: 'morpho-blue', asset: 'USDC', chain: 'Base', apy: 5.8, tvlUsd: 80_000_000, apyBase: 5.8, apyReward: 0 }),
        pool({ id: 'arb-aave-usdc', project: 'aave-v3', asset: 'USDC', chain: 'Arbitrum', apy: 7.5, tvlUsd: 200_000_000, apyBase: 7.5, apyReward: 0 }),
        pool({ id: 'base-uni-usdc-weth', project: 'uniswap-v3', asset: 'USDC', symbol: 'USDC-WETH', chain: 'Base', apy: 12, tvlUsd: 30_000_000, exposure: 'multi', ilRisk: 'yes' }),
        pool({ id: 'base-reward-usdc', project: 'yearn', asset: 'USDC', chain: 'Base', apy: 8, tvlUsd: 30_000_000, apyBase: 2, apyReward: 6 }),
      ],
    } as Parameters<typeof buildStrategy>[0])

    expect(result.positions.map((position) => position.id)).toEqual(['base-morpho-usdc', 'base-aave-usdc'])
    expect(result.executionSteps.some((step) => step.kind === 'bridge')).toBe(false)
    expect(Math.max(...result.positions.map((position) => position.allocationPct))).toBeLessThanOrEqual(60)
  })
})

describe('summarizeAssetRates and detectOpportunities', () => {
  it('summarizes average APR by asset and flags only above-target opportunities below the hard safety ceiling', () => {
    const pools = [
      pool({ id: 'usdc-safe-1', asset: 'USDC', apy: 8 }),
      pool({ id: 'usdc-safe-2', asset: 'USDC', project: 'morpho-blue', apy: 10.8 }),
      pool({ id: 'usdc-too-hot', asset: 'USDC', project: 'pendle', apy: 25 }),
      pool({ id: 'weth-safe', asset: 'WETH', symbol: 'WETH', stablecoin: false, apy: 6 }),
    ]

    const rates = summarizeAssetRates(pools)
    const opportunities = detectOpportunities(pools)

    expect(rates.USDC.averageApr).toBeCloseTo(9.4, 1)
    expect(rates.WETH.averageApr).toBe(6)
    expect(opportunities.map((item) => item.poolId)).toEqual(['usdc-safe-2', 'usdc-too-hot'])
  })

  it('uses TVL-weighted rates instead of simple means', () => {
    const rates = summarizeAssetRates([
      pool({ id: 'deep-aave-usdc', project: 'aave-v3', asset: 'USDC', apy: 4, tvlUsd: 100_000_000 }),
      pool({ id: 'thin-morpho-usdc', project: 'morpho-blue', asset: 'USDC', apy: 20, tvlUsd: 10_000_000 }),
    ])

    expect(rates.USDC.averageApr).toBeCloseTo(5.45, 2)
    expect(rates.USDC.simpleAverageApr).toBe(12)
    expect(rates.USDC.apyMean30d).toBeDefined()
  })

  it('rejects ADA false positives from Aave DAI receipt symbols', () => {
    const falsePositive = pool({
      id: 'curve-adai-ausdc-ausdt',
      project: 'curve-dex',
      asset: 'ADA',
      symbol: 'ADAI-AUSDC-AUSDT',
      chain: 'Ethereum',
      apy: 0.32,
      tvlUsd: 2_000_000,
      exposure: 'multi',
      ilRisk: 'no',
    })

    expect(filterEligiblePools([falsePositive], 'ADA', 'medium')).toEqual([])
  })
})
