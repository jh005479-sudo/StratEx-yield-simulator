// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FeedStatusBar } from './FeedStatusBar'
import type { GasResponse, RatesResponse, RiskResponse } from '../services/api'
import type { AssetRateSummary, YieldAsset } from '../core/types'

const rate = (asset: YieldAsset, averageApr: number, poolCount: number, target: AssetRateSummary['target']): AssetRateSummary => ({
  asset,
  averageApr,
  simpleAverageApr: averageApr,
  apyMean30d: averageApr,
  baseApr: averageApr,
  rewardApr: 0,
  minApr: averageApr,
  maxApr: averageApr,
  volatility: 0,
  totalTvlUsd: poolCount * 1_000_000,
  poolCount,
  target,
})

const rates: RatesResponse = {
  source: 'live',
  updatedAt: '2026-05-11T12:00:00.000Z',
  riskTier: 'medium',
  rates: {
    ETH: rate('ETH', 1.4, 4, { min: 5, max: 7 }),
    WETH: rate('WETH', 1.3, 4, { min: 5, max: 7 }),
    USDC: rate('USDC', 4.1, 12, { min: 7, max: 10 }),
    USDT: rate('USDT', 3.2, 8, { min: 7, max: 10 }),
    XRP: rate('XRP', 0, 0, { min: 1, max: 6 }),
    ARB: rate('ARB', 0, 0, { min: 2, max: 8 }),
    WBTC: rate('WBTC', 0.2, 3, { min: 1, max: 5 }),
    ADA: rate('ADA', 0, 0, { min: 1, max: 6 }),
  },
}

const gas: GasResponse = {
  updatedAt: '2026-05-11T12:00:00.000Z',
  ethPriceUsd: 2320,
  chains: [
    { chain: 'Ethereum', source: 'fallback', gasPriceGwei: 5, estimatedApproveUsd: 0.8, estimatedDepositUsd: 1.5, estimatedBridgeUsd: 9.4, blockTimeSeconds: 12 },
    { chain: 'Base', source: 'rpc', gasPriceGwei: 0.006, estimatedApproveUsd: 0.04, estimatedDepositUsd: 0.07, estimatedBridgeUsd: 2.9, blockTimeSeconds: 2 },
    { chain: 'Arbitrum', source: 'rpc', gasPriceGwei: 0.02, estimatedApproveUsd: 0.04, estimatedDepositUsd: 0.07, estimatedBridgeUsd: 3.4, blockTimeSeconds: 1 },
    { chain: 'Optimism', source: 'rpc', gasPriceGwei: 0.001, estimatedApproveUsd: 0.04, estimatedDepositUsd: 0.07, estimatedBridgeUsd: 2.8, blockTimeSeconds: 2 },
  ],
}

const risks: RiskResponse = {
  source: 'defillama-hacks',
  updatedAt: '2026-05-11T12:00:00.000Z',
  items: [
    {
      date: '2026-05-07T00:00:00.000Z',
      name: 'Protocol incident',
      classification: 'Exploit',
      technique: 'Oracle manipulation',
      amountUsd: 1000000,
      chains: ['Ethereum'],
      source: 'https://example.com',
      severity: 'high',
    },
  ],
}

describe('FeedStatusBar', () => {
  it('summarizes feed freshness, risk tier, gas sources, and refresh action', () => {
    const onRefresh = vi.fn()

    render(
      <FeedStatusBar
        gas={gas}
        onRefresh={onRefresh}
        rates={rates}
        refreshing={false}
        riskTier="medium"
        risks={risks}
      />,
    )

    expect(screen.getByText('Medium risk rates')).toBeInTheDocument()
    expect(screen.getByText('live DeFiLlama')).toBeInTheDocument()
    expect(screen.getByText('3/4 RPC gas')).toBeInTheDocument()
    expect(screen.getByText('May 2026 risk feed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh feeds' })).toBeEnabled()
  })
})
