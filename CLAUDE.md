# Vault v2 Reallocation Bot

A reallocation bot for Morpho Vaults v2 that monitors vault states and executes reallocation strategies to optimize capital allocation across markets. Built as a pnpm monorepo with TypeScript, viem, and a plugin-based strategy system.

## Monorepo Structure

- `apps/config` - Configuration package (`@vault-v2-reallocation-bot/config`)
- `apps/client` - Client package (`@vault-v2-reallocation-bot/client`)

## Architecture & Key Files

### Entry Points
- `apps/client/src/script.ts` - Bot startup script
- `apps/client/src/bot.ts` - `ReallocationBot` class: fetches vault data, evaluates strategies, executes transactions

### Strategy System
- `apps/client/src/strategies/strategy.ts` - `Strategy` interface
- `apps/client/src/strategies/factory.ts` - Strategy factory (`createStrategy`)
- `apps/client/src/strategies/marketV1/equilizeUtilizations/` - Equalizes utilization rates across markets
- `apps/client/src/strategies/marketV1/apyRange/` - Maintains borrow APY within configured ranges

### Utilities
- `apps/client/src/utils/maths.ts` - BigInt WAD math helpers
- `apps/client/src/utils/types.ts` - Core type definitions (`VaultV2Data`, `Reallocation`, `MarketV1Data`, etc.)
- `apps/client/src/utils/fetchers.ts` - RPC data fetchers

### API & ABIs
- `apps/client/src/api/` - Morpho API GraphQL client
- `apps/client/src/abis/` - Contract ABI definitions

### Configuration
- `apps/config/src/config.ts` - Chain and strategy assignments
- `apps/config/src/types.ts` - `StrategyName`, `ChainConfig` types
- `apps/config/src/strategies/` - Per-strategy configuration (thresholds, ranges, etc.)

### Key Types

```typescript
type StrategyName = "equilizeUtilizations" | "apyRange"

interface Strategy {
  findReallocation(vaultData: VaultV2Data): MaybePromise<Reallocation | undefined>
}

interface Reallocation {
  allocations: ReallocationAction[]
  deallocations: ReallocationAction[]
}

interface ReallocationAction {
  adapterAddress: Address
  data: Hex  // Encoded market params
  assets: bigint
}

interface ChainConfig {
  chain: Chain
  chainId: number
  rpcUrl: string
  vaultWhitelist: Address[]
  reallocatorPrivateKey: Hex
  executionInterval: number  // minutes
  strategy: StrategyName
}
```

## Development Commands

```bash
pnpm install            # Install dependencies
pnpm reallocate         # Run the bot (builds config first)
pnpm build:config       # Build the config package
pnpm test:strategies    # Run strategy tests
pnpm test:execution     # Run execution tests
pnpm lint               # Run ESLint + Prettier
```

## Code Standards & Conventions

### BigInt Math (WAD = 1e18)
All percentage and rate calculations use WAD (18 decimals). Helpers in `apps/client/src/utils/maths.ts`:

- `wMulDown`, `wMulUp` - WAD multiply (round down/up)
- `wDivDown`, `wDivUp` - WAD divide (round down/up)
- `mulDivDown`, `mulDivUp` - Generic multiply-divide (round down/up)
- `toAssetsUp/Down`, `toSharesUp/Down` - Share/asset conversions with virtual amounts

### TypeScript
- Use `Address` from viem for Ethereum addresses
- Use `Hex` for encoded data
- Use `bigint` for all on-chain numerical values
- Config package must be built (`pnpm build:config`) before client can import from it

### Code Quality
- ESLint + Prettier for formatting
- Husky + lint-staged for pre-commit hooks

## How to Add a New Strategy

1. Create `apps/client/src/strategies/marketV1/<strategyName>/index.ts` implementing `Strategy`
2. Add strategy name to `StrategyName` type in `apps/config/src/types.ts`
3. Add case to `createStrategy` in `apps/client/src/strategies/factory.ts`
4. Export from `apps/client/src/strategies/index.ts`
5. Optionally add config in `apps/config/src/strategies/<strategyName>.ts` and export from `apps/config/src/strategies/index.ts`
6. Rebuild config: `pnpm build:config`

## Testing

- **Vitest** test runner
- Tests in `apps/client/test/vitest/`
- Strategy tests: `apps/client/test/vitest/strategies/`
- Execution tests: `apps/client/test/vitest/bot/`

## Environment Configuration

Per-chain environment variables in `.env` at repo root:

```bash
RPC_URL_<chainId>=https://...
REALLOCATOR_PRIVATE_KEY_<chainId>=0x...
VAULT_WHITELIST_<chainId>=0xVault1,0xVault2
EXECUTION_INTERVAL_<chainId>=10
```

Example for mainnet (chainId 1) and Base (chainId 8453):

```bash
RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/<key>
REALLOCATOR_PRIVATE_KEY_1=0x1234...
VAULT_WHITELIST_1=0xbeef...,0xdead...
EXECUTION_INTERVAL_1=10

RPC_URL_8453=https://mainnet.base.org
REALLOCATOR_PRIVATE_KEY_8453=0x5678...
VAULT_WHITELIST_8453=0xabcd...
EXECUTION_INTERVAL_8453=30
```
