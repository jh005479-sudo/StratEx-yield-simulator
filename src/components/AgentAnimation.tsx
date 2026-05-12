import { motion } from 'framer-motion'
import { BrainCircuit, Database, Orbit, Radar, Route, Satellite, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { RiskTier, SupportedChain, YieldAsset } from '../core/types'

type AgentAnimationProps = {
  active: boolean
  riskTier: RiskTier
  asset: YieldAsset
  chain: SupportedChain
}

const packets = ['DeFiLlama', 'Gas', 'TVL', 'APY', 'IL', 'Route', 'Cost']
const phases = ['Ingest', 'Classify', 'Stress', 'Allocate', 'Report']
const marketSignals = ['APY', 'TVL', 'Depth', 'IL', 'Gas', 'Drift']
const chainLanes: SupportedChain[] = ['Ethereum', 'Base', 'Arbitrum', 'Optimism']
const allocationStack = ['Lend', 'Vault', 'LP', 'Bridge', 'Rebalance']
const routeBeacons = ['USDC', 'WETH', 'WBTC', 'ARB', 'USDT', 'ETH']

export function AgentAnimation({ active, riskTier, asset, chain }: AgentAnimationProps) {
  return (
    <div className={`agent-animation agent-animation--${riskTier} ${active ? 'agent-animation--active' : ''}`} aria-live="polite">
      <div className="agent-animation__grid" />
      <div className="agent-animation__scan" />
      <div className="agent-animation__nebula agent-animation__nebula--a" />
      <div className="agent-animation__nebula agent-animation__nebula--b" />
      <div className="agent-animation__orbit agent-animation__orbit--outer" />
      <div className="agent-animation__orbit agent-animation__orbit--middle" />
      <div className="agent-animation__orbit agent-animation__orbit--inner" />
      <div className="agent-animation__route agent-animation__route--a" />
      <div className="agent-animation__route agent-animation__route--b" />
      <div className="agent-animation__route agent-animation__route--c" />
      <div className="agent-animation__route agent-animation__route--d" />
      <div className="agent-animation__route agent-animation__route--e" />
      <div className="agent-animation__route agent-animation__route--f" />

      <div className="agent-animation__side agent-animation__side--left" aria-hidden="true">
        <span className="agent-animation__side-title">Market intake</span>
        <div className="agent-animation__signal-stack">
          {marketSignals.map((signal, index) => (
            <span className={active || index < 3 ? 'is-lit' : ''} key={signal}>
              <i />
              {signal}
            </span>
          ))}
        </div>
      </div>

      <div className="agent-animation__side agent-animation__side--right" aria-hidden="true">
        <span className="agent-animation__side-title">Chain lanes</span>
        <div className="agent-animation__chain-stack">
          {chainLanes.map((lane) => (
            <span className={lane === chain ? 'is-selected' : ''} key={lane}>
              <i />
              {lane}
            </span>
          ))}
        </div>
        <div className="agent-animation__allocation">
          <span className="agent-animation__side-title">Route builder</span>
          {allocationStack.map((item, index) => (
            <span className={active || index < 2 ? 'is-lit' : ''} key={item}>
              <i style={{ width: `${44 + index * 10}%` }} />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="agent-animation__risk-radar" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>

      <div className="agent-animation__constellation" aria-hidden="true">
        {Array.from({ length: 28 }).map((_, index) => (
          <span key={index} style={{ '--spark-index': index } as CSSProperties} />
        ))}
      </div>

      <div className="agent-animation__node agent-animation__node--core" aria-label="Agent core">
        <BrainCircuit size={30} />
        <span>SX</span>
      </div>
      <div className="agent-animation__node agent-animation__node--left">
        <Database size={19} />
        <span>Feeds</span>
      </div>
      <div className="agent-animation__node agent-animation__node--right">
        <Satellite size={19} />
        <span>{chain}</span>
      </div>
      <div className="agent-animation__node agent-animation__node--bottom">
        <ShieldCheck size={19} />
        <span>{riskTier}</span>
      </div>
      <div className="agent-animation__node agent-animation__node--top">
        <Radar size={19} />
        <span>{asset}</span>
      </div>
      <div className="agent-animation__node agent-animation__node--diagonal-a">
        <Route size={18} />
        <span>Paths</span>
      </div>
      <div className="agent-animation__node agent-animation__node--diagonal-b">
        <Orbit size={18} />
        <span>Stress</span>
      </div>

      {packets.map((packet, index) => (
        <motion.span
          className="agent-animation__packet"
          key={packet}
          initial={false}
          animate={
            active
              ? {
                  opacity: [0, 1, 1, 0],
                  x: [-124 + index * 15, -20 + index * 4, 124 - index * 12],
                  y: [58 - index * 19, -40 + index * 6, -78 + index * 21],
                  rotate: [-8, 4, 10],
                  scale: [0.58, 1, 0.78],
                }
              : { opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.7 }
          }
          transition={{
            duration: 2.3,
            delay: index * 0.11,
            repeat: active ? Infinity : 0,
            repeatDelay: 0.1,
          }}
        >
          <Zap size={12} />
          {packet}
        </motion.span>
      ))}

      {routeBeacons.map((beacon, index) => (
        <motion.span
          className="agent-animation__beacon"
          key={beacon}
          initial={false}
          animate={
            active
              ? {
                  opacity: [0, 1, 1, 0],
                  x: [-360 + index * 12, -120 + index * 36, 320 - index * 10],
                  y: [-112 + index * 39, -72 + index * 18, 106 - index * 30],
                  scale: [0.62, 1, 0.78],
                }
              : { opacity: index < 2 ? 0.54 : 0.18, x: 0, y: 0, scale: 0.78 }
          }
          transition={{
            duration: 3.6,
            delay: index * 0.18,
            repeat: active ? Infinity : 0,
            repeatDelay: 0.2,
          }}
        >
          {beacon}
        </motion.span>
      ))}

      <div className="agent-animation__phasebar" aria-hidden="true">
        {phases.map((phase, index) => (
          <span className={active || index <= 1 ? 'is-lit' : ''} key={phase}>
            {phase}
          </span>
        ))}
      </div>
      <div className="agent-animation__status">
        <span>
          <Sparkles size={12} />
          Hyper-accurate simulation
        </span>
        <strong>{active ? 'Agents working' : 'Standby'}</strong>
      </div>
    </div>
  )
}
