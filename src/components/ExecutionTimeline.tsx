import { ArrowRight, Clock, Fuel } from 'lucide-react'
import type { ExecutionStep } from '../core/types'

type ExecutionTimelineProps = {
  steps: ExecutionStep[]
}

const secondsLabel = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  return `${minutes}m`
}

export function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
  const totalGas = steps.reduce((sum, step) => sum + step.estimatedGasUsd, 0)
  const totalSeconds = steps.reduce((sum, step) => sum + step.estimatedSeconds, 0)

  return (
    <section className="execution-panel">
      <header>
        <div>
          <span>Execution path</span>
          <h2>{steps.length} guarded steps</h2>
        </div>
        <div className="execution-totals">
          <span>
            <Fuel size={13} /> ${totalGas.toFixed(2)}
          </span>
          <span>
            <Clock size={13} /> {secondsLabel(totalSeconds)}
          </span>
        </div>
      </header>
      <div className="execution-timeline">
        {steps.map((step, index) => (
          <article className={`execution-node execution-node--${step.kind}`} key={`${step.kind}-${index}-${step.label}`}>
            <span className="execution-node__index">{index + 1}</span>
            <div>
              <strong>{step.kind}</strong>
              <p>{step.label}</p>
              <small>
                {step.chain} · ${step.estimatedGasUsd.toFixed(2)} · {secondsLabel(step.estimatedSeconds)}
              </small>
            </div>
            {index < steps.length - 1 ? <ArrowRight className="execution-node__arrow" size={14} /> : null}
          </article>
        ))}
      </div>
    </section>
  )
}
