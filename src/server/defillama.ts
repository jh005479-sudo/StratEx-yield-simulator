import { ALLOWED_ASSETS, ALLOWED_CHAINS } from '../core/config'
import { FALLBACK_POOLS } from '../core/mockData'
import { inferAllowedAssetMatchesForPool } from '../core/strategy'
import type { ContractLink, DeFiYieldPool } from '../core/types'

type RawLlamaPool = {
  chain?: string
  project?: string
  symbol?: string
  tvlUsd?: number
  apy?: number
  apyBase?: number | null
  apyReward?: number | null
  apyMean30d?: number | null
  volumeUsd1d?: number | null
  volumeUsd7d?: number | null
  pool?: string
  stablecoin?: boolean
  ilRisk?: string
  exposure?: string
  poolMeta?: string | null
  underlyingTokens?: string[] | null
}

type RawPoolsResponse = {
  data?: RawLlamaPool[]
}

export type MarketResponse = {
  source: 'live' | 'fallback'
  updatedAt: string
  pools: DeFiYieldPool[]
}

const explorerBase = (chain: (typeof ALLOWED_CHAINS)[number]) => {
  if (chain === 'Ethereum') return 'https://etherscan.io/address/'
  if (chain === 'Base') return 'https://basescan.org/address/'
  if (chain === 'Arbitrum') return 'https://arbiscan.io/address/'
  return 'https://optimistic.etherscan.io/address/'
}

const contractLinks = (raw: RawLlamaPool, chain: (typeof ALLOWED_CHAINS)[number]): ContractLink[] =>
  (raw.underlyingTokens ?? [])
    .filter((token) => /^0x[a-fA-F0-9]{40}$/.test(token))
    .slice(0, 4)
    .map((token, index) => ({
      label: `${raw.symbol ?? 'Token'} underlying ${index + 1}`,
      address: token,
      explorerUrl: `${explorerBase(chain)}${token}`,
    }))

const normalizeRawPool = (raw: RawLlamaPool): DeFiYieldPool[] => {
  if (!raw.chain || !raw.project || !raw.symbol || !raw.pool) return []
  if (!ALLOWED_CHAINS.includes(raw.chain as (typeof ALLOWED_CHAINS)[number])) return []
  if (!Number.isFinite(raw.apy) || !Number.isFinite(raw.tvlUsd)) return []

  const chain = raw.chain as (typeof ALLOWED_CHAINS)[number]
  const assetMatches = inferAllowedAssetMatchesForPool({
    chain,
    project: raw.project,
    symbol: raw.symbol,
    exposure: raw.exposure,
    ilRisk: raw.ilRisk,
    stablecoin: raw.stablecoin,
    underlyingTokens: raw.underlyingTokens ?? undefined,
  }).filter((match) => ALLOWED_ASSETS.includes(match.asset))
  const componentAssets = [...new Set(assetMatches.map((match) => match.asset))]

  return assetMatches.map(({ asset, proof, wrapperKind }) => ({
    id: `${raw.pool}-${asset}`,
    rawPoolId: raw.pool,
    project: raw.project ?? '',
    chain,
    symbol: raw.symbol ?? asset,
    asset,
    componentAssets,
    assetProof: proof,
    wrapperKind,
    apy: Number(raw.apy ?? 0),
    apyBase: raw.apyBase ?? null,
    apyReward: raw.apyReward ?? null,
    apyMean30d: raw.apyMean30d ?? null,
    volumeUsd1d: raw.volumeUsd1d ?? null,
    volumeUsd7d: raw.volumeUsd7d ?? null,
    tvlUsd: Number(raw.tvlUsd ?? 0),
    poolMeta: raw.poolMeta ?? undefined,
    exposure: raw.exposure,
    ilRisk: raw.ilRisk,
    stablecoin: raw.stablecoin,
    underlyingTokens: raw.underlyingTokens ?? undefined,
    url: `https://defillama.com/yields/pool/${raw.pool}`,
    contracts: contractLinks(raw, chain),
  }))
}

export const fetchYieldMarkets = async (): Promise<MarketResponse> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch('https://yields.llama.fi/pools', {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`DeFiLlama responded ${response.status}`)
    const payload = (await response.json()) as RawPoolsResponse
    const pools = (payload.data ?? []).flatMap(normalizeRawPool)

    if (pools.length < 6) throw new Error('DeFiLlama response had too few eligible pools')

    return {
      source: 'live',
      updatedAt: new Date().toISOString(),
      pools,
    }
  } catch (error) {
    console.warn('Using fallback yield pools:', error)
    return {
      source: 'fallback',
      updatedAt: new Date().toISOString(),
      pools: FALLBACK_POOLS,
    }
  } finally {
    clearTimeout(timeout)
  }
}
