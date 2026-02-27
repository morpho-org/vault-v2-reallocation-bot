import { Account, Chain, Client, Transport, type Address, type Hex } from "viem";
import { readContract } from "viem/actions";
import { MarketId } from "@morpho-org/blue-sdk";
import { fetchMarket, fetchPosition } from "@morpho-org/blue-sdk-viem";
import type { MarketV1Data, VaultV2Data } from "./types";
import { marketV1CapId } from "./capsIds.js";
import { toAssetsDown } from "./maths.js";
import { morphoMarketV1AdapterV2Abi } from "../abis/MorphoMarketV1AdapterV2.js";
import { vaultV2Abi } from "../../abis/VaultV2.js";

export async function fetchVaultData(
  address: Address,
  client: Client<Transport, Chain, Account>,
): Promise<VaultV2Data> {
  const chainId = client.chain.id;

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

  const now = BigInt(Math.floor(Date.now() / 1000));

  // Fetch all market data in parallel
  const markets = await Promise.all(
    marketIds.map(async (id): Promise<MarketV1Data> => {
      const marketId = id as MarketId;

      // Fetch market data and adapter position in parallel using blue-sdk
      const [market, position] = await Promise.all([
        fetchMarket(marketId, client, {
          chainId,
          deployless: false,
        }),
        fetchPosition(adapterAddress, marketId, client, {
          chainId,
        }),
      ]);

      // Accrue interest to get up-to-date market state
      const accruedMarket = market.accrueInterest(now);

      const vaultAssets = toAssetsDown(
        position.supplyShares,
        accruedMarket.totalSupplyAssets,
        accruedMarket.totalSupplyShares,
      );

      const params = {
        loanToken: accruedMarket.params.loanToken,
        collateralToken: accruedMarket.params.collateralToken,
        oracle: accruedMarket.params.oracle,
        irm: accruedMarket.params.irm,
        lltv: accruedMarket.params.lltv,
      };

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

      return {
        chainId,
        id: id as Hex,
        params,
        state: {
          totalSupplyAssets: accruedMarket.totalSupplyAssets,
          totalSupplyShares: accruedMarket.totalSupplyShares,
          totalBorrowAssets: accruedMarket.totalBorrowAssets,
          totalBorrowShares: accruedMarket.totalBorrowShares,
          lastUpdate: accruedMarket.lastUpdate,
          fee: accruedMarket.fee,
        },
        caps: { absolute: BigInt(absoluteCap), relative: BigInt(relativeCap) },
        vaultAssets,
        rateAtTarget: accruedMarket.rateAtTarget ?? 0n,
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
