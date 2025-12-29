import type { StrategyName } from "@vault-v2-reallocation-bot/config";

import { ApyRange } from "./marketV1/apyRange";
import { EquilizeUtilizations } from "./marketV1/equilizeUtilizations";
import type { Strategy } from "./strategy";

/**
 * Creates a strategy instance based on the strategy name from config.
 * This factory function avoids circular dependencies by keeping strategy
 * class imports in the client package, while config only exports string identifiers.
 */
export function createStrategy(strategyName: StrategyName): Strategy {
  switch (strategyName) {
    case "equilizeUtilizations":
      return new EquilizeUtilizations();
    case "apyRange":
      return new ApyRange();
    default:
      throw new Error(`Unknown strategy: ${strategyName}`);
  }
}
