import nock from "nock";
import { parseUnits } from "viem";
import { describe, expect } from "vitest";
import { EquilizeUtilizations } from "../../../src/strategies/marketV1/equilizeUtilizations/index.js";
import { readContract, writeContract } from "viem/actions";
import { WBTC, MORPHO } from "../../constants.js";
import { morphoBlueAbi } from "../../abis/MorphoBlue.js";
import { vaultV2Abi } from "../../../abis/VaultV2.js";
import { ReallocationBot } from "../../../src/bot.js";
import { test } from "../../setup.js";
import type {
  GetVaultsV2BasicDataQuery,
  GetMarketV1AdapterPositionsQuery,
} from "../../../src/api/types.js";
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
import { encodeReallocation } from "../helpers.js";
import { encodeMarketParamsV1 } from "../../../src/strategies/marketV1/utils.js";

describe("should test the reallocation execution", () => {
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

    // Calculate total assets and idle assets
    const totalAssets = 3n * suppliedAmount;
    const idleAssets = 0n; // All allocated

    // Mock getVaultsV2BasicData query
    const vaultV2BasicDataResponse = {
      vaultV2ByAddress: {
        adapters: {
          items: [
            {
              address: adapter,
              type: "MorphoMarketV1" as const,
            },
          ],
        },
        totalAssets: totalAssets.toString(),
        idleAssets: idleAssets.toString(),
      },
    } as unknown as GetVaultsV2BasicDataQuery;

    // Mock GetMarketV1AdapterPositions query
    const marketV1AdapterPositionsResponse = {
      marketPositions: {
        items: [
          {
            state: {
              supplyAssets: suppliedAmount.toString(),
            },
            market: {
              uniqueKey: marketId1 as any,
              collateralAsset: {
                address: marketParams1.collateralToken,
              },
              loanAsset: {
                address: marketParams1.loanToken,
              },
              oracle: {
                address: marketParams1.oracle,
              },
              irmAddress: marketParams1.irm,
              lltv: marketParams1.lltv.toString(),
              state: {
                supplyAssets: marketState1[0].toString(),
                supplyShares: marketState1[1].toString(),
                borrowAssets: marketState1[2].toString(),
                borrowShares: marketState1[3].toString(),
                rateAtTarget: "0",
                fee: Number(marketState1[5]),
                timestamp: marketState1[4].toString(),
              },
            },
          },
          {
            state: {
              supplyAssets: suppliedAmount.toString(),
            },
            market: {
              uniqueKey: marketId2 as any,
              collateralAsset: {
                address: marketParams2.collateralToken,
              },
              loanAsset: {
                address: marketParams2.loanToken,
              },
              oracle: {
                address: marketParams2.oracle,
              },
              irmAddress: marketParams2.irm,
              lltv: marketParams2.lltv.toString(),
              state: {
                supplyAssets: marketState2[0].toString(),
                supplyShares: marketState2[1].toString(),
                borrowAssets: marketState2[2].toString(),
                borrowShares: marketState2[3].toString(),
                rateAtTarget: "0",
                fee: Number(marketState2[5]),
                timestamp: marketState2[4].toString(),
              },
            },
          },
          {
            state: {
              supplyAssets: suppliedAmount.toString(),
            },
            market: {
              uniqueKey: marketId3 as any,
              collateralAsset: {
                address: marketParams3.collateralToken,
              },
              loanAsset: {
                address: marketParams3.loanToken,
              },
              oracle: {
                address: marketParams3.oracle,
              },
              irmAddress: marketParams3.irm,
              lltv: marketParams3.lltv.toString(),
              state: {
                supplyAssets: marketState3[0].toString(),
                supplyShares: marketState3[1].toString(),
                borrowAssets: marketState3[2].toString(),
                borrowShares: marketState3[3].toString(),
                rateAtTarget: "0",
                fee: Number(marketState3[5]),
                timestamp: marketState3[4].toString(),
              },
            },
          },
        ],
      },
    } as unknown as GetMarketV1AdapterPositionsQuery;

    // Mock GraphQL POST requests to Blue API
    nock("https://api.morpho.org")
      .persist()
      .post("/graphql", (body) => {
        try {
          const parsedBody =
            typeof body === "string"
              ? JSON.parse(body)
              : body instanceof Buffer
                ? JSON.parse(body.toString())
                : body;
          const bodyStr =
            typeof body === "string"
              ? body
              : body instanceof Buffer
                ? body.toString()
                : JSON.stringify(body);

          // Match the getVaultsV2BasicData query
          if (
            (parsedBody.operationName === "getVaultsV2BasicData" ||
              bodyStr.includes("getVaultsV2BasicData")) &&
            (parsedBody.variables?.chainId === client.chain.id ||
              bodyStr.includes(`"chainId":${client.chain.id}`)) &&
            (parsedBody.variables?.address === vault || bodyStr.includes(`"address":"${vault}"`))
          ) {
            return true;
          }

          // Match the GetMarketV1AdapterPositions query
          if (
            (parsedBody.operationName === "GetMarketV1AdapterPositions" ||
              bodyStr.includes("GetMarketV1AdapterPositions")) &&
            (parsedBody.variables?.chainId === client.chain.id ||
              bodyStr.includes(`"chainId":${client.chain.id}`)) &&
            (parsedBody.variables?.address === adapter ||
              bodyStr.includes(`"address":"${adapter}"`))
          ) {
            return true;
          }

          return false;
        } catch {
          return false;
        }
      })
      .reply(200, (uri, requestBody) => {
        try {
          const parsedBody =
            typeof requestBody === "string"
              ? JSON.parse(requestBody)
              : requestBody instanceof Buffer
                ? JSON.parse(requestBody.toString())
                : requestBody;
          const bodyStr =
            typeof requestBody === "string"
              ? requestBody
              : requestBody instanceof Buffer
                ? requestBody.toString()
                : JSON.stringify(requestBody);

          // Return appropriate response based on which query was matched
          if (
            parsedBody.operationName === "getVaultsV2BasicData" ||
            bodyStr.includes("getVaultsV2BasicData")
          ) {
            return { data: vaultV2BasicDataResponse };
          }

          if (
            parsedBody.operationName === "GetMarketV1AdapterPositions" ||
            bodyStr.includes("GetMarketV1AdapterPositions")
          ) {
            return { data: marketV1AdapterPositionsResponse };
          }

          return { data: {} };
        } catch {
          return { data: {} };
        }
      });

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
