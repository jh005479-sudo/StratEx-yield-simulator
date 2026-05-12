import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  BrainCircuit,
  Coins,
  Download,
  FileText,
  FlaskConical,
  Gauge,
  LineChart,
  Network,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  Zap,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LucideIcon } from 'lucide-react'
import './App.css'
import { AgentAnimation } from './components/AgentAnimation'
import { AssumptionsPanel } from './components/AssumptionsPanel'
import { ExecutionTimeline } from './components/ExecutionTimeline'
import { FeedStatusBar } from './components/FeedStatusBar'
import { MetricTile } from './components/MetricTile'
import { PositionCard } from './components/PositionCard'
import { RateFeedCard } from './components/RateFeedCard'
import { NotificationsPanel, RiskPanel } from './components/SidePanels'
import { StrategyVerdict, type MarketDepthBlock } from './components/StrategyVerdict'
import { TARGET_BANDS } from './core/config'
import { compareRebalance, DEFAULT_STRESS_SCENARIO, DEFAULT_STRATEGY_CONSTRAINTS } from './core/analytics'
import type {
  RebalanceCadence,
  RiskTier,
  StrategyConstraints,
  StrategyResult,
  StressScenario,
  SupportedChain,
  YieldAsset,
} from './core/types'
import heroImage from './assets/stratex-agent-hero.png'
import {
  getGas,
  getOpportunities,
  getRates,
  getRisks,
  simulateStrategy,
  type GasResponse,
  type OpportunityResponse,
  type RatesResponse,
  type RiskResponse,
} from './services/api'

const assets: YieldAsset[] = ['USDC', 'USDT', 'ETH', 'WETH', 'WBTC', 'ARB', 'XRP', 'ADA']
const chains: SupportedChain[] = ['Ethereum', 'Base', 'Arbitrum', 'Optimism']
const riskTiers: Array<{ id: RiskTier; label: string; description: string }> = [
  { id: 'low', label: 'Low', description: 'Blue-chip single asset' },
  { id: 'medium', label: 'Medium', description: 'Mid/blue multi-asset' },
  { id: 'high', label: 'High', description: 'Open DeFiLlama universe' },
]
const chartColors = ['#4ee8ff', '#2ea8ff', '#79f2c0', '#d8f7ff', '#5a7cff', '#ffd166', '#ff5d73']
const minimumStrategyMarkets = 2
type WorkspaceTab = 'build' | 'constraints' | 'backtest' | 'stress' | 'rebalance' | 'memo'
const workspaceTabs: Array<{ id: WorkspaceTab; label: string; icon: LucideIcon }> = [
  { id: 'build', label: 'Build Route', icon: Activity },
  { id: 'constraints', label: 'Constraints', icon: SlidersHorizontal },
  { id: 'backtest', label: 'Backtest', icon: LineChart },
  { id: 'stress', label: 'Stress Lab', icon: Zap },
  { id: 'rebalance', label: 'Rebalance', icon: RotateCcw },
  { id: 'memo', label: 'Memo', icon: FileText },
]
const constraintToggles: Array<{
  key: keyof Pick<StrategyConstraints, 'baseYieldOnly' | 'excludeWrappedAssets' | 'noBridge' | 'singleAssetOnly'>
  label: string
}> = [
  { key: 'noBridge', label: 'No bridge routes' },
  { key: 'excludeWrappedAssets', label: 'Exclude wrapped assets' },
  { key: 'singleAssetOnly', label: 'Single-asset only' },
  { key: 'baseYieldOnly', label: 'Base yield only' },
]
const constraintPresets: Array<{ label: string; description: string; values: StrategyConstraints }> = [
  {
    label: 'Conservative',
    description: 'No bridge, single-asset, base-yield route with deep liquidity.',
    values: {
      ...DEFAULT_STRATEGY_CONSTRAINTS,
      noBridge: true,
      singleAssetOnly: true,
      baseYieldOnly: true,
      minTvlUsd: 50_000_000,
      maxProtocolAllocationPct: 45,
      maxChainAllocationPct: 70,
    },
  },
  {
    label: 'Balanced',
    description: 'Moderate diversification with caps across protocols and chains.',
    values: {
      ...DEFAULT_STRATEGY_CONSTRAINTS,
      minTvlUsd: 10_000_000,
      maxProtocolAllocationPct: 60,
      maxChainAllocationPct: 75,
    },
  },
  {
    label: 'Exploratory',
    description: 'Broader discovery while keeping a minimum TVL floor.',
    values: {
      ...DEFAULT_STRATEGY_CONSTRAINTS,
      minTvlUsd: 1_000_000,
      maxProtocolAllocationPct: 80,
      maxChainAllocationPct: 90,
    },
  },
]
const stressPresets: Array<{ label: string; description: string; values: StressScenario }> = [
  {
    label: 'Base Case',
    description: 'Moderate APY mean reversion and default gas pressure.',
    values: DEFAULT_STRESS_SCENARIO,
  },
  {
    label: 'Gas Spike',
    description: 'Execution cost shock for busy chain conditions.',
    values: { ...DEFAULT_STRESS_SCENARIO, gasMultiplier: 6, bridgeDelayHours: 12 },
  },
  {
    label: 'Reward Unwind',
    description: 'Assumes incentive APY fades faster than base yield.',
    values: { ...DEFAULT_STRESS_SCENARIO, apyShockPct: 35, rewardHaircutPct: 85 },
  },
  {
    label: 'Depeg Drill',
    description: 'Stable asset stress with TVL drain and notional haircut.',
    values: { ...DEFAULT_STRESS_SCENARIO, tvlShockPct: 40, depegPct: 3, bridgeDelayHours: 18 },
  },
]
const rebalanceCadences: RebalanceCadence[] = ['none', 'monthly', 'quarterly', 'threshold']

const formatApy = (value?: number) => `${(value ?? 0).toFixed(2)}%`
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const formatAmount = (value: number, asset: YieldAsset) =>
  `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: asset === 'ETH' || asset === 'WETH' || asset === 'WBTC' ? 4 : 0,
  }).format(value)} ${asset}`

const formatMemo = (strategy: StrategyResult) => JSON.stringify(strategy.analytics?.memo ?? strategy, null, 2)

function App() {
  const [asset, setAsset] = useState<YieldAsset>('USDC')
  const [amount, setAmount] = useState(100_000)
  const [preferredChain, setPreferredChain] = useState<SupportedChain>('Base')
  const [riskTier, setRiskTier] = useState<RiskTier>('low')
  const [rates, setRates] = useState<RatesResponse>()
  const [opportunities, setOpportunities] = useState<OpportunityResponse>()
  const [gas, setGas] = useState<GasResponse>()
  const [risks, setRisks] = useState<RiskResponse>()
  const [strategy, setStrategy] = useState<StrategyResult>()
  const [isWorking, setIsWorking] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('build')
  const [backtestDays, setBacktestDays] = useState(90)
  const [rebalanceCadence, setRebalanceCadence] = useState<RebalanceCadence>('threshold')
  const [constraints, setConstraints] = useState<StrategyConstraints>(DEFAULT_STRATEGY_CONSTRAINTS)
  const [stressScenario, setStressScenario] = useState<StressScenario>(DEFAULT_STRESS_SCENARIO)

  const refreshFeeds = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [ratesResponse, opportunitiesResponse, gasResponse, riskResponse] = await Promise.all([
        getRates(riskTier),
        getOpportunities(),
        getGas(),
        getRisks(),
      ])
      setRates(ratesResponse)
      setOpportunities(opportunitiesResponse)
      setGas(gasResponse)
      setRisks(riskResponse)
    } finally {
      setIsRefreshing(false)
    }
  }, [riskTier])

  useEffect(() => {
    refreshFeeds().catch((feedError: unknown) => {
      setError(feedError instanceof Error ? feedError.message : 'Unable to refresh agent feeds')
    })
  }, [refreshFeeds])

  const selectedTarget = rates?.rates[asset]?.target ?? TARGET_BANDS[asset]
  const selectedRate = rates?.rates[asset]
  const marketDepthBlock: MarketDepthBlock | undefined =
    riskTier === 'low' && selectedRate && selectedRate.poolCount < minimumStrategyMarkets
      ? { asset, eligibleMarkets: selectedRate.poolCount, minimumMarkets: minimumStrategyMarkets }
      : undefined
  const gasMeta = gas?.chains.find((chain) => chain.chain === preferredChain)

  const chartData = useMemo(
    () =>
      strategy?.platformBreakdown.map((item) => ({
        id: item.platform,
        name: item.platformLabel,
        contribution: item.aprContribution,
        allocation: item.allocationPct,
      })) ?? [],
    [strategy],
  )
  const rebalanceComparisons = useMemo(
    () =>
      strategy?.analytics
        ? rebalanceCadences.map((cadence) => compareRebalance(strategy, strategy.analytics?.backtest, cadence))
        : [],
    [strategy],
  )

  const runAnimation = () => {
    setIsWorking(true)
    window.setTimeout(() => setIsWorking(false), 3800)
  }

  const clearRunState = () => {
    setError('')
    setStrategy(undefined)
  }

  const updateConstraint = <K extends keyof StrategyConstraints>(key: K, value: StrategyConstraints[K]) => {
    setConstraints((current) => ({ ...current, [key]: value }))
    clearRunState()
  }

  const updateStress = <K extends keyof StressScenario>(key: K, value: StressScenario[K]) => {
    setStressScenario((current) => ({ ...current, [key]: value }))
    clearRunState()
  }

  const applyConstraintPreset = (values: StrategyConstraints) => {
    setConstraints(values)
    clearRunState()
  }

  const applyStressPreset = (values: StressScenario) => {
    setStressScenario(values)
    clearRunState()
  }

  const handleRefreshFeeds = () => {
    setError('')
    refreshFeeds().catch((feedError: unknown) => {
      setError(feedError instanceof Error ? feedError.message : 'Unable to refresh agent feeds')
    })
  }

  const handleSimulate = async () => {
    setError('')
    runAnimation()
    if (marketDepthBlock) {
      setStrategy(undefined)
      return
    }
    try {
      const response = await simulateStrategy({
        asset,
        amount,
        preferredChain,
        riskTier,
        backtestDays,
        constraints,
        rebalanceCadence,
        stressScenario,
      })
      setStrategy(response.strategy)
    } catch (simulateError) {
      setStrategy(undefined)
      setError(simulateError instanceof Error ? simulateError.message : 'Simulation failed')
    }
  }

  const handleExportMemo = () => {
    if (!strategy) return
    const blob = new Blob([formatMemo(strategy)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `stratex-${strategy.asset.toLowerCase()}-${strategy.riskTier}-simulation-memo.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderBuildOutput = () => {
    if (!strategy) {
      return (
        <div className="empty-strategy">
          <ShieldCheck size={24} />
          <p>Select an asset, risk tier, amount, and preferred chain, then simulate. Use the Constraints page first if you want hard allocation rules.</p>
        </div>
      )
    }

    return (
      <div className="strategy-output">
        <div className="insight-row">
          <div className="accuracy-panel">
            <div>
              <span>Simulator accuracy review</span>
              <h2>Route Confidence Inputs</h2>
            </div>
            <div className="accuracy-grid">
              <MetricTile label="Scanned pools" value={String(strategy.marketUniverse.scannedPools)} meta={`${asset} on supported chains`} tone="blue" icon={<BrainCircuit size={16} />} />
              <MetricTile label="Eligible pools" value={String(strategy.marketUniverse.eligiblePools)} meta={`${riskTier} risk filters`} tone="green" icon={<ShieldCheck size={16} />} />
              <MetricTile label="Selected routes" value={String(strategy.marketUniverse.selectedPools)} meta={`${strategy.positions.length} positions`} tone="amber" icon={<Network size={16} />} />
            </div>
          </div>
          <AssumptionsPanel riskTier={riskTier} source={rates?.source} strategy={strategy} />
        </div>

        <div className="chart-panel">
          <div>
            <span>APY source split</span>
            <h2>{strategy.positions.length} position strategy</h2>
          </div>
          <div className="charts">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chartData} dataKey="contribution" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={3}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.id} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(2)}% APY`, 'contribution']} contentStyle={{ background: '#071526', border: '1px solid rgba(78,232,255,.28)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#a8c7d9', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#a8c7d9', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, 'allocation']} contentStyle={{ background: '#071526', border: '1px solid rgba(78,232,255,.28)', borderRadius: 8 }} />
                <Bar dataKey="allocation" radius={[6, 6, 0, 0]} fill="#4ee8ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="positions-grid">
          {strategy.positions.map((position, index) => (
            <PositionCard key={`${position.id}-${index}`} position={position} />
          ))}
        </div>

        <ExecutionTimeline steps={strategy.executionSteps} />
      </div>
    )
  }

  const renderWorkspaceContext = () => (
    <div className="workspace-context" aria-label="Simulation context">
      <div className="context-card context-card--primary">
        <span>Simulation context</span>
        <strong>{formatAmount(amount, asset)}</strong>
        <small>{riskTier} risk · preferred {preferredChain}</small>
      </div>
      <div className="context-card">
        <span>Target band</span>
        <strong>{selectedTarget.min}-{selectedTarget.max}%</strong>
        <small>{asset} mandate</small>
      </div>
      <div className="context-card">
        <span>Route state</span>
        <strong>{strategy ? `${strategy.positions.length} positions` : 'Not simulated'}</strong>
        <small>{strategy ? `${formatApy(strategy.blendedApr)} blended APY` : 'Build Route required'}</small>
      </div>
      <div className="context-card">
        <span>Guardrails</span>
        <strong>{constraints.minTvlUsd > 0 ? formatCurrency(constraints.minTvlUsd) : 'No TVL floor'}</strong>
        <small>{constraints.maxProtocolAllocationPct}% protocol cap · {constraints.maxChainAllocationPct}% chain cap</small>
      </div>
    </div>
  )

  const renderWorkspacePage = (eyebrow: string, title: string, description: string, children: ReactNode) => (
    <section className="workspace-page" aria-labelledby={`${activeTab}-page-title`}>
      <div className="workspace-page__header">
        <div>
          <span>{eyebrow}</span>
          <h2 id={`${activeTab}-page-title`}>{title}</h2>
        </div>
        <p>{description}</p>
      </div>
      {renderWorkspaceContext()}
      {children}
    </section>
  )

  const renderNeedsSimulation = (title: string, description: string, icon: ReactNode) =>
    renderWorkspacePage(
      'Simulation required',
      title,
      description,
      <div className="empty-strategy empty-strategy--page">
        {icon}
        <p>Build a route first, then this workspace will populate with route-specific analytics.</p>
        <button className="secondary-action" type="button" onClick={() => setActiveTab('build')}>
          <Activity size={15} />
          Go to Build Route
        </button>
      </div>,
    )

  const renderConstraintsPage = () =>
    renderWorkspacePage(
      'Allocator controls',
      'Allocator Guardrails',
      'Set hard route rules before running a simulation. Changing these clears the current route so the next run reflects the new constraints.',
      <>
        <div className="preset-grid" aria-label="Constraint presets">
          {constraintPresets.map((preset) => (
            <button className="preset-card" key={preset.label} type="button" onClick={() => applyConstraintPreset(preset.values)}>
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
        <div className="lab-panel lab-panel--wide">
          <div className="constraint-grid">
            {constraintToggles.map(({ key, label }) => (
              <label className="toggle-row" key={key}>
                <input
                  checked={constraints[key]}
                  type="checkbox"
                  onChange={(event) => updateConstraint(key, event.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
            <label>
              Minimum TVL
              <input
                min="0"
                step="1000000"
                type="number"
                value={constraints.minTvlUsd}
                onChange={(event) => updateConstraint('minTvlUsd', Number(event.target.value))}
              />
            </label>
            <label>
              Max per protocol %
              <input
                max="100"
                min="1"
                type="number"
                value={constraints.maxProtocolAllocationPct}
                onChange={(event) => updateConstraint('maxProtocolAllocationPct', Number(event.target.value))}
              />
            </label>
            <label>
              Max per chain %
              <input
                max="100"
                min="1"
                type="number"
                value={constraints.maxChainAllocationPct}
                onChange={(event) => updateConstraint('maxChainAllocationPct', Number(event.target.value))}
              />
            </label>
          </div>
        </div>
        <div className="decision-grid">
          <div className="decision-card">
            <span>Deployment shape</span>
            <strong>{constraints.singleAssetOnly ? 'Single asset' : 'Multi asset allowed'}</strong>
            <p>{constraints.noBridge ? 'Routes stay on the preferred chain.' : 'Cross-chain routes may be considered when useful.'}</p>
          </div>
          <div className="decision-card">
            <span>Yield quality</span>
            <strong>{constraints.baseYieldOnly ? 'Base yield only' : 'Rewards allowed'}</strong>
            <p>{constraints.excludeWrappedAssets ? 'Wrapped and derivative assets are excluded.' : 'Known wrappers may appear when risk tier allows them.'}</p>
          </div>
          <div className="decision-card">
            <span>Concentration caps</span>
            <strong>{constraints.maxProtocolAllocationPct}% / {constraints.maxChainAllocationPct}%</strong>
            <p>Caps apply before allocation so no route can exceed the selected protocol or chain ceiling.</p>
          </div>
        </div>
      </>,
    )

  const renderBacktestPage = () => {
    if (!strategy?.analytics) {
      return renderNeedsSimulation(
        'Historical Backtest',
        'Run a simulation on Build Route to populate historical analytics.',
        <LineChart size={26} />,
      )
    }

    return renderWorkspacePage(
      'Historical analytics',
      'Historical Backtest',
      'Review DeFiLlama pool chart history, route confidence, data quality, volatility, and projected annual yield.',
      <>
        <div className="range-panel">
          <div>
            <span>Backtest envelope</span>
            <h3>{formatApy(strategy.analytics.backtest.minApy)} to {formatApy(strategy.analytics.backtest.maxApy)}</h3>
            <p>{strategy.analytics.backtest.observedDays} observed days · {strategy.analytics.backtest.dataQuality} data quality</p>
          </div>
          <div className="range-track" aria-label="Historical APY range">
            <i style={{ left: `${Math.min(100, Math.max(0, (strategy.analytics.backtest.averageApy / Math.max(strategy.analytics.backtest.maxApy, 1)) * 100))}%` }} />
          </div>
        </div>
        <div className="lab-grid">
          <div className="lab-panel lab-panel--hero">
            <span>Route confidence</span>
            <strong>{strategy.analytics.confidence.grade}</strong>
            <p>{strategy.analytics.confidence.score}/100 · {strategy.analytics.confidence.verdict}</p>
          </div>
          <div className="lab-panel">
            <span>Historical backtest</span>
            <h2>{strategy.analytics.backtest.averageApy.toFixed(2)}% avg APY</h2>
            <select value={backtestDays} onChange={(event) => { setBacktestDays(Number(event.target.value)); clearRunState() }}>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
            <div className="lab-metrics">
              <span>{formatCurrency(strategy.analytics.backtest.projectedYieldUsd)} projected</span>
              <span>{formatCurrency(strategy.analytics.backtest.worstMonthlyYieldUsd)} worst month</span>
              <span>{strategy.analytics.backtest.volatility.toFixed(2)}% volatility</span>
              <span>{strategy.analytics.backtest.drawdownEstimatePct.toFixed(2)}% drawdown</span>
            </div>
          </div>
          <div className="lab-panel lab-panel--wide">
            {strategy.analytics.confidence.factors.map((factor) => (
              <div className={`factor-row factor-row--${factor.tone}`} key={factor.label}>
                <span>{factor.label}</span>
                <strong>{factor.score}/100</strong>
                <p>{factor.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </>,
    )
  }

  const renderStressPage = () => {
    if (!strategy?.analytics) {
      return renderNeedsSimulation(
        'Stress Lab',
        'Run a simulation on Build Route to populate stress-test outputs.',
        <Zap size={26} />,
      )
    }

    return renderWorkspacePage(
      'Scenario shocks',
      'Stress Lab',
      'Adjust gas, APY, reward, TVL, depeg, and bridge-delay assumptions to see how the route behaves under pressure.',
      <>
        <div className="preset-grid" aria-label="Stress presets">
          {stressPresets.map((preset) => (
            <button className="preset-card" key={preset.label} type="button" onClick={() => applyStressPreset(preset.values)}>
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
        <div className="lab-grid">
          <div className="lab-panel lab-panel--wide">
            <span>Stress controls</span>
            <div className="constraint-grid">
              <label>Gas x<input min="1" max="20" type="number" value={stressScenario.gasMultiplier} onChange={(event) => updateStress('gasMultiplier', Number(event.target.value))} /></label>
              <label>APY shock %<input min="0" max="100" type="number" value={stressScenario.apyShockPct} onChange={(event) => updateStress('apyShockPct', Number(event.target.value))} /></label>
              <label>Reward haircut %<input min="0" max="100" type="number" value={stressScenario.rewardHaircutPct} onChange={(event) => updateStress('rewardHaircutPct', Number(event.target.value))} /></label>
              <label>TVL shock %<input min="0" max="100" type="number" value={stressScenario.tvlShockPct} onChange={(event) => updateStress('tvlShockPct', Number(event.target.value))} /></label>
              <label>Depeg %<input min="0" max="20" type="number" value={stressScenario.depegPct} onChange={(event) => updateStress('depegPct', Number(event.target.value))} /></label>
              <label>Bridge delay h<input min="0" max="168" type="number" value={stressScenario.bridgeDelayHours} onChange={(event) => updateStress('bridgeDelayHours', Number(event.target.value))} /></label>
            </div>
          </div>
          <MetricTile label="Stressed APY" value={`${strategy.analytics.stress.stressedApy.toFixed(2)}%`} meta={`${formatCurrency(strategy.analytics.stress.yieldImpactUsd)} yield impact`} tone="amber" icon={<Zap size={16} />} />
          <MetricTile label="Net stressed yield" value={formatCurrency(strategy.analytics.stress.netYieldAfterCostsUsd)} meta={`${formatCurrency(strategy.analytics.stress.stressedExecutionCostUsd)} stressed costs`} tone="blue" icon={<WalletCards size={16} />} />
          <MetricTile label="Stress settings" value={`${stressScenario.apyShockPct}% APY`} meta={`${stressScenario.gasMultiplier}x gas · ${stressScenario.rewardHaircutPct}% rewards haircut`} tone="amber" icon={<Gauge size={16} />} />
          <div className="lab-panel lab-panel--wide warning-stack">
            {(strategy.analytics.stress.warnings.length ? strategy.analytics.stress.warnings : ['No scenario warnings at the current settings.']).map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        </div>
      </>,
    )
  }

  const renderRebalancePage = () => {
    if (!strategy?.analytics) {
      return renderNeedsSimulation(
        'Rebalance',
        'Run a simulation on Build Route to compare rebalance cadence economics.',
        <RotateCcw size={26} />,
      )
    }
    const selectedRebalance = rebalanceComparisons.find((result) => result.cadence === rebalanceCadence) ?? strategy.analytics.rebalance

    return renderWorkspacePage(
      'Cadence economics',
      'Rebalance',
      'Compare hold, monthly, quarterly, and threshold rebalancing after execution costs and observed volatility.',
      <>
        <div className="lab-grid">
          <div className="lab-panel">
            <span>Rebalance cadence</span>
            <select value={rebalanceCadence} onChange={(event) => setRebalanceCadence(event.target.value as RebalanceCadence)}>
              <option value="threshold">Threshold</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="none">None</option>
            </select>
          </div>
          <MetricTile label="Net annual yield" value={formatCurrency(selectedRebalance.netAnnualYieldUsd)} meta={selectedRebalance.verdict} tone="green" icon={<RotateCcw size={16} />} />
          <MetricTile label="Rebalance cost" value={formatCurrency(selectedRebalance.rebalanceCostUsd)} meta={`${selectedRebalance.grossImprovementApy.toFixed(2)}% gross improvement`} tone="amber" icon={<Network size={16} />} />
          <MetricTile label="Recommended" value={selectedRebalance.recommendedCadence} meta="based on observed volatility" tone="blue" icon={<BrainCircuit size={16} />} />
        </div>
        <div className="comparison-table" aria-label="Rebalance cadence comparison">
          {rebalanceComparisons.map((result) => (
            <button
              className={rebalanceCadence === result.cadence ? 'comparison-row is-active' : 'comparison-row'}
              key={result.cadence}
              type="button"
              onClick={() => setRebalanceCadence(result.cadence)}
            >
              <strong>{result.cadence}</strong>
              <span>{formatCurrency(result.netAnnualYieldUsd)} net yield</span>
              <span>{formatCurrency(result.rebalanceCostUsd)} cost</span>
              <span>{result.grossImprovementApy.toFixed(2)}% lift</span>
            </button>
          ))}
        </div>
      </>,
    )
  }

  const renderMemoPage = () => {
    if (!strategy?.analytics) {
      return renderNeedsSimulation(
        'Investment Memo',
        'Run a simulation on Build Route to generate an exportable investment memo.',
        <FileText size={26} />,
      )
    }

    return renderWorkspacePage(
      'Decision artifact',
      'Investment Memo',
      'Export a compact JSON memo with assumptions, constraints, confidence, backtest, stress, rebalance, and position details.',
      <>
        <div className="decision-grid">
          <div className="decision-card">
            <span>Confidence</span>
            <strong>{strategy.analytics.memo.confidence.grade} · {strategy.analytics.memo.confidence.score}/100</strong>
            <p>{strategy.analytics.memo.confidence.verdict}</p>
          </div>
          <div className="decision-card">
            <span>Backtest</span>
            <strong>{formatApy(strategy.analytics.memo.backtest.averageApy)}</strong>
            <p>{strategy.analytics.memo.backtest.observedDays} days · {strategy.analytics.memo.backtest.dataQuality} data quality.</p>
          </div>
          <div className="decision-card">
            <span>Stress result</span>
            <strong>{formatApy(strategy.analytics.memo.stress.stressedApy)}</strong>
            <p>{formatCurrency(strategy.analytics.memo.stress.netYieldAfterCostsUsd)} net stressed yield.</p>
          </div>
        </div>
        <div className="lab-panel lab-panel--wide">
          <div className="memo-header">
            <div>
              <span>Exportable investment memo</span>
              <h2>{strategy.analytics.memo.title}</h2>
            </div>
            <button className="secondary-action" type="button" onClick={handleExportMemo}>
              <Download size={15} />
              Export JSON
            </button>
          </div>
          <p>{strategy.analytics.memo.summary}</p>
          <ul className="memo-list">
            {strategy.analytics.memo.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
          </ul>
        </div>
        <div className="memo-position-list" aria-label="Memo position snapshot">
          {strategy.analytics.memo.positions.map((position) => (
            <div className="memo-position-row" key={`${position.sourcePoolId}-${position.asset}`}>
              <strong>{position.platform}</strong>
              <span>{position.chain}</span>
              <span>{position.allocationPct.toFixed(1)}%</span>
              <span>{formatApy(position.apy)}</span>
              <span>{formatCurrency(position.amountUsd)}</span>
            </div>
          ))}
        </div>
      </>,
    )
  }

  const renderActiveWorkspacePage = () => {
    switch (activeTab) {
      case 'constraints':
        return renderConstraintsPage()
      case 'backtest':
        return renderBacktestPage()
      case 'stress':
        return renderStressPage()
      case 'rebalance':
        return renderRebalancePage()
      case 'memo':
        return renderMemoPage()
      default:
        return (
          <section className="dashboard-grid">
            <NotificationsPanel opportunities={opportunities} />

            <section className="command-panel" aria-label="Capital allocation panel">
              <div className="simulator-console">
                <div className="console-header">
                  <div className="console-title">
                    <span>Deployment simulator</span>
                    <h2>Capital Allocation Panel</h2>
                  </div>
                  <AgentAnimation active={isWorking} asset={asset} chain={preferredChain} riskTier={riskTier} />
                </div>

                <div className="control-grid control-grid--simulator">
                  <label>
                    Asset
                    <select
                      value={asset}
                      onChange={(event) => {
                        setAsset(event.target.value as YieldAsset)
                        clearRunState()
                      }}
                    >
                      {assets.map((item) => (
                        <option value={item} key={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Amount
                    <input
                      min="0"
                      type="number"
                      value={amount}
                      onChange={(event) => {
                        setAmount(Number(event.target.value))
                        clearRunState()
                      }}
                    />
                  </label>
                  <label>
                    Preferred chain
                    <select
                      value={preferredChain}
                      onChange={(event) => {
                        setPreferredChain(event.target.value as SupportedChain)
                        clearRunState()
                      }}
                    >
                      {chains.map((chain) => (
                        <option value={chain} key={chain}>
                          {chain}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="risk-tier-control" aria-label="Risk tier">
                    {riskTiers.map((tier) => (
                      <button
                        className={riskTier === tier.id ? 'is-active' : ''}
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setRiskTier(tier.id)
                          clearRunState()
                        }}
                      >
                        <strong>{tier.label}</strong>
                        <span>{tier.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="button-row">
                  <button className="primary-action" type="button" onClick={handleSimulate}>
                    <Activity size={17} />
                    Simulate Strategy
                  </button>
                </div>

                {error && !marketDepthBlock ? <div className="error-banner">{error}</div> : null}
              </div>

              <StrategyVerdict
                amount={amount}
                asset={asset}
                marketDepthBlock={marketDepthBlock}
                riskTier={riskTier}
                strategy={strategy}
                target={selectedTarget}
              />

              <div className="kpi-grid">
                <MetricTile
                  label="Selected target"
                  value={`${selectedTarget.min}-${selectedTarget.max}%`}
                  meta={`${asset} mandate`}
                  tone="green"
                  icon={<Gauge size={16} />}
                />
                <MetricTile
                  label="Blended APY"
                  value={formatApy(strategy?.blendedApr)}
                  meta={strategy ? strategy.targetStatus.replace('-', ' ') : `${riskTier} risk simulation`}
                  tone={strategy?.targetStatus === 'inside-target' ? 'green' : 'amber'}
                  icon={<Coins size={16} />}
                />
                <MetricTile
                  label="Expected annual yield"
                  value={strategy ? formatAmount(strategy.expectedAnnualYield, strategy.deployedAsset) : '0'}
                  meta={strategy ? `${formatCurrency(strategy.expectedAnnualYieldUsd)} USD yield · ${formatCurrency(strategy.estimatedCostsUsd)} cost` : 'gas and bridge aware'}
                  tone="blue"
                  icon={<WalletCards size={16} />}
                />
                <MetricTile
                  label={`${preferredChain} gas`}
                  value={gasMeta ? `${gasMeta.gasPriceGwei} gwei` : 'loading'}
                  meta={gasMeta ? `${gasMeta.source} · ${gasMeta.blockTimeSeconds}s blocks` : 'RPC/fallback feed'}
                  tone="blue"
                  icon={<Network size={16} />}
                />
              </div>

              {renderBuildOutput()}
            </section>

            <RiskPanel risks={risks} />
          </section>
        )
    }
  }

  return (
    <main className="app-shell">
      <section className="top-band" style={{ backgroundImage: `linear-gradient(90deg, rgba(2, 8, 20, 0.94), rgba(2, 8, 20, 0.72)), url(${heroImage})` }}>
        <header className="brand-header">
          <div className="brand-mark" aria-label="StratEx">
            <span className="brand-mark__glyph">S</span>
            <div>
              <strong>StratEx</strong>
              <span>Yield Simulator</span>
            </div>
          </div>
          <div className="environment-light environment-light--test">
            <FlaskConical size={16} />
            <span>SIMULATOR ONLY</span>
          </div>
        </header>

        <div className="mission-strip">
          <div>
            <span>Capital mandate</span>
            <h1>Agentic DeFi Strategies</h1>
          </div>
          <p>
            The simulator scans DeFiLlama markets across approved assets and chains, applies a selectable risk tier, estimates gas and bridge friction, then reports a simulation route without preparing transactions or moving funds.
          </p>
        </div>
      </section>

      <FeedStatusBar
        gas={gas}
        onRefresh={handleRefreshFeeds}
        rates={rates}
        refreshing={isRefreshing}
        riskTier={riskTier}
        risks={risks}
      />

      <section className="rate-grid" aria-label="Average yield data feeds">
        {assets.map((rateAsset) => {
          const rate = rates?.rates[rateAsset]
          return (
            <RateFeedCard
              asset={rateAsset}
              isSelected={rateAsset === asset}
              key={rateAsset}
              rate={rate}
              riskTier={riskTier}
              source={rates?.source}
              updatedAt={rates?.updatedAt}
            />
          )
        })}
      </section>

      <nav className="workspace-tabs workspace-tabs--top" aria-label="Strategy workspace pages">
        {workspaceTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={activeTab === tab.id ? 'is-active' : ''}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </nav>

      {renderActiveWorkspacePage()}
    </main>
  )
}

export default App
