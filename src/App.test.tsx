// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { TARGET_BANDS } from './core/config'
import type { AssetRateSummary, YieldAsset } from './core/types'
import {
  getGas,
  getOpportunities,
  getRates,
  getRisks,
  simulateStrategy,
} from './services/api'

vi.mock('./services/api', () => ({
  getGas: vi.fn(),
  getOpportunities: vi.fn(),
  getRates: vi.fn(),
  getRisks: vi.fn(),
  simulateStrategy: vi.fn(),
}))

const assets: YieldAsset[] = ['USDC', 'USDT', 'ETH', 'WETH', 'WBTC', 'ARB', 'XRP', 'ADA']

const rateFor = (asset: YieldAsset): AssetRateSummary => ({
  asset,
  averageApr: 4,
  simpleAverageApr: 4.2,
  baseApr: 3.2,
  rewardApr: 0.8,
  apyMean30d: 3.7,
  minApr: 2.5,
  maxApr: 5.2,
  volatility: 0.4,
  totalTvlUsd: 100_000_000,
  poolCount: 4,
  target: TARGET_BANDS[asset],
})

describe('App workspace navigation', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.mocked(getRates).mockResolvedValue({
      source: 'live',
      updatedAt: new Date('2026-05-11T12:00:00Z').toISOString(),
      riskTier: 'low',
      rates: Object.fromEntries(assets.map((asset) => [asset, rateFor(asset)])) as Record<YieldAsset, AssetRateSummary>,
    })
    vi.mocked(getOpportunities).mockResolvedValue({
      source: 'live',
      updatedAt: new Date('2026-05-11T12:00:00Z').toISOString(),
      opportunities: [],
    })
    vi.mocked(getGas).mockResolvedValue({
      updatedAt: new Date('2026-05-11T12:00:00Z').toISOString(),
      ethPriceUsd: 2300,
      chains: [
        { chain: 'Ethereum', source: 'rpc', gasPriceGwei: 5, estimatedApproveUsd: 1, estimatedDepositUsd: 2, estimatedBridgeUsd: 9, blockTimeSeconds: 12 },
        { chain: 'Base', source: 'rpc', gasPriceGwei: 0.006, estimatedApproveUsd: 0.04, estimatedDepositUsd: 0.07, estimatedBridgeUsd: 2.9, blockTimeSeconds: 2 },
        { chain: 'Arbitrum', source: 'rpc', gasPriceGwei: 0.02, estimatedApproveUsd: 0.04, estimatedDepositUsd: 0.07, estimatedBridgeUsd: 3.4, blockTimeSeconds: 1 },
        { chain: 'Optimism', source: 'rpc', gasPriceGwei: 0.001, estimatedApproveUsd: 0.04, estimatedDepositUsd: 0.07, estimatedBridgeUsd: 2.8, blockTimeSeconds: 2 },
      ],
    })
    vi.mocked(getRisks).mockResolvedValue({
      source: 'live',
      updatedAt: new Date('2026-05-11T12:00:00Z').toISOString(),
      items: [],
    })
    vi.mocked(simulateStrategy).mockReset()
  })

  it('opens analytics as top-level pages instead of keeping them inside the capital panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    const workspaceNav = await screen.findByRole('navigation', { name: 'Strategy workspace pages' })
    expect(within(workspaceNav).getByRole('button', { name: /Build Route/i })).toHaveAttribute('aria-current', 'page')

    await user.click(within(workspaceNav).getByRole('button', { name: /Backtest/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Historical Backtest' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: 'Capital Allocation Panel' })).not.toBeInTheDocument()
    expect(screen.getByText(/Run a simulation on Build Route to populate historical analytics/i)).toBeInTheDocument()
  })

  it('adds decision context and preset controls to standalone pages', async () => {
    const user = userEvent.setup()
    render(<App />)

    const workspaceNav = await screen.findByRole('navigation', { name: 'Strategy workspace pages' })
    await user.click(within(workspaceNav).getByRole('button', { name: /Constraints/i }))

    expect(await screen.findByText('Simulation context')).toBeInTheDocument()
    expect(screen.getByText('100,000 USDC')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Conservative/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Balanced/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exploratory/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Conservative/i }))

    expect(screen.getByLabelText('No bridge routes')).toBeChecked()
    expect(screen.getByLabelText('Single-asset only')).toBeChecked()
  })
})
