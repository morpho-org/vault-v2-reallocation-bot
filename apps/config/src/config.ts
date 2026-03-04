import { base, Chain, mainnet } from "viem/chains";
import { StrategyName } from "./types";

export const chains: { chain: Chain; strategy: StrategyName }[] = [
  { chain: mainnet, strategy: "equilizeUtilizations" },
  { chain: base, strategy: "equilizeUtilizations" },
];

// When supplying into a market, the bot targets this percentage of the cap instead of the full cap,
// to avoid hitting the exact cap limit. Defaults to 99.99%.
export const CAP_BUFFER_PERCENT = 99.99;
