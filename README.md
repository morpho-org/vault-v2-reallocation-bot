# Vault v2 Reallocation Bot

A simple, fast, and easily deployable reallocation bot for the **Morpho Vaults v2**. This bot is entirely based on **RPC calls** and is designed to automate Morpho vaults v1 reallocations according customable strategies.

## Features

- Automatically rebalances assets within vaults v2 to maintain capital efficiency
- Equalizes utilization rates across markets
- Multi-chain compatible (Ethereum, Base, and more)
- Configurable minimum threshold for utilization changes (2.5% by default)

## Assumptions

This is the v0 of the bot, so it makes strong assumptions about the vaults' configuration:

- Vaults are expected to have only one adapter, which must be a [MorphoMarketV1AdapterV2](https://github.com/morpho-org/vault-v2/blob/main/src/adapters/MorphoMarketV1AdapterV2.sol).
- Vaults are expected to have meaningful caps only at the market V1 level. Caps on collaterals or on the adapter should be maxed (or very high), as the vault won't consider them reachable.

These constraints will be removed in future versions as more adapters are whitelisted by the Morpho Registry List.

### ⚠️ Disclaimer

This bot is provided as-is, without any warranty. The **Morpho Association is not responsible** for any potential loss of funds resulting from the use of this bot, including (but not limited to) gas fees, failed transactions, or reallocations on malicious or misconfigured markets.

Use at your own risk.

## Requirements

- Node.js >= 20
- [pnpm](https://pnpm.io/) (this repo uses `pnpm` as package manager)
- A valid RPC URL (via Alchemy, Infura, etc)
- The private key of an EOA with enough funds to pay for gas

## Installation

```bash
git clone https://github.com/morpho-org/morpho-blue-reallocation-bot.git
cd morpho-blue-reallocation-bot
pnpm install
```

## Chain Configuration

The bot can be configured to run on any EVM-compatible chain where the Morpho v2 stack has been deployed. Chain configuration is done in the `apps/config/config.ts` file.

In this file, you'll define an array of chain configurations. Each entry specifies:

- The chain to run the bot on
- The strategy to use for that chain

You can use different strategies for different chains. For example:

```typescript
export const chains: { chain: Chain; strategy: StrategyName }[] = [
  { chain: mainnet, strategy: "equilizeUtilizations" },
  { chain: base, strategy: "apyRange" },
];
```

### Secrets

**Chain secrets:**

For each chain, the following secrets must be set:

- `RPC_URL`: The RPC URL of the chain that will be used by the bot.
- `REALLOCATOR_PRIVATE_KEY`: The private key of the EOA that will be used to execute the reallocations. This EAO must have the allocator role of all curated vaults.

**Vault Whitelist**: The bot will only rebalance assets within vaults that are whitelisted:

- `VAULT_WHITELIST`: List of vaults addresses.

**Execution Interval**: The bot will run once every N minutes, with this value as N:

- `EXECUTION_INTERVAL`: Minutes to wait between runs.

The secrets must be set in the `.env` file at the root of the repository, with the following keys:

- `RPC_URL_<chainId>`
- `REALLOCATOR_PRIVATE_KEY_<chainId>`
- `VAULT_WHITELIST_<chainId>`
- `EXECUTION_INTERVAL_<chainId>`

Example for mainnet (chainId 1):

```
RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/<your-alchemy-api-key>
REALLOCATOR_PRIVATE_KEY_1=0x1234567890123456789012345678901234567890123456789012345678901234
VAULT_WHITELIST_1=0xbeef0046fcab1dE47E41fB75BB3dC4Dfc94108E3,0xbeef003C68896c7D2c3c60d363e8d71a49Ab2bf9
EXECUTION_INTERVAL_1=10
```

### Strategies config

Some strategies require some chains and vaults specific configutation.
This configuration is handled in the `apps/config/src/strategies` folder, which contains the config files of every configurable strategies.

## Reallocation Strategy

This strategy:

1. Calculates a target utilization rate across all markets within a vault
2. Identifies markets with higher-than-target and lower-than-target utilization
3. Determines optimal withdrawals and deposits to balance utilization rates
4. Only executes reallocations when the utilization delta exceeds a minimum threshold (2.5% by default)

## Apy Range Strategy

This strategy tries to keep vaults listed markets borrow APY within the ranges defined in `apps/config/src/strategies/apyRange.ts`.
Ranges can be defined at the global level, at the vaults level, or/and at the markets level.

## Add Your strategy

**If you don't plan on supporting a new pricer venue, you can ignore this section.**

To add your own strategy, you need to create a new folder in the `apps/client/src/strategy` folder, named after your strategy.
This folder should contain one `index.ts` file. In this file you will implement the new strategy class that needs to implements the `Strategy` interface (located in `apps/client/src/strategies/strategy.ts`).
This class will contain the logic of the strategy, and needs to export one method: `findReallocation`(Returns a `Reallocation` typed object). This methods can be async.

Next, you'll need to:

1. Update the `StrategyName` type in `apps/config/src/types.ts` by adding your strategy name to it.
2. Update the `createStrategy` function in `apps/client/src/strategies/factory.ts` to include your strategy.
3. Update the exports in `apps/client/src/strategies/index.ts` to include your strategy.

Additionally:

- If your strategy requires vault, chain, or other specific configuration, add a configuration file named after your strategy in the `apps/config/src/strategies` folder.
- If your strategy requires any ABIs, add them to a new file in the `apps/client/src/abis` folder.

## Run the bot

Once the bot is installed and configured, you can run it by executing the following command:

```bash
pnpm reallocate
```

This command will start the bot.
