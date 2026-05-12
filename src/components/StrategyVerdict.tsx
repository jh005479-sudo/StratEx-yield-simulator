import { CheckCircle2, CircleDashed, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { RiskTier, StrategyResult, TargetBand, YieldAsset } from '../core/types'

type StrategyVerdictProps = {
  strategy?: StrategyResult
  asset: YieldAsset
  amount: number
  target: TargetBand
  riskTier: RiskTier
  marketDepthBlock?: MarketDepthBlock
}

export type MarketDepthBlock = {
  asset: YieldAsset
  eligibleMarkets: number
  minimumMarkets: number
}

const formatAmount = (value: number, asset: YieldAsset) =>
  `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: asset === 'ETH' || asset === 'WETH' || asset === 'WBTC' ? 4 : 0,
  }).format(value)} ${asset}`

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value)

const pluralizeMarkets = (count: number) => `${count} eligible market${count === 1 ? '' : 's'}`

export function StrategyVerdict({
  strategy,
  asset,
  amount,
  target,
  riskTier,
  marketDepthBlock,
}: StrategyVerdictProps) {
  const status = strategy?.targetStatus ?? 'below-target'
  const inside = status === 'inside-target'
  const above = status === 'above-target'
  const blocked = Boolean(marketDepthBlock && !strategy)
  const protocols = new Set(strategy?.positions.map((position) => position.platformLabel) ?? [])
  const chains = new Set(strategy?.positions.map((position) => position.chain) ?? [])
  const verdictClass = blocked ? 'blocked' : inside ? 'inside' : above ? 'above' : 'empty'

  return (
    <section className={`strategy-verdict strategy-verdict--${verdictClass}`}>
      <div className="strategy-verdict__main">
        <div className="verdict-icon">
          {strategy || blocked ? (
            inside && !blocked ? <CheckCircle2 size={23} /> : <TriangleAlert size={23} />
          ) : (
            <CircleDashed size={23} />
          )}
        </div>
        <div>
          <span>Agent verdict</span>
          <h2>
            {blocked && marketDepthBlock
              ? `Insufficient ${marketDepthBlock.asset} market depth`
              : strategy
              ? inside
                ? 'In mandate, ready for reviewed simulation'
                : above
                  ? 'Above mandate, route for human review'
                  : 'Below mandate, keep scanning'
              : 'Awaiting strategy simulation'}
          </h2>
          <p>
            {blocked && marketDepthBlock
              ? `Live DeFiLlama scan has ${pluralizeMarkets(marketDepthBlock.eligibleMarkets)} for the ${riskTier} simulator. StratEx requires at least ${marketDepthBlock.minimumMarkets} eligible markets before creating a multi-position route, so the agent will keep scanning instead of forcing a thin simulation.`
              : strategy
              ? `${formatAmount(strategy.amount, strategy.asset)} (${formatUsd(strategy.notionalUsd)}) becomes ${formatAmount(strategy.expectedAnnualYield, strategy.deployedAsset)} / ${formatUsd(strategy.expectedAnnualYieldUsd)} expected annual yield at ${strategy.blendedApr.toFixed(2)}% blended APY.`
              : `Ready to test ${formatAmount(amount, asset)} against the ${target.min}-${target.max}% mandate.`}
          </p>
        </div>
      </div>
      <div className="safety-gates" aria-label="Safety gates">
        <span className="gate gate--ok">
          <ShieldCheck size={14} />
          8 assets
        </span>
        <span className="gate gate--ok">4 supported chains</span>
        <span className={inside || (!strategy && !blocked) ? 'gate gate--ok' : 'gate gate--warn'}>{target.min}-{target.max}% target</span>
        <span className="gate gate--warn">simulator only</span>
        <span className="gate gate--info">{strategy?.riskTier ?? riskTier} risk</span>
        {marketDepthBlock && !strategy ? (
          <>
            <span className="gate gate--warn">
              {marketDepthBlock.eligibleMarkets}/{marketDepthBlock.minimumMarkets} markets
            </span>
            <span className="gate gate--info">multi-position gated</span>
          </>
        ) : null}
        {strategy ? (
          <span className="gate gate--info">
            {protocols.size} protocols · {chains.size} chains
          </span>
        ) : null}
      </div>
    </section>
  )
}
