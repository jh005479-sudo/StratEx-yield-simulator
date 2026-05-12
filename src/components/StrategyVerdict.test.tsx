// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StrategyVerdict } from './StrategyVerdict'

describe('StrategyVerdict', () => {
  it('uses the expanded simulator mandate in the safety gates', () => {
    render(
      <StrategyVerdict
        amount={100_000}
        asset="USDC"
        riskTier="medium"
        target={{ min: 7, max: 10 }}
      />,
    )

    expect(screen.getByText('8 assets')).toBeInTheDocument()
    expect(screen.getByText('4 supported chains')).toBeInTheDocument()
    expect(screen.queryByText('4 assets only')).not.toBeInTheDocument()
    expect(screen.queryByText('Base / Arbitrum')).not.toBeInTheDocument()
  })

  it('shows an intentional market-depth block instead of an error-style empty state', () => {
    render(
      <StrategyVerdict
        amount={100_000}
        asset="USDT"
        marketDepthBlock={{ asset: 'USDT', eligibleMarkets: 1, minimumMarkets: 2 }}
        riskTier="low"
        target={{ min: 7, max: 10 }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Insufficient USDT market depth' })).toBeInTheDocument()
    expect(screen.getByText(/requires at least 2 eligible markets/i)).toBeInTheDocument()
    expect(screen.getByText('1/2 markets')).toBeInTheDocument()
  })
})
