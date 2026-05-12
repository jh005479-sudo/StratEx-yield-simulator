type RawHack = {
  date?: number
  name?: string
  classification?: string
  technique?: string
  amount?: number
  chain?: string[]
  source?: string
  targetType?: string
}

const relevantChains = ['Ethereum', 'Base', 'Arbitrum', 'Optimism']

const monthBounds = (now = new Date()) => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { start, end }
}

export const filterCurrentMonthHacks = (payload: RawHack[], now = new Date()) => {
  const { start, end } = monthBounds(now)

  return payload
    .filter((hack) => {
      if (!hack.date) return false
      const date = new Date(hack.date * 1000)
      return (
        date >= start &&
        date < end &&
        (hack.chain ?? []).some((chain) => relevantChains.includes(chain))
      )
    })
    .sort((left, right) => (right.date ?? 0) - (left.date ?? 0))
    .map((hack) => ({
      date: hack.date ? new Date(hack.date * 1000).toISOString() : new Date().toISOString(),
      name: hack.name ?? 'Unknown incident',
      classification: hack.classification ?? 'Exploit',
      technique: hack.technique ?? 'Unknown technique',
      amountUsd: hack.amount ?? 0,
      chains: hack.chain ?? [],
      source: hack.source || 'https://defillama.com/hacks',
      severity: (hack.amount ?? 0) > 10_000_000 ? 'high' : (hack.amount ?? 0) > 1_000_000 ? 'medium' : 'low',
    }))
}

export const fetchRiskFeed = async () => {
  try {
    const response = await fetch('https://api.llama.fi/hacks', {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`DeFiLlama hacks responded ${response.status}`)
    const payload = (await response.json()) as RawHack[]
    const relevant = filterCurrentMonthHacks(payload).slice(0, 8)

    return {
      source: 'defillama-hacks',
      updatedAt: new Date().toISOString(),
      items: relevant,
    }
  } catch {
    return {
      source: 'fallback',
      updatedAt: new Date().toISOString(),
      items: [],
    }
  }
}
