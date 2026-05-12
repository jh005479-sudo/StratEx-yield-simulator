export type YieldAsset = 'ETH' | 'WETH' | 'USDC' | 'USDT' | 'XRP' | 'ARB' | 'WBTC' | 'ADA'

export type ChainName = string

export type SupportedChain = 'Ethereum' | 'Base' | 'Arbitrum' | 'Optimism'

export type RiskTier = 'low' | 'medium' | 'high'

export type SimulationMode = 'test'

export type MarketDataSource = 'live' | 'fallback'

export type RebalanceCadence = 'none' | 'monthly' | 'quarterly' | 'threshold'

export type ContractLink = {
  label: string
  address: `0x${string}` | string
  explorerUrl: string
}

export type DeFiYieldPool = {
  id: string
  rawPoolId?: string
  project: string
  chain: ChainName
  symbol: string
  asset: YieldAsset
  componentAssets?: YieldAsset[]
  assetProof?: 'canonical-token' | 'exact-symbol' | 'known-wrapper' | 'pool-asset'
  wrapperKind?: 'canonical' | 'wrapped' | 'derivative'
  apy: number
  tvlUsd: number
  poolMeta?: string
  exposure?: string
  ilRisk?: string
  stablecoin?: boolean
  underlyingTokens?: string[]
  apyBase?: number | null
  apyReward?: number | null
  apyMean30d?: number | null
  volumeUsd1d?: number | null
  volumeUsd7d?: number | null
  url: string
  contracts: ContractLink[]
}

export type TargetBand = {
  min: number
  max: number
}

export type StrategyRequest = {
  asset: YieldAsset
  amount: number
  preferredChain: SupportedChain
  riskTier: RiskTier
  pools: DeFiYieldPool[]
  constraints?: Partial<StrategyConstraints>
  marketSource?: MarketDataSource
  marketUpdatedAt?: string
  assetPricesUsd?: Partial<Record<YieldAsset, number>>
  gasAssumptions?: Partial<Record<SupportedChain, GasAssumption>>
}

export type StrategyConstraints = {
  noBridge: boolean
  excludeWrappedAssets: boolean
  singleAssetOnly: boolean
  baseYieldOnly: boolean
  minTvlUsd: number
  maxProtocolAllocationPct: number
  maxChainAllocationPct: number
}

export type GasAssumption = {
  approveUsd: number
  depositUsd: number
  bridgeUsd: number
  blockTimeSeconds: number
}

export type ProtocolAdapterAssumption = {
  protocol: string
  chain: SupportedChain
  depositTarget: string
  approvalTarget: string
  withdrawalPath: string
  minDepositUsd: number
  approveGasUnits: number
  depositGasUnits: number
  withdrawGasUnits: number
  notes: string
}

export type StrategyPosition = {
  id: string
  platform: string
  platformLabel: string
  chain: SupportedChain
  asset: YieldAsset
  amount: number
  amountUsd: number
  allocationPct: number
  apr: number
  apyBase?: number | null
  apyReward?: number | null
  apyMean30d?: number | null
  expectedAnnualYield: number
  expectedAnnualYieldUsd: number
  riskGrade: 'A' | 'A-' | 'B+' | 'B' | 'C' | 'D'
  riskTier: RiskTier
  tvlUsd: number
  exposure?: string
  wrapperKind?: DeFiYieldPool['wrapperKind']
  rationale: string
  sourcePoolId: string
  componentAssets: YieldAsset[]
  adapter: ProtocolAdapterAssumption
  contracts: ContractLink[]
  url: string
}

export type ExecutionStep = {
  kind: 'wrap' | 'bridge' | 'approve' | 'deposit' | 'monitor'
  label: string
  chain: SupportedChain
  estimatedGasUsd: number
  estimatedSeconds: number
  adapter?: ProtocolAdapterAssumption
}

export type StrategyResult = {
  id: string
  mode: SimulationMode
  asset: YieldAsset
  deployedAsset: YieldAsset
  amount: number
  assetPriceUsd: number
  notionalUsd: number
  preferredChain: SupportedChain
  riskTier: RiskTier
  target: TargetBand
  blendedApr: number
  expectedAnnualYield: number
  expectedAnnualYieldUsd: number
  expectedMonthlyYield: number
  expectedMonthlyYieldUsd: number
  targetStatus: 'inside-target' | 'below-target' | 'above-target'
  estimatedCostsUsd: number
  estimatedCompletionSeconds: number
  platformBreakdown: Array<{
    platform: string
    platformLabel: string
    aprContribution: number
    allocationPct: number
  }>
  marketUniverse: {
    scannedPools: number
    eligiblePools: number
    selectedPools: number
  }
  executionSteps: ExecutionStep[]
  positions: StrategyPosition[]
  createdAt: string
  analytics?: StrategyAnalytics
}

export type PoolHistoryPoint = {
  timestamp: string
  apy: number
  tvlUsd: number
  apyBase?: number | null
  apyReward?: number | null
  il7d?: number | null
}

export type StrategyBacktest = {
  horizonDays: number
  observedDays: number
  averageApy: number
  minApy: number
  maxApy: number
  volatility: number
  projectedYieldUsd: number
  worstMonthlyYieldUsd: number
  drawdownEstimatePct: number
  dataQuality: 'complete' | 'partial' | 'synthetic'
}

export type ConfidenceFactor = {
  label: string
  score: number
  weight: number
  detail: string
  tone: 'good' | 'warn' | 'bad'
}

export type StrategyConfidence = {
  score: number
  grade: 'A' | 'B' | 'C' | 'D'
  verdict: string
  factors: ConfidenceFactor[]
}

export type StressScenario = {
  gasMultiplier: number
  apyShockPct: number
  rewardHaircutPct: number
  tvlShockPct: number
  depegPct: number
  bridgeDelayHours: number
}

export type StressTestResult = {
  scenario: StressScenario
  stressedApy: number
  stressedAnnualYieldUsd: number
  stressedExecutionCostUsd: number
  netYieldAfterCostsUsd: number
  yieldImpactUsd: number
  warnings: string[]
}

export type RebalanceResult = {
  cadence: RebalanceCadence
  grossImprovementApy: number
  rebalanceCostUsd: number
  netAnnualYieldUsd: number
  recommendedCadence: RebalanceCadence
  verdict: string
}

export type InvestmentMemo = {
  title: string
  generatedAt: string
  summary: string
  assumptions: string[]
  constraints: StrategyConstraints
  confidence: StrategyConfidence
  backtest: StrategyBacktest
  stress: StressTestResult
  rebalance: RebalanceResult
  positions: Array<{
    platform: string
    chain: SupportedChain
    asset: YieldAsset
    allocationPct: number
    apy: number
    amountUsd: number
    sourcePoolId: string
  }>
}

export type StrategyAnalytics = {
  confidence: StrategyConfidence
  backtest: StrategyBacktest
  stress: StressTestResult
  rebalance: RebalanceResult
  memo: InvestmentMemo
  constraints: StrategyConstraints
}

export type AssetRateSummary = {
  asset: YieldAsset
  averageApr: number
  simpleAverageApr: number
  apyMean30d: number
  baseApr: number
  rewardApr: number
  minApr: number
  maxApr: number
  volatility: number
  totalTvlUsd: number
  poolCount: number
  target: TargetBand
}

export type OpportunityAlert = {
  poolId: string
  asset: YieldAsset
  chain: SupportedChain
  project: string
  platformLabel: string
  apy: number
  targetMax: number
  message: string
}
