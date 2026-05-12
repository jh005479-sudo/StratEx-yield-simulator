import { describe, expect, it } from 'vitest'
import { filterCurrentMonthHacks } from './risks'

describe('filterCurrentMonthHacks', () => {
  it('keeps only current-month Base, Arbitrum, or Ethereum incidents', () => {
    const rows = filterCurrentMonthHacks(
      [
        {
          date: Date.UTC(2026, 4, 7) / 1000,
          name: 'TrustedVolumes',
          amount: 6_700_000,
          chain: ['Ethereum'],
          technique: 'Forged RFQ Orders',
        },
        {
          date: Date.UTC(2026, 3, 30) / 1000,
          name: 'Old April Exploit',
          amount: 1_000_000,
          chain: ['Arbitrum'],
          technique: 'Old exploit',
        },
        {
          date: Date.UTC(2026, 4, 2) / 1000,
          name: 'Irrelevant Chain',
          amount: 1_000_000,
          chain: ['Bitcoin'],
          technique: 'Wrong chain',
        },
      ],
      new Date('2026-05-11T12:00:00.000Z'),
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('TrustedVolumes')
    expect(rows[0].date).toBe('2026-05-07T00:00:00.000Z')
  })
})
