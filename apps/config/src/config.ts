import { base, Chain, mainnet } from "viem/chains";
import { StrategyName } from "./types";

export const chains: { chain: Chain; strategy: StrategyName }[] = [
  { chain: mainnet, strategy: "equilizeUtilizations" },
  { chain: base, strategy: "equilizeUtilizations" },
];
