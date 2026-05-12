import { Clock3, RefreshCw, RadioTower, ShieldAlert, Zap } from 'lucide-react'
import type { RiskTier } from '../core/types'
import type { GasResponse, RatesResponse, RiskResponse } from '../services/api'

type FeedStatusBarProps = {
  rates?: RatesResponse
  gas?: GasResponse
  risks?: RiskResponse
  riskTier: RiskTier
  refreshing: boolean
  onRefresh: () => void
}

const titleCase = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`

const formatTime = (value?: string) => {
  if (!value) return 'loading'
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const formatMonth = (risks?: RiskResponse) => {
  const date = risks?.items[0]?.date ?? risks?.updatedAt
  if (!date) return 'Current-month risk feed'
  return `${new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))} risk feed`
}

export function FeedStatusBar({ rates, gas, risks, riskTier, refreshing, onRefresh }: FeedStatusBarProps) {
  const rpcChains = gas?.chains.filter((chain) => chain.source === 'rpc').length ?? 0
  const totalChains = gas?.chains.length ?? 4

  return (
    <section className="feed-status-bar" aria-label="Live feed status">
      <div className="feed-status-item">
        <RadioTower size={16} />
        <div>
          <span>{titleCase(riskTier)} risk rates</span>
          <strong>{rates?.source ?? 'loading'} DeFiLlama</strong>
        </div>
      </div>
      <div className="feed-status-item">
        <Clock3 size={16} />
        <div>
          <span>Last market refresh</span>
          <strong>{formatTime(rates?.updatedAt)}</strong>
        </div>
      </div>
      <div className="feed-status-item">
        <Zap size={16} />
        <div>
          <span>Gas model</span>
          <strong>{rpcChains}/{totalChains} RPC gas</strong>
        </div>
      </div>
      <div className="feed-status-item">
        <ShieldAlert size={16} />
        <div>
          <span>Risk window</span>
          <strong>{formatMonth(risks)}</strong>
        </div>
      </div>
      <button className="feed-refresh-button" disabled={refreshing} onClick={onRefresh} type="button" aria-label="Refresh feeds">
        <RefreshCw size={15} />
        {refreshing ? 'Refreshing' : 'Refresh feeds'}
      </button>
    </section>
  )
}
