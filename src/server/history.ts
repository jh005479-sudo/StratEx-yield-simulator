import type { PoolHistoryPoint, StrategyResult } from '../core/types'

type RawHistoryPoint = {
  timestamp?: string
  tvlUsd?: number
  apy?: number
  apyBase?: number | null
  apyReward?: number | null
  il7d?: number | null
}

type RawHistoryResponse = RawHistoryPoint[] | { data?: RawHistoryPoint[] }

const normalizePoint = (point: RawHistoryPoint): PoolHistoryPoint | null => {
  if (!point.timestamp || !Number.isFinite(point.apy) || !Number.isFinite(point.tvlUsd)) return null
  return {
    timestamp: point.timestamp,
    apy: Number(point.apy),
    apyBase: point.apyBase ?? null,
    apyReward: point.apyReward ?? null,
    tvlUsd: Number(point.tvlUsd),
    il7d: point.il7d ?? null,
  }
}

export const fetchPoolHistories = async (strategy: StrategyResult, horizonDays: number) => {
  const cutoff = Date.now() - horizonDays * 24 * 60 * 60 * 1000
  const entries = await Promise.all(
    strategy.positions.map(async (position) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5_000)
      try {
        const response = await fetch(`https://yields.llama.fi/chart/${position.sourcePoolId}`, {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`DeFiLlama chart responded ${response.status}`)
        const payload = (await response.json()) as RawHistoryResponse
        const rows = Array.isArray(payload) ? payload : payload.data ?? []
        const history = rows
          .flatMap((row) => {
            const normalized = normalizePoint(row)
            return normalized ? [normalized] : []
          })
          .filter((point) => new Date(point.timestamp).getTime() >= cutoff)
        return [position.sourcePoolId, history] as const
      } catch {
        return [position.sourcePoolId, []] as const
      } finally {
        clearTimeout(timeout)
      }
    }),
  )

  return Object.fromEntries(entries)
}
