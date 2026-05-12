import type { ReactNode } from 'react'

type MetricTileProps = {
  label: string
  value: string
  meta?: string
  tone?: 'blue' | 'green' | 'amber' | 'red'
  icon?: ReactNode
}

export function MetricTile({ label, value, meta, tone = 'blue', icon }: MetricTileProps) {
  return (
    <div className={`metric-tile metric-tile--${tone}`}>
      <div className="metric-tile__top">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      {meta ? <small>{meta}</small> : null}
    </div>
  )
}
