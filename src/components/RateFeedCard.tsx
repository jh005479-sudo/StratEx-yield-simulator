import { Database, RadioTower } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { AssetRateSummary, RiskTier, YieldAsset } from '../core/types'
import type { ApiSource } from '../services/api'

type RateFeedCardProps = {
  asset: YieldAsset
  rate?: AssetRateSummary
  source?: ApiSource
  updatedAt?: string
  riskTier: RiskTier
  isSelected?: boolean
}

const fallbackTarget = (asset: YieldAsset) =>
  asset === 'USDC' || asset === 'USDT'
    ? { min: 7, max: 10 }
    : asset === 'ETH' || asset === 'WETH'
      ? { min: 5, max: 7 }
      : asset === 'WBTC'
        ? { min: 1, max: 5 }
        : asset === 'ARB'
          ? { min: 2, max: 8 }
          : { min: 1, max: 6 }

const formatTime = (value?: string) => {
  if (!value) return 'loading'
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const formatCompactUsd = (value = 0) =>
  new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 1,
    notation: 'compact',
    style: 'currency',
  }).format(value)

export function RateFeedCard({ asset, rate, source, updatedAt, riskTier, isSelected }: RateFeedCardProps) {
  const target = rate?.target ?? fallbackTarget(asset)
  const average = rate?.averageApr ?? 0
  const mean30d = rate?.apyMean30d ?? 0
  const baseApr = rate?.baseApr ?? 0
  const rewardApr = rate?.rewardApr ?? 0
  const status =
    average >= target.min && average <= target.max ? 'inside' : average > target.max ? 'above' : 'below'
  const bandSpan = Math.max(1, target.max - target.min)
  const gaugePct = Math.min(100, Math.max(0, ((average - target.min) / bandSpan) * 100))

  return (
    <article className={`rate-card rate-card--${status} ${isSelected ? 'rate-card--selected' : ''}`} style={{ '--gauge-pct': `${gaugePct}%` } as CSSProperties}>
      <div className="rate-card__top">
        <div>
          <span>{asset} {riskTier} TVL-weighted</span>
          <strong>{average.toFixed(2)}%</strong>
        </div>
        <Database size={16} />
      </div>
      <div className="rate-card__detail">
        <span>30d {mean30d.toFixed(2)}%</span>
        <span>Base {baseApr.toFixed(2)}%</span>
        <span>Rewards {rewardApr.toFixed(2)}%</span>
      </div>
      <div className="target-band">
        <span>{target.min}%</span>
        <div>
          <i />
        </div>
        <span>{target.max}%</span>
      </div>
      <footer>
        <span>{rate?.poolCount ?? 0} pools · {formatCompactUsd(rate?.totalTvlUsd)}</span>
        <span>
          <RadioTower size={12} />
          {source ?? 'fallback'} DeFiLlama · {formatTime(updatedAt)}
        </span>
      </footer>
    </article>
  )
}
