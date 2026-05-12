import { ALLOWED_ASSETS, DEFAULT_ASSET_PRICES_USD } from '../core/config'
import type { YieldAsset } from '../core/types'

const LLAMA_PRICE_IDS: Partial<Record<YieldAsset, string>> = {
  ETH: 'coingecko:ethereum',
  WETH: 'coingecko:ethereum',
  WBTC: 'coingecko:wrapped-bitcoin',
  XRP: 'coingecko:ripple',
  ARB: 'coingecko:arbitrum',
  ADA: 'coingecko:cardano',
}

type LlamaPriceResponse = {
  coins?: Record<string, { price?: number }>
}

export const fetchAssetPrices = async () => {
  const prices: Record<YieldAsset, number> = { ...DEFAULT_ASSET_PRICES_USD }
  prices.USDC = 1
  prices.USDT = 1

  const ids = [...new Set(Object.values(LLAMA_PRICE_IDS).filter(Boolean))]
  try {
    const response = await fetch(`https://coins.llama.fi/prices/current/${ids.join(',')}`, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`DeFiLlama prices responded ${response.status}`)
    const payload = (await response.json()) as LlamaPriceResponse

    for (const asset of ALLOWED_ASSETS) {
      if (asset === 'USDC' || asset === 'USDT') continue
      const id = LLAMA_PRICE_IDS[asset]
      const price = id ? payload.coins?.[id]?.price : undefined
      if (Number.isFinite(price) && price && price > 0) {
        prices[asset] = price
      }
    }
  } catch (error) {
    console.warn('Using fallback asset prices:', error)
  }

  prices.WETH = prices.ETH
  return {
    source: 'defillama-prices',
    updatedAt: new Date().toISOString(),
    prices,
  }
}
