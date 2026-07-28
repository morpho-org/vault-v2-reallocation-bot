import { type Address, type Chain } from "viem";
import { base, mainnet } from "viem/chains";
import { StrategyName } from "./types";

/**
 * Muscadine Vault v2 addresses on Base (8453).
 * Source: Muscadine-Labs/curator `lib/config/vaults.ts`
 */
export const MUSCADINE_VAULTS = {
  USDC_PRIME: "0x89712980Cb434eF5aE4AB29349419eb976B0b496",
  WETH_PRIME: "0xD6DCAd2f7Da91FBb27BdA471540d9770c97a5a43",
  CBBTC_PRIME: "0x99dcd0D75822BA398F13B2A8852B07c7e137EC70",
  USDC_FRONTIER: "0x314fD07319ef645bA7D548915CCd91F4788A1839",
  CBBTC_TEST: "0xB15a51F46a53CF7dBB378A459A552F342bC54815",
  USDC_TEST: "0x7D09D53637c8A3511de0eF1509b8dC5C2108a0AD",
} as const satisfies Record<string, Address>;

export interface ChainSettings {
  chain: Chain;
  strategy: StrategyName;
  vaultWhitelist: Address[];
  executionInterval: number; // minutes
}

export const chains: ChainSettings[] = [
  {
    chain: mainnet,
    strategy: "equilizeUtilizations",
    vaultWhitelist: [
      "0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB",
      "0x8eB67A509616cd6A7c1B3c8C21D48FF57df3d458",
    ],
    executionInterval: 900,
  },
  {
    chain: base,
    strategy: "equilizeUtilizations",
    vaultWhitelist: ["0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183"],
    executionInterval: 300,
  },
  // --- Muscadine (Base): one entry per vault so strategy/interval can diverge ---
  {
    chain: base,
    strategy: "equilizeUtilizations",
    vaultWhitelist: [MUSCADINE_VAULTS.USDC_PRIME],
    executionInterval: 512,
  },
  {
    chain: base,
    strategy: "equilizeUtilizations",
    vaultWhitelist: [MUSCADINE_VAULTS.WETH_PRIME],
    executionInterval: 512,
  },
  {
    chain: base,
    strategy: "equilizeUtilizations",
    vaultWhitelist: [MUSCADINE_VAULTS.CBBTC_PRIME],
    executionInterval: 512,
  },
  {
    chain: base,
    strategy: "apyRange",
    vaultWhitelist: [MUSCADINE_VAULTS.USDC_FRONTIER],
    executionInterval: 512,
  },
  {
    chain: base,
    strategy: "equilizeUtilizations",
    vaultWhitelist: [MUSCADINE_VAULTS.CBBTC_TEST],
    executionInterval: 512,
  },
  {
    chain: base,
    strategy: "equilizeUtilizations",
    vaultWhitelist: [MUSCADINE_VAULTS.USDC_TEST],
    executionInterval: 512,
  },
];

// When supplying into a market, the bot targets this percentage of the cap instead of the full cap,
// to avoid hitting the exact cap limit. Defaults to 99.99%.
export const CAP_BUFFER_PERCENT = 99.99;
