import { createPublicClient, formatGwei, http } from 'viem'
import type { Chain } from 'viem'
import { arbitrum, base, mainnet, optimism } from 'viem/chains'
import { ALLOWED_CHAINS } from '../core/config'
import type { SupportedChain } from '../core/types'

type GasChainSnapshot = {
  chain: SupportedChain
  source: 'rpc' | 'fallback'
  gasPriceGwei: number
  estimatedApproveUsd: number
  estimatedDepositUsd: number
  estimatedBridgeUsd: number
  blockTimeSeconds: number
}

const chainConfig: Record<SupportedChain, {
  viemChain: Chain
  rpcEnv: string
  fallbackGwei: number
  blockTimeSeconds: number
  bridgeUsd: number
}> = {
  Ethereum: {
    viemChain: mainnet,
    rpcEnv: 'ETHEREUM_RPC_URL',
    fallbackGwei: 5,
    blockTimeSeconds: 12,
    bridgeUsd: 9.4,
  },
  Base: {
    viemChain: base,
    rpcEnv: 'BASE_RPC_URL',
    fallbackGwei: 0.04,
    blockTimeSeconds: 2,
    bridgeUsd: 2.9,
  },
  Arbitrum: {
    viemChain: arbitrum,
    rpcEnv: 'ARBITRUM_RPC_URL',
    fallbackGwei: 0.08,
    blockTimeSeconds: 1,
    bridgeUsd: 3.4,
  },
  Optimism: {
    viemChain: optimism,
    rpcEnv: 'OPTIMISM_RPC_URL',
    fallbackGwei: 0.05,
    blockTimeSeconds: 2,
    bridgeUsd: 2.8,
  },
}

const ethPriceUsd = async () => {
  try {
    const response = await fetch('https://coins.llama.fi/prices/current/coingecko:ethereum')
    const json = (await response.json()) as { coins?: Record<string, { price?: number }> }
    return json.coins?.['coingecko:ethereum']?.price ?? 3000
  } catch {
    return 3000
  }
}

const rpcUrlFor = (chain: SupportedChain) =>
  process.env[chainConfig[chain].rpcEnv] || chainConfig[chain].viemChain.rpcUrls.default.http[0]

const gasCostUsd = (gasUnits: number, gasPriceGwei: number, ethUsd: number) =>
  Math.round(gasUnits * gasPriceGwei * 1e-9 * ethUsd * 100) / 100

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('RPC gas timeout')), timeoutMs)
    }),
  ])

const fallback = (chain: SupportedChain, ethUsd: number): GasChainSnapshot => {
  const config = chainConfig[chain]
  return {
    chain,
    source: 'fallback',
    gasPriceGwei: config.fallbackGwei,
    estimatedApproveUsd: Math.max(0.04, gasCostUsd(70_000, config.fallbackGwei, ethUsd)),
    estimatedDepositUsd: Math.max(0.07, gasCostUsd(135_000, config.fallbackGwei, ethUsd)),
    estimatedBridgeUsd: config.bridgeUsd,
    blockTimeSeconds: config.blockTimeSeconds,
  }
}

export const fetchGasSnapshot = async () => {
  const price = await ethPriceUsd()
  const snapshots = await Promise.all(
    ALLOWED_CHAINS.map(async (chain): Promise<GasChainSnapshot> => {
      const config = chainConfig[chain]
      try {
        const client = createPublicClient({
          chain: config.viemChain,
          transport: http(rpcUrlFor(chain), { timeout: 5_000 }),
        })
        const gasPrice = await withTimeout(client.getGasPrice(), 4_000)
        const gasPriceGwei = Number(formatGwei(gasPrice))

        return {
          chain,
          source: 'rpc',
          gasPriceGwei: Math.round(gasPriceGwei * 1000) / 1000,
          estimatedApproveUsd: Math.max(0.04, gasCostUsd(70_000, gasPriceGwei, price)),
          estimatedDepositUsd: Math.max(0.07, gasCostUsd(135_000, gasPriceGwei, price)),
          estimatedBridgeUsd: config.bridgeUsd,
          blockTimeSeconds: config.blockTimeSeconds,
        }
      } catch {
        return fallback(chain, price)
      }
    }),
  )

  return {
    updatedAt: new Date().toISOString(),
    ethPriceUsd: Math.round(price),
    chains: snapshots,
  }
}
