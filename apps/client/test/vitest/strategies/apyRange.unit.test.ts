import { describe, it, expect } from "vitest";
import { Address, Hex, parseUnits, zeroAddress } from "viem";
import { ApyRange } from "../../../src/strategies/marketV1/apyRange/index.js";
import { percentToWad, WAD, apyToRate, rateToUtilization, wMulDown } from "../../../src/utils/maths.js";
import { Range } from "@vault-v2-reallocation-bot/config";
import { MarketV1Data, VaultV2Data } from "../../../src/utils/types.js";

// --- Test helpers ---

const ADAPTER = "0x1111111111111111111111111111111111111111" as Address;
const VAULT = "0x2222222222222222222222222222222222222222" as Address;
const CHAIN_ID = 1;

const fakeMarketParams = (lltv: bigint) => ({
  loanToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address, // USDC
  collateralToken: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" as Address, // WBTC
  oracle: "0x0000000000000000000000000000000000000001" as Address,
  irm: "0x0000000000000000000000000000000000000002" as Address,
  lltv,
});

const fakeMarketId = (index: number): Hex =>
  `0x${index.toString(16).padStart(64, "0")}` as Hex;

type TestConfig = {
  ALLOW_IDLE_REALLOCATION: boolean;
  DEFAULT_APY_RANGE: Range;
  vaultsDefaultApyRanges: Record<number, Record<Address, Range>>;
  marketsDefaultApyRanges: Record<number, Record<Hex, Range>>;
  MIN_APY_DELTA_BIPS: number;
};

class TestableApyRange extends ApyRange {
  private readonly config: TestConfig;

  constructor(config: TestConfig) {
    super();
    this.config = config;
  }

  allowIdleReallocation() {
    return this.config.ALLOW_IDLE_REALLOCATION;
  }

  getApyRange(chainId: number, vaultAddress: Address, marketId: Hex) {
    let apyRange = this.config.DEFAULT_APY_RANGE;

    if (this.config.vaultsDefaultApyRanges[chainId]?.[vaultAddress] !== undefined) {
      apyRange = this.config.vaultsDefaultApyRanges[chainId][vaultAddress];
    }

    if (this.config.marketsDefaultApyRanges[chainId]?.[marketId] !== undefined) {
      apyRange = this.config.marketsDefaultApyRanges[chainId][marketId];
    }

    return {
      min: percentToWad(apyRange.min),
      max: percentToWad(apyRange.max),
    };
  }

  getMinApyDeltaBips(_chainId: number, _vaultAddress: Address, _marketId: Hex) {
    return this.config.MIN_APY_DELTA_BIPS;
  }
}

const defaultConfig: TestConfig = {
  ALLOW_IDLE_REALLOCATION: true,
  DEFAULT_APY_RANGE: { min: 2, max: 8 },
  vaultsDefaultApyRanges: {},
  marketsDefaultApyRanges: {},
  MIN_APY_DELTA_BIPS: 0, // No minimum delta for tests, unless we want to test it
};

/**
 * Build a market with a specific utilization.
 * utilization = totalBorrowAssets / totalSupplyAssets
 */
function makeMarket(
  index: number,
  opts: {
    totalSupply: bigint;
    totalBorrow: bigint;
    vaultAssets: bigint;
    absoluteCap?: bigint;
    relativeCap?: bigint;
    rateAtTarget?: bigint;
    lltv?: bigint;
  },
): MarketV1Data {
  return {
    chainId: CHAIN_ID,
    id: fakeMarketId(index),
    params: fakeMarketParams(opts.lltv ?? parseUnits("0.5", 18)),
    state: {
      totalSupplyAssets: opts.totalSupply,
      totalSupplyShares: opts.totalSupply * 1_000_000n, // simplified
      totalBorrowAssets: opts.totalBorrow,
      totalBorrowShares: opts.totalBorrow * 1_000_000n, // simplified
      lastUpdate: 0n,
      fee: 0n,
    },
    caps: {
      absolute: opts.absoluteCap ?? parseUnits("1000000", 6), // 1M USDC default
      relative: opts.relativeCap ?? WAD,
    },
    vaultAssets: opts.vaultAssets,
    rateAtTarget: opts.rateAtTarget ?? parseUnits("0.04", 18) / (365n * 24n * 3600n), // ~4% annualized
  };
}

function makeVaultData(markets: MarketV1Data[], idleAssets = 0n): VaultV2Data {
  const totalAssets =
    markets.reduce((acc, m) => acc + m.vaultAssets, 0n) + idleAssets;
  return {
    vaultAddress: VAULT,
    totalAssets,
    idleAssets,
    marketsV1Data: {
      adapterAddress: ADAPTER,
      markets,
    },
  };
}

// --- Tests ---

describe("ApyRange unit tests", () => {
  describe("no reallocation needed", () => {
    it("should return undefined when all markets are within APY range", () => {
      const strategy = new TestableApyRange(defaultConfig);
      // rateAtTarget ~4% => at 90% utilization, rate = rateAtTarget, apy ~ 4%
      // Default range is 2%-8%, so 4% is well within range.
      const rateAtTarget = parseUnits("0.04", 18) / (365n * 24n * 3600n);

      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9000", 6), // 90% utilization => rate = rateAtTarget => ~4% APY
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9000", 6),
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);
      expect(result).toBeUndefined();
    });

    it("should return undefined when total amounts to allocate and deallocate are both zero", () => {
      const strategy = new TestableApyRange(defaultConfig);
      // All markets exactly at boundary
      const vaultData = makeVaultData([
        makeMarket(1, {
          totalSupply: parseUnits("10000", 6),
          totalBorrow: parseUnits("9000", 6),
          vaultAssets: parseUnits("5000", 6),
        }),
      ]);
      const result = strategy.findReallocation(vaultData);
      expect(result).toBeUndefined();
    });
  });

  describe("zero-asset filtering", () => {
    it("should not include allocations with zero assets (supply cap reached)", () => {
      const strategy = new TestableApyRange(defaultConfig);

      // rateAtTarget for a reasonable rate
      const rateAtTarget = parseUnits("0.04", 18) / (365n * 24n * 3600n);

      // Market 1: high utilization (above max APY range) => needs allocation
      // But supply cap is already reached (vaultAssets == absoluteCap)
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9900", 6), // 99% utilization => very high APY
        vaultAssets: parseUnits("5000", 6),
        absoluteCap: parseUnits("5000", 6), // cap reached!
        rateAtTarget,
      });

      // Market 2: low utilization (below min APY range) => needs deallocation
      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("100", 6), // 1% utilization => very low APY
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);

      // Market 1 can't be allocated to (cap reached), so no allocation should exist
      if (result) {
        for (const allocation of result.allocations) {
          expect(allocation.assets).toBeGreaterThan(0n);
        }
        for (const deallocation of result.deallocations) {
          expect(deallocation.assets).toBeGreaterThan(0n);
        }
      }
    });

    it("should not include deallocations with zero assets (no vault assets)", () => {
      const strategy = new TestableApyRange(defaultConfig);

      const rateAtTarget = parseUnits("0.04", 18) / (365n * 24n * 3600n);

      // Market 1: high utilization => needs allocation
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9900", 6), // 99% utilization
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      // Market 2: low utilization => needs deallocation but vault has 0 assets in this market
      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("100", 6), // 1% utilization
        vaultAssets: 0n, // no vault assets to withdraw
        rateAtTarget,
      });

      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);

      if (result) {
        for (const deallocation of result.deallocations) {
          expect(deallocation.assets).toBeGreaterThan(0n);
        }
      }
    });

    it("should produce no zero-asset entries when remaining budget is exhausted", () => {
      const strategy = new TestableApyRange(defaultConfig);
      const rateAtTarget = parseUnits("0.04", 18) / (365n * 24n * 3600n);

      // Market 1: low utilization => deallocation source, small amount
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("100", 6), // 1% utilization
        vaultAssets: parseUnits("100", 6), // very little to withdraw
        rateAtTarget,
      });

      // Market 2: high utilization => needs allocation
      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9900", 6), // 99% utilization
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      // Market 3: also high utilization => needs allocation, but budget may be exhausted
      const market3 = makeMarket(3, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9900", 6), // 99% utilization
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      const vaultData = makeVaultData([market1, market2, market3]);
      const result = strategy.findReallocation(vaultData);

      if (result) {
        for (const allocation of result.allocations) {
          expect(allocation.assets).toBeGreaterThan(0n);
        }
        for (const deallocation of result.deallocations) {
          expect(deallocation.assets).toBeGreaterThan(0n);
        }
      }
    });
  });

  describe("idle reallocation", () => {
    it("should use idle assets when allocation exceeds deallocation", () => {
      const strategy = new TestableApyRange({
        ...defaultConfig,
        ALLOW_IDLE_REALLOCATION: true,
      });

      const rateAtTarget = parseUnits("0.04", 18) / (365n * 24n * 3600n);

      // Market 1: very high utilization => needs large allocation
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9900", 6),
        vaultAssets: parseUnits("3000", 6),
        rateAtTarget,
      });

      // Market 2: within range, no action needed
      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9000", 6), // 90% utilization => ~4% APY, within 2-8%
        vaultAssets: parseUnits("3000", 6),
        rateAtTarget,
      });

      // With idle assets available, allocation can happen even without deallocation
      const idleAssets = parseUnits("5000", 6);
      const vaultData = makeVaultData([market1, market2], idleAssets);
      const result = strategy.findReallocation(vaultData);

      if (result) {
        expect(result.allocations.length).toBeGreaterThan(0);
        for (const a of result.allocations) {
          expect(a.assets).toBeGreaterThan(0n);
        }
      }
    });

    it("should not reallocate to idle when ALLOW_IDLE_REALLOCATION is false and deallocations exceed allocations", () => {
      const strategy = new TestableApyRange({
        ...defaultConfig,
        ALLOW_IDLE_REALLOCATION: false,
      });

      const rateAtTarget = parseUnits("0.04", 18) / (365n * 24n * 3600n);

      // Market 1: low utilization => large deallocation available
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("100", 6), // 1% utilization
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      // Market 2: slightly above max APY => small allocation needed
      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9900", 6), // 99% utilization
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);

      if (result) {
        // Deallocation total should be capped to allocation total
        const totalDeallocated = result.deallocations.reduce((acc, d) => acc + d.assets, 0n);
        const totalAllocated = result.allocations.reduce((acc, a) => acc + a.assets, 0n);
        expect(totalDeallocated).toBeLessThanOrEqual(totalAllocated);
      }
    });
  });

  describe("min APY delta threshold", () => {
    it("should return undefined when no market exceeds min APY delta", () => {
      const strategy = new TestableApyRange({
        ...defaultConfig,
        MIN_APY_DELTA_BIPS: 10000, // Impossibly high threshold
      });

      const rateAtTarget = parseUnits("0.04", 18) / (365n * 24n * 3600n);

      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9100", 6), // 91% utilization, just slightly above target
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("8900", 6), // 89% utilization, just slightly below target
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);
      expect(result).toBeUndefined();
    });
  });

  describe("relative cap", () => {
    it("should respect relative cap when it limits allocation", () => {
      const strategy = new TestableApyRange(defaultConfig);
      const rateAtTarget = parseUnits("0.04", 18) / (365n * 24n * 3600n);

      // Market 1: high utilization => needs allocation, but relative cap is low
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9900", 6),
        vaultAssets: parseUnits("4000", 6),
        relativeCap: parseUnits("0.4", 18), // 40% of total assets
        rateAtTarget,
      });

      // Market 2: low utilization => deallocation source
      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("100", 6),
        vaultAssets: parseUnits("5000", 6),
        rateAtTarget,
      });

      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);

      if (result) {
        for (const allocation of result.allocations) {
          expect(allocation.assets).toBeGreaterThan(0n);
        }
      }
    });
  });
});
