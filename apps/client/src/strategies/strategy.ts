import { MaybePromise } from "viem";

import { Reallocation, VaultV2Data } from "../utils/types";

/**
 * Strategies are used to find reallocations on a vault.
 * You might implement your own strategy that serves your needs.
 * All strategies must implement this interface.
 */
export interface Strategy {
  findReallocation(vaultData: VaultV2Data): MaybePromise<Reallocation | undefined>;
}
