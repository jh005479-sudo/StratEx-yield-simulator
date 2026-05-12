import { ExternalLink, ShieldCheck } from 'lucide-react'
import type { StrategyPosition } from '../core/types'

type PositionCardProps = {
  position: StrategyPosition
}

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value < 100 ? 4 : 0,
  }).format(value)

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value)

export function PositionCard({ position }: PositionCardProps) {
  return (
    <article className="position-card">
      <div className="position-card__header">
        <div>
          <span>{position.chain}</span>
          <h3>{position.platformLabel}</h3>
        </div>
        <div className="risk-pill">
          <ShieldCheck size={14} />
          {position.riskGrade}
        </div>
      </div>
      <div className="position-card__numbers">
        <div>
          <span>Allocation</span>
          <strong>{position.allocationPct}%</strong>
        </div>
        <div>
          <span>Amount</span>
          <strong>
            {formatAmount(position.amount)} {position.asset}
          </strong>
          <small>{formatUsd(position.amountUsd)}</small>
        </div>
        <div>
          <span>APY</span>
          <strong>{position.apr.toFixed(2)}%</strong>
          <small>{formatUsd(position.expectedAnnualYieldUsd)} / yr</small>
        </div>
        <div>
          <span>TVL</span>
          <strong>${formatAmount(position.tvlUsd)}</strong>
        </div>
      </div>
      <p>{position.rationale}</p>
      <div className="adapter-strip">
        <span>{position.adapter.protocol}</span>
        <span>Min {formatUsd(position.adapter.minDepositUsd)}</span>
        <span>{position.wrapperKind ?? 'canonical'}</span>
      </div>
      <details className="contract-details">
        <summary>Source contracts / references</summary>
        <ul>
          {position.contracts.map((contract) => (
            <li key={`${position.id}-${contract.label}-${contract.address}`}>
              <a href={contract.explorerUrl} target="_blank" rel="noreferrer">
                <span>{contract.label}</span>
                <code>{contract.address}</code>
                <ExternalLink size={13} />
              </a>
            </li>
          ))}
          <li>
            <a href={position.url} target="_blank" rel="noreferrer">
              <span>DeFiLlama/source market</span>
              <code>{position.url.replace('https://', '')}</code>
              <ExternalLink size={13} />
            </a>
          </li>
        </ul>
      </details>
    </article>
  )
}
