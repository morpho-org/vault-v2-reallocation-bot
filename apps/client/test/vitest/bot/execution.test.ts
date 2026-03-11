import { parseUnits } from "viem";
import { describe, expect, vi, afterEach } from "vitest";
import { EquilizeUtilizations } from "../../../src/strategies/marketV1/equilizeUtilizations/index.js";
import { readContract, writeContract } from "viem/actions";
import { WBTC, MORPHO } from "../../constants.js";
import { morphoBlueAbi } from "../../abis/MorphoBlue.js";
import { vaultV2Abi } from "../../../abis/VaultV2.js";
import { ReallocationBot } from "../../../src/bot.js";
import { test } from "../../setup.js";
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
import { encodeReallocation, syncTimestamp } from "../helpers.js";
import { encodeMarketParamsV1 } from "../../../src/strategies/marketV1/utils.js";

describe("should test the reallocation execution", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  const strategy = new EquilizeUtilizations();

  const caps = parseUnits("100000", 6);

  const suppliedAmount = parseUnits("10000", 6);
  const collateralAmount = parseUnits("2", 8);

  const loanAmount1 = parseUnits("10000", 6);
  const loanAmount2 = parseUnits("5000", 6);
  const loanAmount3 = parseUnits("2000", 6);

  test.sequential("should equalize rates", async ({ client }) => {
    // setup vault and supply

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

    /// Supply collateral

    await prepareBorrow(client, [{ address: WBTC, amount: 3n * collateralAmount }]);

    await borrow(client, [
      { marketParams: marketParams1, loanAmount: loanAmount1, collateralAmount },
      { marketParams: marketParams2, loanAmount: loanAmount2, collateralAmount },
      { marketParams: marketParams3, loanAmount: loanAmount3, collateralAmount },
    ]);

    /// Equalize

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

    // first market is at 100% utilization
    expect(marketState1[2]).toBe(marketState1[0]);

    await syncTimestamp(client);

    const bot = new ReallocationBot(client, [vault], strategy);

    await bot.run();

    const newMarketState1 = await readContract(client, {
      address: MORPHO,
      abi: morphoBlueAbi,
      functionName: "market",
      args: [marketId1],
    });

    // first market should not be at 100% utilization after reallocation
    expect(newMarketState1[2]).not.toBe(newMarketState1[0]);
  });
});
