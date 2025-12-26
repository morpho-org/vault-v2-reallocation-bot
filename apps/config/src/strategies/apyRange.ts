import { base, mainnet } from "viem/chains";

export type Range = {
  min: number;
  max: number;
};

export const DEFAULT_APY_RANGE = {
  min: 3,
  max: 8,
};

/**
 * If set to true, the bot might reallocate liquidity into the idle market if it's necessary to reach the target apy ranges.
 * If set to false, the bot will not reallocate liquidity into the idle market.
 */
export const ALLOW_IDLE_REALLOCATION = true;

export const vaultsDefaultApyRanges: Record<number, Record<string, Range>> = {
  [mainnet.id]: {
    "0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB": {
      min: 4,
      max: 6,
    },
    "0xBEeFFF209270748ddd194831b3fa287a5386f5bC": {
      min: 5,
      max: 7,
    },
  },
  [base.id]: {
    "0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A": {
      min: 4.25,
      max: 6.25,
    },
  },
};

export const marketsApyRanges: Record<number, Record<string, Range>> = {
  [mainnet.id]: {
    "0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49": {
      min: 5.25,
      max: 6.25,
    },
    "0x64d65c9a2d91c36d56fbc42d69e979335320169b3df63bf92789e2c8883fcc64": {
      min: 5.15,
      max: 6.15,
    },
  },
  [base.id]: {
    "0x52a2a376586d0775e3e80621facc464f6e96d81c8cb70fd461527dde195a079f": {
      min: 7,
      max: 8,
    },
    "0x1c21c59df9db44bf6f645d854ee710a8ca17b479451447e9f56758aee10a2fad": {
      min: 6,
      max: 7,
    },
  },
};

export const DEFAULT_MIN_APY_DELTA_BIPS = 25;

export const vaultsDefaultMinApsDeltaBips: Record<number, Record<string, number>> = {};

export const marketsMinApsDeltaBips: Record<number, Record<string, number>> = {};
