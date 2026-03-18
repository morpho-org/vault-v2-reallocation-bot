import { type Address, type Chain } from "viem";
import { base, mainnet } from "viem/chains";
import { StrategyName } from "./types";

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
];

// When supplying into a market, the bot targets this percentage of the cap instead of the full cap,
// to avoid hitting the exact cap limit. Defaults to 99.99%.
export const CAP_BUFFER_PERCENT = 99.99;
