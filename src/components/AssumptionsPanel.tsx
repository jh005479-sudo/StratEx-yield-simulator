import { AlertTriangle, Fuel, Info, Link2, Waves } from 'lucide-react'
import type { RiskTier, StrategyResult } from '../core/types'
import type { ApiSource } from '../services/api'

type AssumptionsPanelProps = {
  riskTier: RiskTier
  strategy?: StrategyResult
  source?: ApiSource
}

const riskCopy: Record<RiskTier, string> = {
  low: 'Blue-chip, single-asset, no-IL DeFiLlama rows only.',
  medium: 'Curated mid/blue-chip protocols with multi-asset routes allowed.',
  high: 'Broad DeFiLlama discovery across minor markets and chains.',
}

export function AssumptionsPanel({ riskTier, strategy, source }: AssumptionsPanelProps) {
  return (
    <aside className="assumptions-panel" aria-label="Simulation assumptions">
      <div>
        <span>Model assumptions</span>
        <h2>Accuracy Caveats</h2>
      </div>
      <ul className="assumption-list">
        <li>
          <Info size={16} />
          <div>
            <strong>Yield feed</strong>
            <span>{source ?? 'fallback'} DeFiLlama APY with TVL-weighted rates, base/reward split, and 30d context.</span>
          </div>
        </li>
        <li>
          <Link2 size={16} />
          <div>
            <strong>Contract links</strong>
            <span>Source references plus protocol adapter assumptions for deposit, approval, withdrawal, and minimum size.</span>
          </div>
        </li>
        <li>
          <Fuel size={16} />
          <div>
            <strong>Gas model</strong>
            <span>Live gas prices scaled by protocol adapter gas units, with bridge and wrap steps separated.</span>
          </div>
        </li>
        <li>
          <Waves size={16} />
          <div>
            <strong>{riskTier} tier</strong>
            <span>{riskCopy[riskTier]}</span>
          </div>
        </li>
        <li>
          <AlertTriangle size={16} />
          <div>
            <strong>Route depth</strong>
            <span>{strategy ? `${strategy.marketUniverse.eligiblePools} eligible markets found.` : 'Sparse assets may correctly return no route.'}</span>
          </div>
        </li>
      </ul>
    </aside>
  )
}
