import { AlertTriangle, Bell, ExternalLink, RadioTower, ShieldAlert } from 'lucide-react'
import type { OpportunityResponse, RiskResponse } from '../services/api'

type SidePanelsProps = {
  opportunities?: OpportunityResponse
  risks?: RiskResponse
}

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'currency',
    currency: 'USD',
  }).format(value)

export function NotificationsPanel({ opportunities }: SidePanelsProps) {
  const items = opportunities?.opportunities ?? []

  return (
    <aside className="side-panel side-panel--left">
      <details className="panel-disclosure" open>
        <summary className="side-panel__title">
          <Bell size={18} />
          <div>
            <span>Notifications</span>
            <strong>Opportunity radar</strong>
          </div>
        </summary>
        <div className="side-panel__content">
          {items.length === 0 ? (
            <div className="empty-signal">
              <RadioTower size={22} />
              <p>No above-target safe-yield anomalies currently detected.</p>
            </div>
          ) : (
            <div className="signal-list">
              {items.slice(0, 6).map((item) => (
                <article className="signal-card" key={`${item.poolId}-${item.asset}-${item.chain}`}>
                  <div>
                    <AlertTriangle size={16} />
                    <strong>{item.apy.toFixed(2)}% APY</strong>
                  </div>
                  <p>{item.message}</p>
                  <span>
                    {item.asset} · {item.chain} · review required
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </details>
    </aside>
  )
}

export function RiskPanel({ risks }: SidePanelsProps) {
  const items = risks?.items ?? []
  const degraded = risks?.source === 'fallback'

  return (
    <aside className="side-panel side-panel--right">
      <details className="panel-disclosure" open>
        <summary className="side-panel__title">
          <ShieldAlert size={18} />
          <div>
            <span>Risk Feed</span>
            <strong>DeFi exploit watch</strong>
          </div>
        </summary>
        <div className="side-panel__content risk-list">
          {items.length === 0 ? (
            <div className={`empty-signal ${degraded ? 'empty-signal--warn' : ''}`}>
              <RadioTower size={22} />
              <p>{degraded ? 'Risk feed unavailable. Current-month incident status is unknown.' : 'No current-month Ethereum, Base, Arbitrum, or Optimism incidents in the feed.'}</p>
            </div>
          ) : (
            items.slice(0, 6).map((item) => (
              <article className={`risk-card risk-card--${item.severity}`} key={`${item.name}-${item.date}`}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                </div>
                <p>{item.technique}</p>
                <footer>
                  <span>{currency(item.amountUsd)}</span>
                  <span>{item.chains.slice(0, 2).join(', ') || 'Multi-chain'}</span>
                  {item.source.startsWith('http') ? (
                    <a href={item.source} target="_blank" rel="noreferrer" aria-label={`Open ${item.name} source`}>
                      <ExternalLink size={13} />
                    </a>
                  ) : null}
                </footer>
              </article>
            ))
          )}
        </div>
      </details>
    </aside>
  )
}
