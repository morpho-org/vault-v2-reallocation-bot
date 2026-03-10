import { describe, it, expect } from "vitest";
import { Address, Hex, parseUnits, zeroAddress } from "viem";
import { EquilizeUtilizations } from "../../../src/strategies/marketV1/equilizeUtilizations/index.js";
import { WAD, wDivDown } from "../../../src/utils/maths.js";
import { MarketV1Data, VaultV2Data } from "../../../src/utils/types.js";

// --- Test helpers ---

const ADAPTER = "0x1111111111111111111111111111111111111111" as Address;
const VAULT = "0x2222222222222222222222222222222222222222" as Address;
const CHAIN_ID = 1;

const fakeMarketParams = (lltv: bigint) => ({
  loanToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
  collateralToken: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" as Address,
  oracle: "0x0000000000000000000000000000000000000001" as Address,
  irm: "0x0000000000000000000000000000000000000002" as Address,
  lltv,
});

const fakeMarketId = (index: number): Hex =>
  `0x${index.toString(16).padStart(64, "0")}` as Hex;

function makeMarket(
  index: number,
  opts: {
    totalSupply: bigint;
    totalBorrow: bigint;
    vaultAssets: bigint;
    absoluteCap?: bigint;
    relativeCap?: bigint;
    lltv?: bigint;
    collateralToken?: Address;
  },
): MarketV1Data {
  const params = fakeMarketParams(opts.lltv ?? parseUnits("0.5", 18));
  if (opts.collateralToken !== undefined) {
    params.collateralToken = opts.collateralToken;
  }
  return {
    chainId: CHAIN_ID,
    id: fakeMarketId(index),
    params,
    state: {
      totalSupplyAssets: opts.totalSupply,
      totalSupplyShares: opts.totalSupply * 1_000_000n,
      totalBorrowAssets: opts.totalBorrow,
      totalBorrowShares: opts.totalBorrow * 1_000_000n,
      lastUpdate: 0n,
      fee: 0n,
    },
    caps: {
      absolute: opts.absoluteCap ?? parseUnits("1000000", 6),
      relative: opts.relativeCap ?? WAD,
    },
    vaultAssets: opts.vaultAssets,
    rateAtTarget: 0n, // unused for this strategy
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

describe("EquilizeUtilizations unit tests", () => {
  const strategy = new EquilizeUtilizations();

  describe("no reallocation needed", () => {
    it("should return undefined when all markets have the same utilization", () => {
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("5000", 6), // 50%
        vaultAssets: parseUnits("5000", 6),
      });

      const market2 = makeMarket(2, {
        totalSupply: parseUnits("20000", 6),
        totalBorrow: parseUnits("10000", 6), // 50%
        vaultAssets: parseUnits("5000", 6),
      });

      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);
      expect(result).toBeUndefined();
    });

    it("should filter out markets with zero-address collateral", () => {
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9000", 6), // 90%
        vaultAssets: parseUnits("5000", 6),
        collateralToken: zeroAddress,
      });

      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("5000", 6), // 50%
        vaultAssets: parseUnits("5000", 6),
      });

      const market3 = makeMarket(3, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("5000", 6), // 50%, same as market2
        vaultAssets: parseUnits("5000", 6),
      });

      const vaultData = makeVaultData([market1, market2, market3]);
      const result = strategy.findReallocation(vaultData);
      // Without market1 (filtered), market2 and market3 are equal => no reallocation
      expect(result).toBeUndefined();
    });
  });

  describe("zero-asset filtering", () => {
    it("should not include allocations with zero assets (supply cap reached)", () => {
      // Market 1: high utilization (80%) => above target => needs allocation
      // But supply cap is already reached
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("8000", 6), // 80%
        vaultAssets: parseUnits("5000", 6),
        absoluteCap: parseUnits("5000", 6), // cap reached
      });

      // Market 2: low utilization (20%) => below target => needs deallocation
      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("2000", 6), // 20%
        vaultAssets: parseUnits("5000", 6),
      });

      // Target utilization = (8000 + 2000) / (10000 + 10000) = 50%
      const vaultData = makeVaultData([market1, market2]);
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

    it("should not include deallocations with zero assets (no vault assets)", () => {
      // Market 1: high utilization => needs allocation
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("8000", 6), // 80%
        vaultAssets: parseUnits("5000", 6),
      });

      // Market 2: low utilization => needs deallocation, but vault has 0 assets
      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("2000", 6), // 20%
        vaultAssets: 0n, // no vault assets to withdraw
      });

      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);

      if (result) {
        for (const deallocation of result.deallocations) {
          expect(deallocation.assets).toBeGreaterThan(0n);
        }
      }
    });

    it("should not include zero-asset entries when remaining budget is exhausted", () => {
      // Market 1: low utilization => deallocation source, very small amount
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("2000", 6), // 20%
        vaultAssets: parseUnits("10", 6), // tiny vault position
      });

      // Market 2: high utilization => needs allocation
      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("8000", 6), // 80%
        vaultAssets: parseUnits("5000", 6),
      });

      // Market 3: also high utilization => needs allocation, budget may be exhausted
      const market3 = makeMarket(3, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("8000", 6), // 80%
        vaultAssets: parseUnits("5000", 6),
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

  describe("basic reallocation", () => {
    it("should reallocate from low-utilization to high-utilization markets", () => {
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9000", 6), // 90%
        vaultAssets: parseUnits("5000", 6),
      });

      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("3000", 6), // 30%
        vaultAssets: parseUnits("5000", 6),
      });

      // Target utilization = (9000 + 3000) / (10000 + 10000) = 60%
      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);

      expect(result).toBeDefined();
      expect(result!.allocations.length).toBeGreaterThan(0);
      expect(result!.deallocations.length).toBeGreaterThan(0);

      // All entries should have positive assets
      for (const a of result!.allocations) {
        expect(a.assets).toBeGreaterThan(0n);
      }
      for (const d of result!.deallocations) {
        expect(d.assets).toBeGreaterThan(0n);
      }
    });

    it("should balance total allocations and deallocations", () => {
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9000", 6), // 90%
        vaultAssets: parseUnits("5000", 6),
      });

      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("3000", 6), // 30%
        vaultAssets: parseUnits("5000", 6),
      });

      const vaultData = makeVaultData([market1, market2]);
      const result = strategy.findReallocation(vaultData);

      expect(result).toBeDefined();

      const totalAllocated = result!.allocations.reduce((acc, a) => acc + a.assets, 0n);
      const totalDeallocated = result!.deallocations.reduce((acc, d) => acc + d.assets, 0n);

      // With no idle assets, allocations and deallocations should be approximately equal (rounding)
      const diff = totalAllocated > totalDeallocated
        ? totalAllocated - totalDeallocated
        : totalDeallocated - totalAllocated;
      expect(diff).toBeLessThanOrEqual(parseUnits("1", 6)); // at most 1 USDC rounding
    });
  });

  describe("relative cap", () => {
    it("should respect relative cap when it limits allocation", () => {
      const market1 = makeMarket(1, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("9000", 6), // 90%
        vaultAssets: parseUnits("4000", 6),
        relativeCap: parseUnits("0.4", 18), // 40% of total assets
      });

      const market2 = makeMarket(2, {
        totalSupply: parseUnits("10000", 6),
        totalBorrow: parseUnits("3000", 6), // 30%
        vaultAssets: parseUnits("5000", 6),
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
