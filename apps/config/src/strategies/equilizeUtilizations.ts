import { base, mainnet } from "viem/chains";
import { MUSCADINE_VAULTS } from "../config";

export const DEFAULT_MIN_UTILIZATION_DELTA_BIPS = 250;
export const DEFAULT_MIN_APR_DELTA_BIPS = 0;

/**
 * Per-vault utilization thresholds.
 * All Muscadine vaults are listed so flipping a vault onto this strategy in
 * config.ts already has a threshold ready (no missing-key fallback surprise).
 */
export const vaultsMinUtilizationDeltaBips: Record<number, Record<string, number>> = {
  [mainnet.id]: {
    "0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB": 300,
  },
  [base.id]: {
    "0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A": 100,
    // Muscadine — all vaults (200 bips = 2%)
    [MUSCADINE_VAULTS.USDC_PRIME]: 200,
    [MUSCADINE_VAULTS.WETH_PRIME]: 200,
    [MUSCADINE_VAULTS.CBBTC_PRIME]: 200,
    [MUSCADINE_VAULTS.USDC_FRONTIER]: 200,
    [MUSCADINE_VAULTS.CBBTC_TEST]: 200,
    [MUSCADINE_VAULTS.USDC_TEST]: 200,
  },
};

export const vaultsMinAprDeltaBips: Record<number, Record<string, number>> = {};
