import {
  ALLOWED_ASSETS,
  ALLOWED_CHAINS,
  BLUECHIP_PROTOCOLS,
  DEFAULT_ASSET_PRICES_USD,
  FALLBACK_CONTRACTS,
  LOW_RISK_PROTOCOLS,
  MEDIUM_RISK_PROTOCOLS,
  MIN_OPPORTUNITY_TVL_USD,
  PROTOCOL_ADAPTERS,
  RISK_TIER_CONFIG,
  TARGET_BANDS,
} from './config'
import { DEFAULT_STRATEGY_CONSTRAINTS } from './analytics'
import type {
  AssetRateSummary,
  ChainName,
  DeFiYieldPool,
  ExecutionStep,
  GasAssumption,
  OpportunityAlert,
  ProtocolAdapterAssumption,
  RiskTier,
  StrategyPosition,
  StrategyConstraints,
  StrategyRequest,
  StrategyResult,
  SupportedChain,
  YieldAsset,
} from './types'

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const titleCase = (value: string) =>
  value
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const normalizeProject = (project: string) => project.trim().toLowerCase()

const canonicalProject = (project: string) => {
  const normalized = normalizeProject(project)
  if (normalized.includes('aave')) return 'aave-v3'
  if (normalized.includes('morpho')) return 'morpho-blue'
  if (normalized.includes('uniswap')) return 'uniswap-v3'
  if (normalized.includes('curve')) return 'curve-dex'
  if (normalized.includes('balancer')) return 'balancer'
  if (normalized.includes('pendle')) return 'pendle'
  if (normalized.includes('aerodrome')) return 'aerodrome'
  if (normalized.includes('velodrome')) return 'velodrome-v2'
  if (normalized.includes('compound')) return 'compound-v3'
  if (normalized.includes('spark')) return normalized.includes('saving') ? 'spark-savings' : 'sparklend'
  if (normalized.includes('sky')) return 'sky-lending'
  if (normalized.includes('maple')) return 'maple'
  if (normalized.includes('lido')) return 'lido'
  if (normalized.includes('rocket')) return 'rocket-pool'
  if (normalized.includes('ether.fi stake') || normalized.includes('etherfi stake')) return 'ether.fi-stake'
  if (normalized.includes('ether.fi') || normalized.includes('etherfi')) return 'ether.fi'
  if (normalized.includes('fluid')) return 'fluid-lending'
  if (normalized.includes('yearn')) return 'yearn'
  if (normalized.includes('beefy')) return 'beefy'
  if (normalized.includes('convex')) return 'convex-finance'
  if (normalized.includes('aura')) return 'aura'
  if (normalized.includes('gearbox')) return 'gearbox'
  if (normalized.includes('frax')) return 'frax'
  if (normalized.includes('silo')) return 'silo'
  if (normalized.includes('moonwell')) return 'moonwell'
  return normalized
}

const platformLabel = (project: string) =>
  BLUECHIP_PROTOCOLS[canonicalProject(project)] ?? titleCase(project)

type AssetMatch = {
  asset: YieldAsset
  proof: DeFiYieldPool['assetProof']
  wrapperKind: DeFiYieldPool['wrapperKind']
}

type TokenAssetRecord = {
  asset: YieldAsset
  wrapperKind: DeFiYieldPool['wrapperKind']
}

const token = (asset: YieldAsset, wrapperKind: DeFiYieldPool['wrapperKind'] = 'canonical'): TokenAssetRecord => ({
  asset,
  wrapperKind,
})

const TOKEN_ASSET_BY_CHAIN: Record<SupportedChain, Record<string, TokenAssetRecord>> = {
  Ethereum: {
    '0x0000000000000000000000000000000000000000': token('ETH'),
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': token('WETH'),
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': token('USDC'),
    '0xdac17f958d2ee523a2206206994597c13d831ec7': token('USDT'),
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': token('WBTC'),
    '0xb50721bcf8d664c30412cfbc6cf7a15145234ad1': token('ARB', 'wrapped'),
  },
  Base: {
    '0x0000000000000000000000000000000000000000': token('ETH'),
    '0x4200000000000000000000000000000000000006': token('WETH'),
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': token('USDC'),
    '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2': token('USDT'),
    '0xcb585250f852c6c6bf90434ab21a00f02833a4af': token('XRP', 'wrapped'),
    '0x2615a94df961278dcbc41fb0a54fec5f10a693ae': token('XRP', 'wrapped'),
    '0xcbada732173e39521cdbe8bf59a6dc85a9fc7b8c': token('ADA', 'wrapped'),
    '0xa3a34a0d9a08ccddb6ed422ac0a28a06731335aa': token('ADA', 'wrapped'),
  },
  Arbitrum: {
    '0x0000000000000000000000000000000000000000': token('ETH'),
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': token('WETH'),
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': token('USDC'),
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': token('USDC'),
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': token('USDT'),
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': token('WBTC'),
    '0x912ce59144191c1204e64559fe8253a0e49e6548': token('ARB'),
  },
  Optimism: {
    '0x0000000000000000000000000000000000000000': token('ETH'),
    '0x4200000000000000000000000000000000000006': token('WETH'),
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85': token('USDC'),
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607': token('USDC'),
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': token('USDT'),
    '0x68f180fcce6836688e9084f035309e29bf0a2095': token('WBTC'),
  },
}

const DEFAULT_GAS_ASSUMPTIONS: Record<SupportedChain, GasAssumption> = {
  Ethereum: { approveUsd: 1.6, depositUsd: 3.2, bridgeUsd: 9.4, blockTimeSeconds: 12 },
  Base: { approveUsd: 0.08, depositUsd: 0.14, bridgeUsd: 2.9, blockTimeSeconds: 2 },
  Arbitrum: { approveUsd: 0.12, depositUsd: 0.22, bridgeUsd: 3.4, blockTimeSeconds: 1 },
  Optimism: { approveUsd: 0.1, depositUsd: 0.18, bridgeUsd: 2.8, blockTimeSeconds: 2 },
}

type PoolAssetSource = Pick<
  DeFiYieldPool,
  'chain' | 'project' | 'symbol' | 'poolMeta' | 'exposure' | 'ilRisk' | 'stablecoin' | 'underlyingTokens'
> & {
  asset?: YieldAsset
}

export const isAllowedAsset = (asset: string): asset is YieldAsset =>
  ALLOWED_ASSETS.includes(asset.toUpperCase() as YieldAsset)

const SYMBOL_ASSET_ALIASES: Record<string, { asset: YieldAsset; wrapperKind: DeFiYieldPool['wrapperKind'] }> = {
  ETH: { asset: 'ETH', wrapperKind: 'canonical' },
  WETH: { asset: 'WETH', wrapperKind: 'canonical' },
  USDC: { asset: 'USDC', wrapperKind: 'canonical' },
  'USDC.E': { asset: 'USDC', wrapperKind: 'wrapped' },
  USDT: { asset: 'USDT', wrapperKind: 'canonical' },
  WBTC: { asset: 'WBTC', wrapperKind: 'canonical' },
  ARB: { asset: 'ARB', wrapperKind: 'canonical' },
  XRP: { asset: 'XRP', wrapperKind: 'canonical' },
  CBXRP: { asset: 'XRP', wrapperKind: 'wrapped' },
  UXRP: { asset: 'XRP', wrapperKind: 'wrapped' },
  ADA: { asset: 'ADA', wrapperKind: 'canonical' },
  CBADA: { asset: 'ADA', wrapperKind: 'wrapped' },
  UADA: { asset: 'ADA', wrapperKind: 'wrapped' },
}

export const normalizeAsset = (assetOrSymbol: string): YieldAsset | null => {
  return SYMBOL_ASSET_ALIASES[assetOrSymbol.toUpperCase()]?.asset ?? null
}

export const extractAllowedAssetsFromSymbol = (symbol: string) => {
  const parts = symbol
    .toUpperCase()
    .replace(/[()[\]{}]/g, ' ')
    .split(/[\s/_+-]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const assets = new Set<YieldAsset>()
  const matches: AssetMatch[] = []
  let hasUnknownToken = false

  for (const part of parts) {
    const token = part.replace(/[^A-Z0-9.]/g, '')
    const normalized = SYMBOL_ASSET_ALIASES[token]
    if (normalized) {
      assets.add(normalized.asset)
      matches.push({
        asset: normalized.asset,
        proof: normalized.wrapperKind === 'canonical' ? 'exact-symbol' : 'known-wrapper',
        wrapperKind: normalized.wrapperKind,
      })
    } else {
      hasUnknownToken = true
    }
  }

  return {
    assets: [...assets],
    matches,
    isPureAllowedSet: assets.size > 0 && !hasUnknownToken,
  }
}

const stablecoinMatchesAsset = (pool: PoolAssetSource, asset: YieldAsset) => {
  if (typeof pool.stablecoin !== 'boolean') return true
  return pool.stablecoin === (asset === 'USDC' || asset === 'USDT')
}

const mergeMatch = (matches: Map<YieldAsset, AssetMatch>, match: AssetMatch) => {
  const existing = matches.get(match.asset)
  if (!existing || existing.proof !== 'canonical-token') {
    matches.set(match.asset, match)
  }
}

export const inferAllowedAssetMatchesForPool = (pool: PoolAssetSource) => {
  const matches = new Map<YieldAsset, AssetMatch>()
  const symbolParts = extractAllowedAssetsFromSymbol(pool.symbol)

  for (const match of symbolParts.matches) {
    mergeMatch(matches, match)
  }

  if (isAllowedChain(pool.chain)) {
    const chainTokens = TOKEN_ASSET_BY_CHAIN[pool.chain]
    for (const token of pool.underlyingTokens ?? []) {
      const tokenRecord = chainTokens[token.toLowerCase()]
      if (tokenRecord && isAllowedAsset(tokenRecord.asset)) {
        mergeMatch(matches, {
          asset: tokenRecord.asset,
          proof: 'canonical-token',
          wrapperKind: tokenRecord.wrapperKind,
        })
      }
    }
  }

  return [...matches.values()]
}

export const inferAllowedAssetsForPool = (pool: PoolAssetSource) => {
  return inferAllowedAssetMatchesForPool(pool).map((match) => match.asset)
}

const assetMatches = (pool: DeFiYieldPool, requestedAsset: YieldAsset) => {
  const requestedAssets = requestedAsset === 'ETH' ? ['ETH', 'WETH'] : [requestedAsset]
  return requestedAssets.includes(pool.asset) && inferAllowedAssetsForPool(pool).includes(pool.asset)
}

const isAllowedChain = (chain: ChainName): chain is SupportedChain =>
  ALLOWED_CHAINS.includes(chain as SupportedChain)

const isLowRiskProject = (project: string) =>
  LOW_RISK_PROTOCOLS.includes(canonicalProject(project) as (typeof LOW_RISK_PROTOCOLS)[number])

const isMediumRiskProject = (project: string) =>
  MEDIUM_RISK_PROTOCOLS.includes(canonicalProject(project) as (typeof MEDIUM_RISK_PROTOCOLS)[number])

export const filterEligiblePools = (pools: DeFiYieldPool[], asset: YieldAsset, riskTier: RiskTier = 'low') => {
  const config = RISK_TIER_CONFIG[riskTier]

  return pools.filter((pool) => {
    if (!isAllowedChain(pool.chain)) return false
    if (!assetMatches(pool, asset)) return false
    if (pool.tvlUsd < config.minTvlUsd) return false
    if (pool.apy <= 0 || pool.apy > config.maxApy) return false

    if (riskTier === 'low') {
      if (!isLowRiskProject(pool.project)) return false
      if (!stablecoinMatchesAsset(pool, asset)) return false
      if (pool.exposure !== 'single') return false
      if (pool.ilRisk !== 'no') return false
    }

    if (riskTier === 'medium') {
      if (!isMediumRiskProject(pool.project)) return false
      if (pool.tvlUsd < config.minTvlUsd) return false
      if (pool.ilRisk === 'yes' && pool.exposure !== 'multi') return false
    }

    return true
  })
}

const riskGradeFor = (pool: DeFiYieldPool, riskTier: RiskTier): StrategyPosition['riskGrade'] => {
  if (riskTier === 'high') return pool.tvlUsd >= 1_000_000 ? 'C' : 'D'
  if (pool.ilRisk === 'yes' || pool.exposure === 'multi') return 'B'
  if (pool.tvlUsd >= 50_000_000) return 'A'
  if (pool.tvlUsd >= 10_000_000) return 'A-'
  return riskTier === 'medium' ? 'B+' : 'B'
}

const scorePool = (
  pool: DeFiYieldPool,
  asset: YieldAsset,
  preferredChain: SupportedChain,
  riskTier: RiskTier,
) => {
  const target = TARGET_BANDS[asset]
  const midpoint = (target.min + target.max) / 2
  const distancePenalty = Math.abs(pool.apy - midpoint) * (riskTier === 'high' ? 3 : 10)
  const chainBonus = pool.chain === preferredChain ? 10 : 0
  const tvlBonus = Math.min(20, Math.log10(Math.max(pool.tvlUsd, 1)) * 2)
  const baseYieldBonus = Math.min(8, Math.max(0, pool.apyBase ?? 0))
  const ilPenalty = pool.ilRisk === 'yes' ? (riskTier === 'low' ? 20 : riskTier === 'medium' ? 7 : 2) : 0
  const highApyPenalty = riskTier === 'high' && pool.apy > 100 ? 8 : 0
  return 100 - distancePenalty + chainBonus + tvlBonus + baseYieldBonus - ilPenalty - highApyPenalty
}

const defaultContractsFor = (pool: DeFiYieldPool) => {
  if (pool.contracts.length > 0) return pool.contracts
  const chain = isAllowedChain(pool.chain) ? pool.chain : 'Base'
  return FALLBACK_CONTRACTS[canonicalProject(pool.project)]?.[chain] ?? []
}

const sourcePoolKey = (pool: DeFiYieldPool) =>
  pool.rawPoolId ?? (pool.url.includes('/pool/') ? pool.url : pool.id)

const adapterFor = (pool: DeFiYieldPool): ProtocolAdapterAssumption => {
  const chain = isAllowedChain(pool.chain) ? pool.chain : 'Base'
  const protocol = canonicalProject(pool.project)
  const configured = PROTOCOL_ADAPTERS[protocol]?.[chain]
  if (configured) return configured

  const fallbackTarget = defaultContractsFor(pool)[0]?.address ?? `${protocol}-adapter`
  return {
    protocol,
    chain,
    depositTarget: fallbackTarget,
    approvalTarget: fallbackTarget,
    withdrawalPath: 'Protocol-specific withdrawal path requires adapter confirmation',
    minDepositUsd: pool.exposure === 'multi' ? 500 : 100,
    approveGasUnits: 70_000,
    depositGasUnits: pool.exposure === 'multi' ? 240_000 : 155_000,
    withdrawGasUnits: pool.exposure === 'multi' ? 260_000 : 180_000,
    notes: `${platformLabel(pool.project)} uses a generic simulator adapter until a protocol-specific adapter is added.`,
  }
}

const scaledGasUsd = (baselineUsd: number, gasUnits: number, baselineUnits: number) =>
  round(baselineUsd * (gasUnits / baselineUnits), 2)

const resolveConstraints = (constraints?: Partial<StrategyConstraints>): StrategyConstraints => ({
  ...DEFAULT_STRATEGY_CONSTRAINTS,
  ...constraints,
})

const passesRouteConstraints = (
  pool: DeFiYieldPool,
  preferredChain: SupportedChain,
  constraints: StrategyConstraints,
) => {
  if (constraints.noBridge && pool.chain !== preferredChain) return false
  if (constraints.excludeWrappedAssets && pool.wrapperKind && pool.wrapperKind !== 'canonical') return false
  if (constraints.singleAssetOnly && pool.exposure !== 'single') return false
  if (constraints.baseYieldOnly && (pool.apyReward ?? 0) > 0.25) return false
  if (constraints.minTvlUsd > 0 && pool.tvlUsd < constraints.minTvlUsd) return false
  return true
}

const allocate = (
  amount: number,
  pools: DeFiYieldPool[],
  asset: YieldAsset,
  preferredChain: SupportedChain,
  riskTier: RiskTier,
  constraints: StrategyConstraints,
) => {
  const scores = pools.map((pool) => Math.max(5, scorePool(pool, asset, preferredChain, riskTier)))
  const protocolCap = Math.max(1, Math.min(100, constraints.maxProtocolAllocationPct)) / 100
  const chainCap = Math.max(1, Math.min(100, constraints.maxChainAllocationPct)) / 100
  const assignedPct = new Array(pools.length).fill(0) as number[]
  const assignedByProtocol = new Map<string, number>()
  const assignedByChain = new Map<string, number>()
  let remainingPct = 1

  for (let pass = 0; pass < 12 && remainingPct > 0.0001; pass += 1) {
    const candidates = pools
      .map((pool, index) => ({ pool, index, score: scores[index] }))
      .filter(({ pool }) => {
        const protocolUsed = assignedByProtocol.get(canonicalProject(pool.project)) ?? 0
        const chainUsed = assignedByChain.get(pool.chain) ?? 0
        return protocolUsed < protocolCap - 0.0001 && chainUsed < chainCap - 0.0001
      })

    if (candidates.length === 0) break
    const candidateScoreTotal = candidates.reduce((sum, item) => sum + item.score, 0)
    let assignedThisPass = 0

    for (const { pool, index, score } of candidates) {
      const protocol = canonicalProject(pool.project)
      const protocolRemaining = protocolCap - (assignedByProtocol.get(protocol) ?? 0)
      const chainRemaining = chainCap - (assignedByChain.get(pool.chain) ?? 0)
      const capacity = Math.max(0, Math.min(protocolRemaining, chainRemaining))
      const share = remainingPct * (score / candidateScoreTotal)
      const add = Math.min(capacity, share)
      assignedPct[index] += add
      assignedByProtocol.set(protocol, (assignedByProtocol.get(protocol) ?? 0) + add)
      assignedByChain.set(pool.chain, (assignedByChain.get(pool.chain) ?? 0) + add)
      assignedThisPass += add
    }

    remainingPct = Math.max(0, remainingPct - assignedThisPass)
    if (assignedThisPass <= 0.0001) break
  }

  if (remainingPct > 0.001) {
    throw new Error('Route constraints leave no deployable allocation capacity')
  }

  let assigned = 0

  return pools.map((pool, index) => {
    const rawPct = assignedPct[index]
    const amountForPosition =
      index === pools.length - 1 ? amount - assigned : round(amount * rawPct, amount < 100 ? 6 : 2)
    assigned += amountForPosition

    return {
      pool,
      amount: amountForPosition,
      pct: amountForPosition / amount,
    }
  })
}

const balancePoolsByChain = (pools: DeFiYieldPool[], preferredChain: SupportedChain) => {
  const chainOrder = [
    preferredChain,
    ...ALLOWED_CHAINS.filter((chain) => chain !== preferredChain),
  ] as SupportedChain[]
  const byChain = new Map(chainOrder.map((chain) => [chain, pools.filter((pool) => pool.chain === chain)]))
  const balanced: DeFiYieldPool[] = []

  while (balanced.length < pools.length) {
    let addedThisRound = false
    for (const chain of chainOrder) {
      const next = byChain.get(chain)?.shift()
      if (!next) continue
      balanced.push(next)
      addedThisRound = true
    }
    if (!addedThisRound) break
  }

  return balanced
}

const selectDiversePools = (
  pools: DeFiYieldPool[],
  asset: YieldAsset,
  preferredChain: SupportedChain,
  riskTier: RiskTier,
) => {
  const maxPositions = RISK_TIER_CONFIG[riskTier].maxPositions
  const sorted = [...pools].sort(
    (left, right) =>
      scorePool(right, asset, preferredChain, riskTier) - scorePool(left, asset, preferredChain, riskTier),
  )
  const protocolOrder = [
    ...new Set(sorted.map((pool) => canonicalProject(pool.project))),
  ].sort((left, right) => {
    const bestLeft = sorted.find((pool) => canonicalProject(pool.project) === left)
    const bestRight = sorted.find((pool) => canonicalProject(pool.project) === right)
    if (!bestLeft || !bestRight) return 0
    return scorePool(bestRight, asset, preferredChain, riskTier) - scorePool(bestLeft, asset, preferredChain, riskTier)
  })
  const byProtocol = new Map(
    protocolOrder.map((protocol) => [
      protocol,
      balancePoolsByChain(
        sorted.filter((pool) => canonicalProject(pool.project) === protocol),
        preferredChain,
      ),
    ]),
  )
  const selected: DeFiYieldPool[] = []
  const selectedSourceKeys = new Set<string>()

  while (selected.length < maxPositions) {
    let addedThisRound = false
    for (const protocol of protocolOrder) {
      const next = byProtocol.get(protocol)?.shift()
      if (!next) continue
      const key = sourcePoolKey(next)
      if (selectedSourceKeys.has(key)) continue
      selected.push(next)
      selectedSourceKeys.add(key)
      addedThisRound = true
      if (selected.length >= maxPositions) break
    }
    if (!addedThisRound) break
  }

  return selected
}

const gasFor = (chain: SupportedChain, assumptions?: Partial<Record<SupportedChain, GasAssumption>>) =>
  assumptions?.[chain] ?? DEFAULT_GAS_ASSUMPTIONS[chain]

const buildExecutionSteps = (
  requestedAsset: YieldAsset,
  selected: DeFiYieldPool[],
  preferredChain: SupportedChain,
  gasAssumptions?: Partial<Record<SupportedChain, GasAssumption>>,
): ExecutionStep[] => {
  const steps: ExecutionStep[] = []

  if (requestedAsset === 'ETH') {
    steps.push({
      kind: 'wrap',
      label: 'Wrap ETH to WETH before protocol deposits',
      chain: preferredChain,
      estimatedGasUsd: gasFor(preferredChain, gasAssumptions).approveUsd,
      estimatedSeconds: gasFor(preferredChain, gasAssumptions).blockTimeSeconds,
    })
  }

  const uniqueRemoteChains = [...new Set(selected.map((pool) => pool.chain).filter((chain) => chain !== preferredChain))]

  for (const chain of uniqueRemoteChains) {
    if (!isAllowedChain(chain)) continue
    const gas = gasFor(chain, gasAssumptions)
    steps.push({
      kind: 'bridge',
      label: `Bridge allocation from ${preferredChain} to ${chain}`,
      chain,
      estimatedGasUsd: gas.bridgeUsd,
      estimatedSeconds: chain === 'Ethereum' ? 900 : 780,
    })
  }

  for (const pool of selected) {
    const chain = isAllowedChain(pool.chain) ? pool.chain : preferredChain
    const gas = gasFor(chain, gasAssumptions)
    const adapter = adapterFor(pool)
    steps.push(
      {
        kind: 'approve',
        label: `Approve ${platformLabel(pool.project)} ${pool.symbol} market`,
        chain,
        estimatedGasUsd: scaledGasUsd(gas.approveUsd, adapter.approveGasUnits, 70_000),
        estimatedSeconds: gas.blockTimeSeconds * 3,
        adapter,
      },
      {
        kind: 'deposit',
        label: `Deploy into ${platformLabel(pool.project)} ${pool.poolMeta ?? pool.symbol}`,
        chain,
        estimatedGasUsd: scaledGasUsd(gas.depositUsd, adapter.depositGasUnits, 135_000),
        estimatedSeconds: gas.blockTimeSeconds * 4,
        adapter,
      },
    )
  }

  steps.push({
    kind: 'monitor',
    label: 'Start APY drift, exploit, and anomaly monitoring',
    chain: preferredChain,
    estimatedGasUsd: 0,
    estimatedSeconds: 1,
  })

  return steps
}

const MAX_MARKET_DATA_AGE_MS = 20 * 60 * 1000

const assertMarketDataUsable = (source?: StrategyRequest['marketSource'], updatedAt?: string) => {
  if (source && source !== 'live') {
    throw new Error('Simulation requires live DeFiLlama market data. Fallback data is display-only.')
  }

  if (!updatedAt) return
  const ageMs = Date.now() - new Date(updatedAt).getTime()
  if (!Number.isFinite(ageMs) || ageMs > MAX_MARKET_DATA_AGE_MS) {
    throw new Error('Simulation requires fresh live DeFiLlama market data. Refresh feeds and retry.')
  }
}

const resolveAssetPrices = (prices?: Partial<Record<YieldAsset, number>>) => ({
  ...DEFAULT_ASSET_PRICES_USD,
  ...Object.fromEntries(
    Object.entries(prices ?? {}).filter(([, price]) => Number.isFinite(price) && Number(price) > 0),
  ),
}) as Record<YieldAsset, number>

export const buildStrategy = ({
  asset,
  amount,
  preferredChain,
  riskTier,
  pools,
  constraints,
  marketSource,
  marketUpdatedAt,
  assetPricesUsd,
  gasAssumptions,
}: StrategyRequest): StrategyResult => {
  assertMarketDataUsable(marketSource, marketUpdatedAt)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be greater than zero')
  }

  const prices = resolveAssetPrices(assetPricesUsd)
  const routeConstraints = resolveConstraints(constraints)
  const assetPriceUsd = prices[asset]
  const notionalUsd = round(amount * assetPriceUsd, amount < 100 ? 2 : 0)
  const target = TARGET_BANDS[asset]
  const allAssetPools = pools.filter((pool) => isAllowedChain(pool.chain) && assetMatches(pool, asset))
  const filtered = filterEligiblePools(pools, asset, riskTier).filter((pool) =>
    passesRouteConstraints(pool, preferredChain, routeConstraints),
  )
  const eligible = selectDiversePools(filtered, asset, preferredChain, riskTier)
  const uniqueEligibleCount = new Set(filtered.map(sourcePoolKey)).size
  const minimumPositions = RISK_TIER_CONFIG[riskTier].minimumPositions

  if (eligible.length < minimumPositions) {
    throw new Error(`Not enough eligible ${asset} markets for ${riskTier} risk simulation`)
  }

  const allocations = allocate(amount, eligible, asset, preferredChain, riskTier, routeConstraints)
  const deployedAsset = asset === 'ETH' ? 'WETH' : asset

  const positions: StrategyPosition[] = allocations.map(({ pool, amount: positionAmount, pct }) => {
    const chain = isAllowedChain(pool.chain) ? pool.chain : preferredChain
    const grade = riskGradeFor(pool, riskTier)
    const positionAmountUsd = round(positionAmount * assetPriceUsd, positionAmount < 100 ? 2 : 0)
    const expectedAnnualYield = positionAmount * (pool.apy / 100)
    const adapter = adapterFor(pool)
    return {
      id: pool.id,
      platform: canonicalProject(pool.project),
      platformLabel: platformLabel(pool.project),
      chain,
      asset: deployedAsset,
      amount: round(positionAmount, amount < 100 ? 6 : 2),
      amountUsd: positionAmountUsd,
      allocationPct: round(pct * 100, 1),
      apr: round(pool.apy, 2),
      apyBase: pool.apyBase ?? null,
      apyReward: pool.apyReward ?? null,
      apyMean30d: pool.apyMean30d ?? null,
      expectedAnnualYield: round(expectedAnnualYield, amount < 100 ? 6 : 2),
      expectedAnnualYieldUsd: round(positionAmountUsd * (pool.apy / 100), 2),
      riskGrade: grade,
      riskTier,
      tvlUsd: round(pool.tvlUsd, 0),
      exposure: pool.exposure,
      wrapperKind: pool.wrapperKind,
      rationale:
        riskTier === 'low'
          ? `${platformLabel(pool.project)} passes low-risk gates: blue-chip platform, single-asset exposure, no IL flag, and deep TVL.`
          : `${platformLabel(pool.project)} is included by the ${riskTier} simulator universe using live DeFiLlama APY, TVL, exposure, and IL metadata.`,
      sourcePoolId: sourcePoolKey(pool),
      componentAssets: pool.componentAssets ?? inferAllowedAssetsForPool(pool),
      adapter,
      contracts: defaultContractsFor(pool),
      url: pool.url,
    }
  })

  const blendedApr = round(
    positions.reduce((sum, position) => sum + position.apr * (position.amount / amount), 0),
    2,
  )
  const executionSteps = buildExecutionSteps(asset, eligible, preferredChain, gasAssumptions)
  const estimatedCostsUsd = round(executionSteps.reduce((sum, step) => sum + step.estimatedGasUsd, 0), 2)
  const expectedAnnualYield = round(amount * (blendedApr / 100), amount < 100 ? 6 : 2)
  const expectedAnnualYieldUsd = round(notionalUsd * (blendedApr / 100), 2)
  const platformBreakdown = Array.from(
    positions
      .reduce((breakdown, position) => {
        const existing = breakdown.get(position.platform) ?? {
          platform: position.platform,
          platformLabel: position.platformLabel,
          aprContribution: 0,
          allocationPct: 0,
        }
        existing.aprContribution += position.apr * (position.amount / amount)
        existing.allocationPct += position.allocationPct
        breakdown.set(position.platform, existing)
        return breakdown
      }, new Map<string, { platform: string; platformLabel: string; aprContribution: number; allocationPct: number }>())
      .values(),
  ).map((item) => ({
    ...item,
    aprContribution: round(item.aprContribution, 2),
    allocationPct: round(item.allocationPct, 1),
  }))

  return {
    id: `strategy-${asset.toLowerCase()}-${riskTier}-${Math.round(amount)}-${preferredChain.toLowerCase()}`,
    mode: 'test',
    asset,
    deployedAsset,
    amount,
    assetPriceUsd: round(assetPriceUsd, assetPriceUsd < 10 ? 4 : 2),
    notionalUsd,
    preferredChain,
    riskTier,
    target,
    blendedApr,
    expectedAnnualYield,
    expectedAnnualYieldUsd,
    expectedMonthlyYield: round(expectedAnnualYield / 12, amount < 100 ? 6 : 2),
    expectedMonthlyYieldUsd: round(expectedAnnualYieldUsd / 12, 2),
    targetStatus:
      blendedApr < target.min ? 'below-target' : blendedApr > target.max ? 'above-target' : 'inside-target',
    estimatedCostsUsd,
    estimatedCompletionSeconds: executionSteps.reduce((sum, step) => sum + step.estimatedSeconds, 0),
    platformBreakdown,
    marketUniverse: {
      scannedPools: allAssetPools.length,
      eligiblePools: uniqueEligibleCount,
      selectedPools: positions.length,
    },
    executionSteps,
    positions,
    createdAt: new Date().toISOString(),
  }
}

export const summarizeAssetRates = (
  pools: DeFiYieldPool[],
  riskTier: RiskTier = 'low',
): Record<YieldAsset, AssetRateSummary> => {
  const emptySummary = (asset: YieldAsset): AssetRateSummary => ({
    asset,
    averageApr: 0,
    simpleAverageApr: 0,
    apyMean30d: 0,
    baseApr: 0,
    rewardApr: 0,
    minApr: 0,
    maxApr: 0,
    volatility: 0,
    totalTvlUsd: 0,
    poolCount: 0,
    target: TARGET_BANDS[asset],
  })

  const summaries = Object.fromEntries(
    ALLOWED_ASSETS.map((asset) => [asset, emptySummary(asset)]),
  ) as Record<YieldAsset, AssetRateSummary>

  for (const asset of ALLOWED_ASSETS) {
    const related = filterEligiblePools(pools, asset, riskTier)
    if (related.length === 0) continue
    const totalTvlUsd = related.reduce((sum, pool) => sum + pool.tvlUsd, 0)
    const weighted = (selector: (pool: DeFiYieldPool) => number | null | undefined) =>
      totalTvlUsd > 0
        ? related.reduce((sum, pool) => sum + (selector(pool) ?? 0) * pool.tvlUsd, 0) / totalTvlUsd
        : related.reduce((sum, pool) => sum + (selector(pool) ?? 0), 0) / related.length
    const averageApr = weighted((pool) => pool.apy)
    const variance = weighted((pool) => (pool.apy - averageApr) ** 2)

    summaries[asset] = {
      asset,
      averageApr: round(averageApr, 2),
      simpleAverageApr: round(related.reduce((sum, pool) => sum + pool.apy, 0) / related.length, 2),
      apyMean30d: round(weighted((pool) => pool.apyMean30d ?? pool.apy), 2),
      baseApr: round(weighted((pool) => pool.apyBase ?? 0), 2),
      rewardApr: round(weighted((pool) => pool.apyReward ?? 0), 2),
      minApr: round(Math.min(...related.map((pool) => pool.apy)), 2),
      maxApr: round(Math.max(...related.map((pool) => pool.apy)), 2),
      volatility: round(Math.sqrt(Math.max(0, variance)), 2),
      totalTvlUsd: round(totalTvlUsd, 0),
      poolCount: related.length,
      target: TARGET_BANDS[asset],
    }
  }

  return summaries
}

export const detectOpportunities = (pools: DeFiYieldPool[]): OpportunityAlert[] =>
  pools.flatMap((pool) => {
    const asset = normalizeAsset(pool.asset) ?? normalizeAsset(pool.symbol)
    if (!asset || !isAllowedChain(pool.chain)) return []
    if (pool.tvlUsd < MIN_OPPORTUNITY_TVL_USD) return []
    const target = TARGET_BANDS[asset]
    if (pool.apy <= target.max || pool.apy > RISK_TIER_CONFIG.medium.maxApy) return []

    return [
      {
        poolId: pool.id,
        asset,
        chain: pool.chain,
        project: canonicalProject(pool.project),
        platformLabel: platformLabel(pool.project),
        apy: round(pool.apy, 2),
        targetMax: target.max,
        message: `${platformLabel(pool.project)} ${asset} on ${pool.chain} is above target at ${round(pool.apy, 2)}% APY. Route to risk-tier review, not blind allocation.`,
      },
    ]
  })
