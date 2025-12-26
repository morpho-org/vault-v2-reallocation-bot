import { describe, expect } from "vitest";
import { Address, Hex, parseUnits } from "viem";
import { mainnet } from "viem/chains";
import { readContract, writeContract } from "viem/actions";
import { test } from "../../setup.js";
import { morphoBlueAbi } from "../../abis/MorphoBlue.js";
import { vaultV2Abi } from "../../../abis/VaultV2.js";
import { adaptiveCurveIrmAbi } from "../../abis/AdaptiveCurveIrm.js";
import { WBTC, MORPHO, IRM } from "../../constants.js";
import { Range } from "@vault-v2-reallocation-bot/config";
import { rateToApy, getUtilization, percentToWad, WAD } from "../../../src/utils/maths.js";
import { abs, encodeReallocation, formatMarketStateV1 } from "../helpers.js";
import { ApyRange } from "../../../src/strategies/marketV1/apyRange/index.js";
import {
  setupVault,
  marketParams1,
  marketParams2,
  marketParams3,
  marketId1,
  marketId2,
  marketId3,
  prepareBorrow,
  borrow,
} from "../vaultSetup.js";
import { encodeMarketParamsV1 } from "../../../src/strategies/marketV1/utils.js";

const targetMarket1 = { min: 0.5, max: 2 };
const targetMarket2 = { min: 8, max: 12 };

const testConfig = {
  DEFAULT_APY_RANGE: { min: 2, max: 8 },
  vaultsDefaultApyRanges: {},
  marketsDefaultApyRanges: {
    [mainnet.id]: {
      [marketId1]: targetMarket1,
      [marketId2]: targetMarket2,
    },
  },
  ALLOW_IDLE_REALLOCATION: true,
};

type TestConfig = {
  ALLOW_IDLE_REALLOCATION: boolean;
  DEFAULT_APY_RANGE: Range;
  vaultsDefaultApyRanges: Record<number, Record<Address, Range>>;
  marketsDefaultApyRanges: Record<number, Record<Hex, Range>>;
};

class MinRatesTest extends ApyRange {
  private readonly config: TestConfig;

  constructor(testConfig: TestConfig) {
    super();
    this.config = testConfig;
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
}

describe("equilizeUtilizations strategy", () => {
  const strategy = new MinRatesTest(testConfig);

  const caps = parseUnits("100000", 6);

  const suppliedAmount = parseUnits("10000", 6);
  const collateralAmount = parseUnits("2", 8);
  const loanAmount = parseUnits("5000", 6);

  const tolerance = parseUnits("0.01", 16); // We accept errors on the rates up to 1 BP

  test.sequential("should equalize rates", async ({ client }) => {
    const { vault, adapter } = await setupVault(client, caps, 3n * suppliedAmount);

    // reallocate

    const firstAllocation = encodeReallocation({
      allocations: [
        {
          adapterAddress: adapter,
          data: encodeMarketParamsV1(marketParams1),
          assets: suppliedAmount,
        },
        {
          adapterAddress: adapter,
          data: encodeMarketParamsV1(marketParams2),
          assets: suppliedAmount,
        },
        {
          adapterAddress: adapter,
          data: encodeMarketParamsV1(marketParams3),
          assets: suppliedAmount,
        },
      ],
      deallocations: [],
    });

    await writeContract(client, {
      address: vault,
      abi: vaultV2Abi,
      functionName: "multicall",
      args: [firstAllocation],
    });

    /// Borrow

    await prepareBorrow(client, [{ address: WBTC, amount: 3n * collateralAmount }]);

    await borrow(client, [
      { marketParams: marketParams1, loanAmount, collateralAmount },
      { marketParams: marketParams2, loanAmount, collateralAmount },
      { marketParams: marketParams3, loanAmount, collateralAmount },
    ]);

    const [marketState1, marketState2, marketState3] = await Promise.all([
      readContract(client, {
        address: MORPHO,
        abi: morphoBlueAbi,
        functionName: "market",
        args: [marketId1],
      }),
      readContract(client, {
        address: MORPHO,
        abi: morphoBlueAbi,
        functionName: "market",
        args: [marketId2],
      }),
      readContract(client, {
        address: MORPHO,
        abi: morphoBlueAbi,
        functionName: "market",
        args: [marketId3],
      }),
    ]);

    const [marketState1RateAtTarget, marketState2RateAtTarget, marketState3RateAtTarget] =
      await Promise.all([
        readContract(client, {
          address: IRM,
          abi: adaptiveCurveIrmAbi,
          functionName: "rateAtTarget",
          args: [marketId1],
        }),
        readContract(client, {
          address: IRM,
          abi: adaptiveCurveIrmAbi,
          functionName: "rateAtTarget",
          args: [marketId2],
        }),
        readContract(client, {
          address: IRM,
          abi: adaptiveCurveIrmAbi,
          functionName: "rateAtTarget",
          args: [marketId3],
        }),
      ]);

    const vaultData = {
      vaultAddress: vault,
      totalAssets: 3n * suppliedAmount,
      idleAssets: 0n,
      marketsV1Data: {
        adapterAddress: adapter,
        markets: [
          {
            chainId: 1,
            id: marketId1 as Hex,
            params: marketParams1,
            state: formatMarketStateV1(marketState1),
            caps: {
              absolute: caps,
              relative: WAD,
            },
            vaultAssets: suppliedAmount,
            rateAtTarget: marketState1RateAtTarget,
          },
          {
            chainId: 1,
            id: marketId2 as Hex,
            params: marketParams2,
            state: formatMarketStateV1(marketState2),
            caps: {
              absolute: caps,
              relative: WAD,
            },
            vaultAssets: suppliedAmount,
            rateAtTarget: marketState2RateAtTarget,
          },
          {
            chainId: 1,
            id: marketId3 as Hex,
            params: marketParams3,
            state: formatMarketStateV1(marketState3),
            caps: {
              absolute: caps,
              relative: WAD,
            },
            vaultAssets: suppliedAmount,
            rateAtTarget: marketState3RateAtTarget,
          },
        ],
      },
    };

    const reallocationProposed = strategy.findReallocation(vaultData)!;

    await writeContract(client, {
      address: vault,
      abi: vaultV2Abi,
      functionName: "multicall",
      args: [encodeReallocation(reallocationProposed)],
    });

    const [
      marketState1PostReallocation,
      marketState2PostReallocation,
      marketState3PostReallocation,
    ] = await Promise.all([
      readContract(client, {
        address: MORPHO,
        abi: morphoBlueAbi,
        functionName: "market",
        args: [marketId1],
      }),
      readContract(client, {
        address: MORPHO,
        abi: morphoBlueAbi,
        functionName: "market",
        args: [marketId2],
      }),
      readContract(client, {
        address: MORPHO,
        abi: morphoBlueAbi,
        functionName: "market",
        args: [marketId3],
      }),
    ]);

    const [marketState1Rate, marketState2Rate] = await Promise.all([
      readContract(client, {
        address: IRM,
        abi: adaptiveCurveIrmAbi,
        functionName: "borrowRateView",
        args: [marketParams1, formatMarketStateV1(marketState1PostReallocation)],
      }),
      readContract(client, {
        address: IRM,
        abi: adaptiveCurveIrmAbi,
        functionName: "borrowRateView",
        args: [marketParams2, formatMarketStateV1(marketState2PostReallocation)],
      }),
    ]);

    // Market 1 should be at max apy
    expect(abs(rateToApy(marketState1Rate) - percentToWad(targetMarket1.max))).toBeLessThan(
      tolerance,
    );

    // Market 2 should be at min apy
    expect(abs(rateToApy(marketState2Rate) - percentToWad(targetMarket2.min))).toBeLessThan(
      tolerance,
    );

    // Market 3 should have not been touched (same utilization as before reallocation)
    expect(
      getUtilization(formatMarketStateV1(marketState3PostReallocation)) - WAD / 2n,
    ).toBeLessThan(tolerance);
  });
});
