import { Account, Chain, Client, Transport, zeroAddress, type Address, type Hex } from "viem";
import { readContract } from "viem/actions";
import type { MarketV1Data, VaultV2Data } from "./types";
import { marketV1CapId } from "./capsIds.js";
import { toAssetsDown } from "./maths.js";
import { morphoBlueAbi } from "../abis/MorphoBlue.js";
import { adaptiveCurveIrmAbi } from "../abis/AdaptiveCurveIrm.js";
import { morphoMarketV1AdapterV2Abi } from "../abis/MorphoMarketV1AdapterV2.js";
import { vaultV2Abi } from "../../abis/VaultV2.js";

/** Morpho Blue singleton address (deterministic deployment, same on all chains). */
const MORPHO = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" as const;

export async function fetchVaultData(
  address: Address,
  client: Client<Transport, Chain, Account>,
): Promise<VaultV2Data> {
  // Get adapter address (assume single MorphoMarketV1 adapter at index 0)
  const adapterAddress = await readContract(client, {
    address,
    abi: vaultV2Abi,
    functionName: "adapters",
    args: [0n],
  });

  // Get total assets and market IDs length in parallel
  const [totalAssets, marketIdsLength] = await Promise.all([
    readContract(client, {
      address,
      abi: vaultV2Abi,
      functionName: "totalAssets",
    }),
    readContract(client, {
      address: adapterAddress,
      abi: morphoMarketV1AdapterV2Abi,
      functionName: "marketIdsLength",
    }),
  ]);

  // Fetch all market IDs from the adapter
  const marketIds = await Promise.all(
    Array.from({ length: Number(marketIdsLength) }, (_, i) =>
      readContract(client, {
        address: adapterAddress,
        abi: morphoMarketV1AdapterV2Abi,
        functionName: "marketIds",
        args: [BigInt(i)],
      }),
    ),
  );

  // Fetch all market data in parallel
  const markets = await Promise.all(
    marketIds.map(async (id): Promise<MarketV1Data> => {
      // Fetch market params, market state, and adapter position in parallel
      const [paramsResult, stateResult, positionResult] = await Promise.all([
        readContract(client, {
          address: MORPHO,
          abi: morphoBlueAbi,
          functionName: "idToMarketParams",
          args: [id],
        }),
        readContract(client, {
          address: MORPHO,
          abi: morphoBlueAbi,
          functionName: "market",
          args: [id],
        }),
        readContract(client, {
          address: MORPHO,
          abi: morphoBlueAbi,
          functionName: "position",
          args: [id, adapterAddress],
        }),
      ]);

      const params = {
        loanToken: paramsResult[0] as Address,
        collateralToken: paramsResult[1] as Address,
        oracle: paramsResult[2] as Address,
        irm: paramsResult[3] as Address,
        lltv: BigInt(paramsResult[4]),
      };

      const state = {
        totalSupplyAssets: BigInt(stateResult[0]),
        totalSupplyShares: BigInt(stateResult[1]),
        totalBorrowAssets: BigInt(stateResult[2]),
        totalBorrowShares: BigInt(stateResult[3]),
        lastUpdate: BigInt(stateResult[4]),
        fee: BigInt(stateResult[5]),
      };

      const supplyShares = BigInt(positionResult[0]);
      const vaultAssets = toAssetsDown(
        supplyShares,
        state.totalSupplyAssets,
        state.totalSupplyShares,
      );

      // Get caps using the computed cap id
      const capId = marketV1CapId(params, adapterAddress);
      const [absoluteCap, relativeCap] = await Promise.all([
        readContract(client, {
          address,
          abi: vaultV2Abi,
          functionName: "absoluteCap",
          args: [capId],
        }),
        readContract(client, {
          address,
          abi: vaultV2Abi,
          functionName: "relativeCap",
          args: [capId],
        }),
      ]);

      // Get rateAtTarget if the market uses an IRM (irm is not the zero address)
      let rateAtTarget = 0n;
      if (params.irm !== zeroAddress) {
        const rateAtTargetResult = await readContract(client, {
          address: params.irm,
          abi: adaptiveCurveIrmAbi,
          functionName: "rateAtTarget",
          args: [id],
        });
        rateAtTarget = BigInt(rateAtTargetResult);
      }

      return {
        chainId: client.chain.id,
        id: id as Hex,
        params,
        state,
        caps: { absolute: BigInt(absoluteCap), relative: BigInt(relativeCap) },
        vaultAssets,
        rateAtTarget,
      };
    }),
  );

  // Calculate idle assets: totalAssets minus sum of all market allocations
  const allocatedAssets = markets.reduce((acc, m) => acc + m.vaultAssets, 0n);
  const totalAssetsBigInt = BigInt(totalAssets);
  const idleAssets = totalAssetsBigInt > allocatedAssets ? totalAssetsBigInt - allocatedAssets : 0n;

  return {
    vaultAddress: address,
    totalAssets: totalAssetsBigInt,
    idleAssets,
    marketsV1Data: {
      adapterAddress,
      markets,
    },
  };
}
