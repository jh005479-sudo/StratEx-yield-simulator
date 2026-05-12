import type {
  AssetRateSummary,
  MarketDataSource,
  OpportunityAlert,
  RebalanceCadence,
  RiskTier,
  StrategyConstraints,
  StrategyResult,
  StressScenario,
  SupportedChain,
  YieldAsset,
} from '../core/types'

export type ApiSource = MarketDataSource

export type RatesResponse = {
  source: ApiSource
  updatedAt: string
  riskTier: RiskTier
  rates: Record<YieldAsset, AssetRateSummary>
}

export type OpportunityResponse = {
  source: ApiSource
  updatedAt: string
  opportunities: OpportunityAlert[]
}

export type GasResponse = {
  updatedAt: string
  ethPriceUsd: number
  chains: Array<{
    chain: SupportedChain
    source: 'rpc' | 'fallback'
    gasPriceGwei: number
    estimatedApproveUsd: number
    estimatedDepositUsd: number
    estimatedBridgeUsd: number
    blockTimeSeconds: number
  }>
}

export type RiskResponse = {
  source: string
  updatedAt: string
  items: Array<{
    date: string
    name: string
    classification: string
    technique: string
    amountUsd: number
    chains: string[]
    source: string
    severity: 'low' | 'medium' | 'high'
  }>
}

export type SimulationResponse = {
  source: ApiSource
  strategy: StrategyResult
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json()
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string' ? payload.error : 'The StratEx agent API rejected the request'
    throw new Error(message)
  }
  return payload as T
}

const request = <T>(path: string, init?: RequestInit) =>
  fetch(path, {
    cache: 'no-store',
    ...init,
    headers: init?.headers,
  }).then((response) => parseResponse<T>(response))

export const getRates = (riskTier: RiskTier = 'low') => request<RatesResponse>(`/api/rates?riskTier=${riskTier}`)

export const getOpportunities = () => request<OpportunityResponse>('/api/opportunities')

export const getGas = () => request<GasResponse>('/api/gas')

export const getRisks = () => request<RiskResponse>('/api/risks')

export const simulateStrategy = (body: {
  asset: YieldAsset
  amount: number
  preferredChain: SupportedChain
  riskTier: RiskTier
  backtestDays?: number
  rebalanceCadence?: RebalanceCadence
  constraints?: StrategyConstraints
  stressScenario?: StressScenario
}) =>
  request<SimulationResponse>('/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
