import type {
  InvestmentMemo,
  PoolHistoryPoint,
  RebalanceCadence,
  RebalanceResult,
  StrategyAnalytics,
  StrategyBacktest,
  StrategyConfidence,
  StrategyConstraints,
  StrategyResult,
  StressScenario,
  StressTestResult,
} from './types'

export const DEFAULT_STRATEGY_CONSTRAINTS: StrategyConstraints = {
  noBridge: false,
  excludeWrappedAssets: false,
  singleAssetOnly: false,
  baseYieldOnly: false,
  minTvlUsd: 0,
  maxProtocolAllocationPct: 100,
  maxChainAllocationPct: 100,
}

export const DEFAULT_STRESS_SCENARIO: StressScenario = {
  gasMultiplier: 2,
  apyShockPct: 25,
  rewardHaircutPct: 50,
  tvlShockPct: 25,
  depegPct: 0,
  bridgeDelayHours: 6,
}

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const gradeForScore = (score: number): StrategyConfidence['grade'] =>
  score >= 82 ? 'A' : score >= 68 ? 'B' : score >= 52 ? 'C' : 'D'

const weightedPositionValue = (strategy: StrategyResult, selector: (position: StrategyResult['positions'][number]) => number) =>
  strategy.positions.reduce((sum, position) => sum + selector(position) * (position.allocationPct / 100), 0)

export const buildBacktest = (
  strategy: StrategyResult,
  histories: Record<string, PoolHistoryPoint[]>,
  horizonDays: number,
): StrategyBacktest => {
  const seriesLength = Math.max(0, ...strategy.positions.map((position) => histories[position.sourcePoolId]?.length ?? 0))

  if (seriesLength === 0) {
    return {
      horizonDays,
      observedDays: 0,
      averageApy: strategy.blendedApr,
      minApy: strategy.blendedApr,
      maxApy: strategy.blendedApr,
      volatility: 0,
      projectedYieldUsd: round(strategy.expectedAnnualYieldUsd, 2),
      worstMonthlyYieldUsd: round(strategy.expectedMonthlyYieldUsd, 2),
      drawdownEstimatePct: 0,
      dataQuality: 'synthetic',
    }
  }

  const weightedDailyApy = Array.from({ length: seriesLength }, (_, index) =>
    strategy.positions.reduce((sum, position) => {
      const history = histories[position.sourcePoolId] ?? []
      const point = history[index] ?? history[history.length - 1]
      return sum + (point?.apy ?? position.apr) * (position.allocationPct / 100)
    }, 0),
  )
  const averageApy = weightedDailyApy.reduce((sum, apy) => sum + apy, 0) / weightedDailyApy.length
  const variance = weightedDailyApy.reduce((sum, apy) => sum + (apy - averageApy) ** 2, 0) / weightedDailyApy.length
  const volatility = Math.sqrt(variance)
  const minApy = Math.min(...weightedDailyApy)
  const maxApy = Math.max(...weightedDailyApy)

  return {
    horizonDays,
    observedDays: weightedDailyApy.length,
    averageApy: round(averageApy, 2),
    minApy: round(minApy, 2),
    maxApy: round(maxApy, 2),
    volatility: round(volatility, 2),
    projectedYieldUsd: round(strategy.notionalUsd * (averageApy / 100), 2),
    worstMonthlyYieldUsd: round(strategy.notionalUsd * (minApy / 100) / 12, 2),
    drawdownEstimatePct: round(Math.min(25, volatility * 2 + Math.max(0, strategy.blendedApr - minApy)), 2),
    dataQuality: weightedDailyApy.length >= horizonDays ? 'complete' : 'partial',
  }
}

export const scoreStrategyConfidence = (
  strategy: StrategyResult,
  backtest: StrategyBacktest = buildBacktest(strategy, {}, 30),
): StrategyConfidence => {
  const totalTvl = strategy.positions.reduce((sum, position) => sum + position.tvlUsd * (position.allocationPct / 100), 0)
  const protocolCount = new Set(strategy.positions.map((position) => position.platform)).size
  const chainCount = new Set(strategy.positions.map((position) => position.chain)).size
  const rewardShare = weightedPositionValue(strategy, (position) => (position.apyReward ?? 0) / Math.max(position.apr, 0.01))
  const wrappedShare = strategy.positions.reduce(
    (sum, position) => sum + (position.wrapperKind && position.wrapperKind !== 'canonical' ? position.allocationPct : 0),
    0,
  )
  const ilShare = strategy.positions.reduce(
    (sum, position) => sum + (position.exposure === 'multi' ? position.allocationPct : 0),
    0,
  )
  const executionCostRatio = strategy.estimatedCostsUsd / Math.max(strategy.notionalUsd, 1)

  const factors = [
    {
      label: 'Liquidity depth',
      score: clamp(Math.log10(Math.max(totalTvl, 1)) * 11),
      weight: 0.22,
      detail: `$${Math.round(totalTvl).toLocaleString()} allocation-weighted TVL`,
      tone: totalTvl >= 50_000_000 ? 'good' as const : totalTvl >= 10_000_000 ? 'warn' as const : 'bad' as const,
    },
    {
      label: 'Yield durability',
      score: clamp(94 - rewardShare * 45 - backtest.volatility * 6),
      weight: 0.24,
      detail: `${round(rewardShare * 100, 1)}% reward APY share, ${backtest.volatility}% historical volatility`,
      tone: rewardShare <= 0.2 && backtest.volatility <= 1 ? 'good' as const : rewardShare <= 0.45 ? 'warn' as const : 'bad' as const,
    },
    {
      label: 'Diversification',
      score: clamp(protocolCount * 22 + chainCount * 10 + strategy.positions.length * 8),
      weight: 0.18,
      detail: `${protocolCount} protocols, ${chainCount} chains, ${strategy.positions.length} positions`,
      tone: protocolCount >= 3 ? 'good' as const : protocolCount >= 2 ? 'warn' as const : 'bad' as const,
    },
    {
      label: 'Execution friction',
      score: clamp(100 - executionCostRatio * 12_000),
      weight: 0.14,
      detail: `${round(executionCostRatio * 100, 3)}% of notional consumed by estimated execution`,
      tone: executionCostRatio <= 0.001 ? 'good' as const : executionCostRatio <= 0.005 ? 'warn' as const : 'bad' as const,
    },
    {
      label: 'Route risk',
      score: clamp(96 - wrappedShare * 0.3 - ilShare * 0.25 - (strategy.riskTier === 'high' ? 22 : strategy.riskTier === 'medium' ? 10 : 0)),
      weight: 0.22,
      detail: `${round(wrappedShare, 1)}% wrapped exposure, ${round(ilShare, 1)}% multi-asset exposure`,
      tone: wrappedShare === 0 && ilShare === 0 ? 'good' as const : wrappedShare + ilShare < 40 ? 'warn' as const : 'bad' as const,
    },
  ]

  const score = round(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0), 0)
  const grade = gradeForScore(score)

  return {
    score,
    grade,
    verdict:
      grade === 'A'
        ? 'High-confidence simulation route with strong durability signals.'
        : grade === 'B'
          ? 'Usable simulation route with identifiable caveats.'
          : grade === 'C'
            ? 'Route needs review before it can support a serious allocation decision.'
            : 'Route is fragile under current simulator assumptions.',
    factors,
  }
}

export const stressStrategy = (
  strategy: StrategyResult,
  scenario: StressScenario = DEFAULT_STRESS_SCENARIO,
): StressTestResult => {
  const rewardApy = weightedPositionValue(strategy, (position) => position.apyReward ?? 0)
  const rewardHaircutApy = rewardApy * (scenario.rewardHaircutPct / 100)
  const shockedApy = strategy.blendedApr * (1 - scenario.apyShockPct / 100) - rewardHaircutApy
  const stressedApy = round(Math.max(0, shockedApy) * (1 - scenario.tvlShockPct * 0.0015), 2)
  const stressedNotional = strategy.notionalUsd * (1 - scenario.depegPct / 100)
  const stressedAnnualYieldUsd = round(stressedNotional * (stressedApy / 100), 2)
  const stressedExecutionCostUsd = round(strategy.estimatedCostsUsd * scenario.gasMultiplier, 2)
  const warnings = [
    scenario.gasMultiplier >= 3 ? 'Gas shock materially increases route execution cost.' : '',
    scenario.apyShockPct >= 25 ? 'APY shock pushes the route toward mean reversion assumptions.' : '',
    scenario.rewardHaircutPct >= 75 ? 'Reward-heavy sources are haircut close to zero.' : '',
    scenario.tvlShockPct >= 30 ? 'TVL drain can worsen slippage, exit liquidity, and confidence.' : '',
    scenario.depegPct > 0 ? 'Asset depeg reduces USD notional and projected dollar yield.' : '',
    scenario.bridgeDelayHours >= 12 ? 'Bridge delay extends time-at-risk before route completion.' : '',
  ].filter(Boolean)

  return {
    scenario,
    stressedApy,
    stressedAnnualYieldUsd,
    stressedExecutionCostUsd,
    netYieldAfterCostsUsd: round(stressedAnnualYieldUsd - stressedExecutionCostUsd, 2),
    yieldImpactUsd: round(strategy.expectedAnnualYieldUsd - stressedAnnualYieldUsd, 2),
    warnings,
  }
}

export const compareRebalance = (
  strategy: StrategyResult,
  backtest: StrategyBacktest = buildBacktest(strategy, {}, 30),
  cadence: RebalanceCadence = 'threshold',
): RebalanceResult => {
  const cycles = cadence === 'monthly' ? 12 : cadence === 'quarterly' ? 4 : cadence === 'threshold' ? 6 : 0
  const grossImprovementApy = cadence === 'none' ? 0 : round(Math.min(1.6, backtest.volatility * 0.65), 2)
  const rebalanceCostUsd = round(strategy.estimatedCostsUsd * cycles * 0.75, 2)
  const grossImprovementUsd = strategy.notionalUsd * (grossImprovementApy / 100)
  const netAnnualYieldUsd = round(strategy.expectedAnnualYieldUsd + grossImprovementUsd - rebalanceCostUsd, 2)
  const recommendedCadence: RebalanceCadence =
    backtest.volatility >= 1 ? 'threshold' : backtest.volatility >= 0.55 ? 'monthly' : 'none'

  return {
    cadence,
    grossImprovementApy,
    rebalanceCostUsd,
    netAnnualYieldUsd,
    recommendedCadence,
    verdict:
      cadence === 'none'
        ? 'Hold route. Rebalancing is disabled for this simulation.'
        : netAnnualYieldUsd > strategy.expectedAnnualYieldUsd
          ? `The ${cadence} rebalance model improves net annual yield after estimated execution costs.`
          : `The ${cadence} rebalance model is not justified after estimated execution costs.`,
  }
}

export const buildInvestmentMemo = (
  strategy: StrategyResult,
  analytics: Omit<StrategyAnalytics, 'memo'>,
): InvestmentMemo => ({
  title: `StratEx ${strategy.asset} Yield Simulation Memo`,
  generatedAt: new Date().toISOString(),
  summary: `${strategy.amount.toLocaleString()} ${strategy.asset} (${strategy.notionalUsd.toLocaleString()} USD notional) simulated across ${strategy.positions.length} positions at ${strategy.blendedApr}% blended APY.`,
  assumptions: [
    'Simulation uses live DeFiLlama market data and APY fields where available.',
    'Historical backtests use available pool chart observations and fall back to current route APY only when chart data is unavailable.',
    'Stress tests apply deterministic shocks to APY, reward yield, gas, TVL, depeg, and bridge delay assumptions.',
    'Protocol adapters describe simulator assumptions and are not executable calldata builders.',
    'This memo is a decision-support artifact, not a live deployment instruction.',
  ],
  constraints: analytics.constraints,
  confidence: analytics.confidence,
  backtest: analytics.backtest,
  stress: analytics.stress,
  rebalance: analytics.rebalance,
  positions: strategy.positions.map((position) => ({
    platform: position.platformLabel,
    chain: position.chain,
    asset: position.asset,
    allocationPct: position.allocationPct,
    apy: position.apr,
    amountUsd: position.amountUsd,
    sourcePoolId: position.sourcePoolId,
  })),
})

export const buildStrategyAnalytics = (
  strategy: StrategyResult,
  options: {
    histories?: Record<string, PoolHistoryPoint[]>
    horizonDays?: number
    stressScenario?: StressScenario
    rebalanceCadence?: RebalanceCadence
    constraints?: Partial<StrategyConstraints>
  } = {},
): StrategyAnalytics => {
  const constraints = { ...DEFAULT_STRATEGY_CONSTRAINTS, ...options.constraints }
  const backtest = buildBacktest(strategy, options.histories ?? {}, options.horizonDays ?? 30)
  const confidence = scoreStrategyConfidence(strategy, backtest)
  const stress = stressStrategy(strategy, options.stressScenario)
  const rebalance = compareRebalance(strategy, backtest, options.rebalanceCadence ?? 'threshold')
  const analytics = {
    confidence,
    backtest,
    stress,
    rebalance,
    constraints,
  }

  return {
    ...analytics,
    memo: buildInvestmentMemo(strategy, analytics),
  }
}
