import type { ContractLink, ProtocolAdapterAssumption, RiskTier, SupportedChain, TargetBand, YieldAsset } from './types'

export const ALLOWED_ASSETS = ['ETH', 'WETH', 'USDC', 'USDT', 'XRP', 'ARB', 'WBTC', 'ADA'] as const

export const ALLOWED_CHAINS = ['Ethereum', 'Base', 'Arbitrum', 'Optimism'] as const

export const TARGET_BANDS: Record<YieldAsset, TargetBand> = {
  ETH: { min: 5, max: 7 },
  WETH: { min: 5, max: 7 },
  USDC: { min: 7, max: 10 },
  USDT: { min: 7, max: 10 },
  WBTC: { min: 1, max: 5 },
  ARB: { min: 2, max: 8 },
  XRP: { min: 1, max: 6 },
  ADA: { min: 1, max: 6 },
}

export const HARD_MAX_APY = 20

export const MIN_DEPLOYABLE_TVL_USD = 10_000_000

export const MIN_OPPORTUNITY_TVL_USD = 10_000_000

export const DEPLOYABLE_PROTOCOLS = ['aave-v3', 'morpho-blue', 'pendle'] as const

export const LOW_RISK_PROTOCOLS = [
  'aave-v3',
  'morpho-blue',
  'pendle',
  'compound-v3',
  'compound',
  'spark-savings',
  'sparklend',
  'sky-lending',
  'maple',
  'lido',
  'rocket-pool',
  'ether.fi-stake',
] as const

export const MEDIUM_RISK_PROTOCOLS = [
  ...LOW_RISK_PROTOCOLS,
  'uniswap-v3',
  'curve-dex',
  'balancer',
  'aerodrome',
  'velodrome-v2',
  'beefy',
  'yearn',
  'fluid-lending',
  'convex-finance',
  'aura',
  'gearbox',
  'frax',
  'silo',
  'moonwell',
  'ether.fi',
] as const

export const RISK_TIER_CONFIG: Record<RiskTier, {
  minTvlUsd: number
  maxApy: number
  maxPositions: number
  minimumPositions: number
}> = {
  low: {
    minTvlUsd: 10_000_000,
    maxApy: 20,
    maxPositions: 5,
    minimumPositions: 2,
  },
  medium: {
    minTvlUsd: 1_000_000,
    maxApy: 80,
    maxPositions: 7,
    minimumPositions: 2,
  },
  high: {
    minTvlUsd: 10_000,
    maxApy: 400,
    maxPositions: 9,
    minimumPositions: 1,
  },
}

export const DEFAULT_ASSET_PRICES_USD: Record<YieldAsset, number> = {
  ETH: 3000,
  WETH: 3000,
  USDC: 1,
  USDT: 1,
  XRP: 0.5,
  ARB: 0.7,
  WBTC: 50000,
  ADA: 0.45,
}

export const BLUECHIP_PROTOCOLS: Record<string, string> = {
  'aave-v3': 'Aave V3',
  aave: 'Aave',
  'morpho-blue': 'Morpho Blue',
  morpho: 'Morpho',
  pendle: 'Pendle',
  'uniswap-v3': 'Uniswap V3',
  uniswap: 'Uniswap',
  'curve-dex': 'Curve',
  curve: 'Curve',
  'balancer-v2': 'Balancer',
  balancer: 'Balancer',
  aerodrome: 'Aerodrome',
  'aerodrome-v1': 'Aerodrome',
  'aerodrome-slipstream': 'Aerodrome',
  'compound-v3': 'Compound V3',
  compound: 'Compound',
  'spark-savings': 'Spark Savings',
  sparklend: 'SparkLend',
  'sky-lending': 'Sky Lending',
  maple: 'Maple',
  lido: 'Lido',
  'rocket-pool': 'Rocket Pool',
  'ether.fi-stake': 'Ether.fi Stake',
  'ether.fi': 'Ether.fi',
  'velodrome-v2': 'Velodrome V2',
  velodrome: 'Velodrome',
  beefy: 'Beefy',
  yearn: 'Yearn',
  fluid: 'Fluid',
  'fluid-lending': 'Fluid Lending',
  'convex-finance': 'Convex Finance',
  aura: 'Aura',
  gearbox: 'Gearbox',
  frax: 'Frax',
  silo: 'Silo',
  moonwell: 'Moonwell',
}

const adapter = (
  protocol: string,
  chain: SupportedChain,
  depositTarget: string,
  notes: string,
  overrides: Partial<ProtocolAdapterAssumption> = {},
): ProtocolAdapterAssumption => ({
  protocol,
  chain,
  depositTarget,
  approvalTarget: overrides.approvalTarget ?? depositTarget,
  withdrawalPath: overrides.withdrawalPath ?? 'Protocol withdrawal UI or vault redeem function',
  minDepositUsd: overrides.minDepositUsd ?? 100,
  approveGasUnits: overrides.approveGasUnits ?? 70_000,
  depositGasUnits: overrides.depositGasUnits ?? 135_000,
  withdrawGasUnits: overrides.withdrawGasUnits ?? 155_000,
  notes,
})

export const PROTOCOL_ADAPTERS: Record<string, Partial<Record<SupportedChain, ProtocolAdapterAssumption>>> = {
  'aave-v3': {
    Ethereum: adapter('aave-v3', 'Ethereum', '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', 'Aave V3 pool adapter assumption.', { minDepositUsd: 250 }),
    Base: adapter('aave-v3', 'Base', '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', 'Aave V3 Base pool adapter assumption.', { minDepositUsd: 100 }),
    Arbitrum: adapter('aave-v3', 'Arbitrum', '0x794a61358D6845594F94dc1d2DB2cEdEB3EFfA7', 'Aave V3 Arbitrum pool adapter assumption.', { minDepositUsd: 100 }),
    Optimism: adapter('aave-v3', 'Optimism', '0x794a61358D6845594F94dc1d2DB2cEdEB3EFfA7', 'Aave V3 Optimism pool adapter assumption.', { minDepositUsd: 100 }),
  },
  'morpho-blue': {
    Ethereum: adapter('morpho-blue', 'Ethereum', '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb', 'Morpho Blue market adapter assumption.', { depositGasUnits: 190_000, withdrawGasUnits: 210_000 }),
    Base: adapter('morpho-blue', 'Base', '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb', 'Morpho Blue Base market adapter assumption.', { depositGasUnits: 190_000, withdrawGasUnits: 210_000 }),
  },
  pendle: {
    Ethereum: adapter('pendle', 'Ethereum', '0x888888888889758F76e7103c6CbF23ABbF58F946', 'Pendle router adapter assumption.', { minDepositUsd: 500, depositGasUnits: 260_000, withdrawGasUnits: 285_000 }),
    Arbitrum: adapter('pendle', 'Arbitrum', '0x888888888889758F76e7103c6CbF23ABbF58F946', 'Pendle Arbitrum router adapter assumption.', { minDepositUsd: 250, depositGasUnits: 240_000, withdrawGasUnits: 260_000 }),
    Base: adapter('pendle', 'Base', '0x888888888889758F76e7103c6CbF23ABbF58F946', 'Pendle Base router adapter assumption.', { minDepositUsd: 250, depositGasUnits: 240_000, withdrawGasUnits: 260_000 }),
  },
  'uniswap-v3': {
    Ethereum: adapter('uniswap-v3', 'Ethereum', '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', 'Uniswap V3 NFT position manager adapter assumption.', { minDepositUsd: 1000, depositGasUnits: 320_000, withdrawGasUnits: 340_000 }),
    Base: adapter('uniswap-v3', 'Base', '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1', 'Uniswap V3 Base position manager adapter assumption.', { minDepositUsd: 500, depositGasUnits: 310_000, withdrawGasUnits: 330_000 }),
    Arbitrum: adapter('uniswap-v3', 'Arbitrum', '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', 'Uniswap V3 Arbitrum position manager adapter assumption.', { minDepositUsd: 500, depositGasUnits: 310_000, withdrawGasUnits: 330_000 }),
    Optimism: adapter('uniswap-v3', 'Optimism', '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', 'Uniswap V3 Optimism position manager adapter assumption.', { minDepositUsd: 500, depositGasUnits: 310_000, withdrawGasUnits: 330_000 }),
  },
  'curve-dex': {
    Ethereum: adapter('curve-dex', 'Ethereum', 'curve-registry', 'Curve pool-specific deposit adapter assumption.', { minDepositUsd: 500, depositGasUnits: 260_000, withdrawGasUnits: 280_000 }),
    Arbitrum: adapter('curve-dex', 'Arbitrum', 'curve-registry', 'Curve Arbitrum pool-specific deposit adapter assumption.', { minDepositUsd: 250, depositGasUnits: 240_000, withdrawGasUnits: 260_000 }),
  },
  balancer: {
    Ethereum: adapter('balancer', 'Ethereum', '0xBA12222222228d8Ba445958a75a0704d566BF2C8', 'Balancer vault adapter assumption.', { minDepositUsd: 500, depositGasUnits: 270_000, withdrawGasUnits: 300_000 }),
    Base: adapter('balancer', 'Base', '0xBA12222222228d8Ba445958a75a0704d566BF2C8', 'Balancer Base vault adapter assumption.', { minDepositUsd: 250, depositGasUnits: 250_000, withdrawGasUnits: 280_000 }),
    Arbitrum: adapter('balancer', 'Arbitrum', '0xBA12222222228d8Ba445958a75a0704d566BF2C8', 'Balancer Arbitrum vault adapter assumption.', { minDepositUsd: 250, depositGasUnits: 250_000, withdrawGasUnits: 280_000 }),
  },
  aerodrome: {
    Base: adapter('aerodrome', 'Base', 'aerodrome-router', 'Aerodrome router/gauge adapter assumption.', { minDepositUsd: 250, depositGasUnits: 240_000, withdrawGasUnits: 265_000 }),
  },
  'velodrome-v2': {
    Optimism: adapter('velodrome-v2', 'Optimism', 'velodrome-router', 'Velodrome V2 router/gauge adapter assumption.', { minDepositUsd: 250, depositGasUnits: 240_000, withdrawGasUnits: 265_000 }),
  },
  yearn: {
    Ethereum: adapter('yearn', 'Ethereum', 'erc4626-vault', 'Yearn vault adapter assumption.', { minDepositUsd: 250, depositGasUnits: 175_000, withdrawGasUnits: 205_000 }),
    Base: adapter('yearn', 'Base', 'erc4626-vault', 'Yearn Base vault adapter assumption.', { minDepositUsd: 100, depositGasUnits: 175_000, withdrawGasUnits: 205_000 }),
  },
  moonwell: {
    Base: adapter('moonwell', 'Base', 'moonwell-market', 'Moonwell market adapter assumption.', { minDepositUsd: 100, depositGasUnits: 165_000, withdrawGasUnits: 190_000 }),
  },
}

export const FALLBACK_CONTRACTS: Record<string, Partial<Record<SupportedChain, ContractLink[]>>> = {
  'aave-v3': {
    Base: [
      {
        label: 'Aave V3 Pool - Base',
        address: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
        explorerUrl:
          'https://basescan.org/address/0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      },
    ],
    Arbitrum: [
      {
        label: 'Aave V3 Pool - Arbitrum',
        address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        explorerUrl:
          'https://arbiscan.io/address/0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      },
    ],
  },
  'morpho-blue': {
    Base: [
      {
        label: 'Morpho Blue - Base',
        address: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
        explorerUrl:
          'https://basescan.org/address/0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
      },
    ],
    Arbitrum: [
      {
        label: 'Morpho Blue reference',
        address: '0x0000000000000000000000000000000000000000',
        explorerUrl: 'https://docs.morpho.org/',
      },
    ],
  },
  pendle: {
    Base: [
      {
        label: 'Pendle deployments',
        address: '0x0000000000000000000000000000000000000000',
        explorerUrl: 'https://docs.pendle.finance/Developers/Deployments',
      },
    ],
    Arbitrum: [
      {
        label: 'Pendle deployments',
        address: '0x0000000000000000000000000000000000000000',
        explorerUrl: 'https://docs.pendle.finance/Developers/Deployments',
      },
    ],
  },
  'uniswap-v3': {
    Base: [
      {
        label: 'Uniswap V3 Factory - Base',
        address: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        explorerUrl:
          'https://basescan.org/address/0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
      },
    ],
    Arbitrum: [
      {
        label: 'Uniswap V3 Factory - Arbitrum',
        address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        explorerUrl:
          'https://arbiscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984',
      },
    ],
  },
  'curve-dex': {
    Base: [
      {
        label: 'Curve registry reference',
        address: '0x0000000000000000000000000000000000000000',
        explorerUrl: 'https://resources.curve.fi/',
      },
    ],
    Arbitrum: [
      {
        label: 'Curve registry reference',
        address: '0x0000000000000000000000000000000000000000',
        explorerUrl: 'https://resources.curve.fi/',
      },
    ],
  },
  aerodrome: {
    Base: [
      {
        label: 'Aerodrome contracts',
        address: '0x0000000000000000000000000000000000000000',
        explorerUrl: 'https://github.com/aerodrome-finance/contracts',
      },
    ],
    Arbitrum: [
      {
        label: 'Aerodrome Base-only reference',
        address: '0x0000000000000000000000000000000000000000',
        explorerUrl: 'https://aerodrome.finance/',
      },
    ],
  },
  balancer: {
    Base: [
      {
        label: 'Balancer deployments',
        address: '0x0000000000000000000000000000000000000000',
        explorerUrl: 'https://docs.balancer.fi/developer-reference/contracts/deployment-addresses/mainnet.html',
      },
    ],
    Arbitrum: [
      {
        label: 'Balancer deployments',
        address: '0x0000000000000000000000000000000000000000',
        explorerUrl: 'https://docs.balancer.fi/developer-reference/contracts/deployment-addresses/mainnet.html',
      },
    ],
  },
}
