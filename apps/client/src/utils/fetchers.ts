import {
  Account,
  Chain,
  Client,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  Transport,
  type Address,
  type Hex,
} from "viem";

import { apiSdk } from "../api/index.js";
import type { Caps, MarketV1Data, VaultV2Data, VaultV2MarketV1Data } from "./types";
import { readContract } from "viem/actions";
import { vaultV2Abi } from "../../abis/VaultV2.js";
import { formatMarketV1CapId } from "./marketV1.js";

export async function fetchVaultData(
  address: Address,
  client: Client<Transport, Chain, Account>,
): Promise<VaultV2Data> {
  const { vaultV2ByAddress } = await apiSdk.getVaultsV2BasicData({
    chainId: client.chain.id,
    address,
  });

  const adapters = vaultV2ByAddress?.adapters?.items ?? [];
  const totalAssets = vaultV2ByAddress?.totalAssets ?? 0n;
  const idleAssets = vaultV2ByAddress?.idleAssets ?? 0n;

  const marketV1Adapter = adapters.find((adapter) => adapter.type === "MorphoMarketV1");

  if (!marketV1Adapter) {
    throw new Error("MarketV1Adapter not found");
  }

  const marketV1AdapterPositions = await apiSdk.GetMarketV1AdapterPositions({
    address: marketV1Adapter.address,
    chainId: client.chain.id,
  });

  if (!marketV1AdapterPositions.marketPositions?.items) {
    throw new Error("MarketV1AdapterPositions not found");
  }

  const marketsV1Data = {
    adapterAddress: marketV1Adapter.address,
    markets: await fetchMarketV1Data(address, marketV1Adapter.address, client),
  };

  return {
    vaultAddress: address,
    totalAssets: totalAssets,
    idleAssets: idleAssets,
    marketsV1Data: marketsV1Data,
  };
}

/// MARKET V1

async function fetchMarketV1Data(
  vaultAddress: Address,
  adapterAddress: Address,
  client: Client<Transport, Chain, Account>,
): Promise<MarketV1Data[]> {
  const marketV1AdapterPositions = await apiSdk.GetMarketV1AdapterPositions({
    address: adapterAddress,
    chainId: client.chain.id,
  });

  if (!marketV1AdapterPositions.marketPositions?.items) {
    throw new Error("MarketV1AdapterPositions not found");
  }

  return await Promise.all(
    marketV1AdapterPositions.marketPositions.items.map(async (position) => {
      return {
        chainId: client.chain.id,
        id: position.market.uniqueKey as Hex,
        params: {
          loanToken: position.market.loanAsset.address,
          collateralToken:
            position.market.collateralAsset?.address ??
            "0x0000000000000000000000000000000000000000",
          oracle: position.market.oracle?.address ?? "0x0000000000000000000000000000000000000000",
          irm: position.market.irmAddress,
          lltv: BigInt(position.market.lltv),
        },
        state: {
          totalSupplyAssets: BigInt(position.market.state?.supplyAssets ?? "0"),
          totalSupplyShares: BigInt(position.market.state?.supplyShares ?? "0"),
          totalBorrowAssets: BigInt(position.market.state?.borrowAssets ?? "0"),
          totalBorrowShares: BigInt(position.market.state?.borrowShares ?? "0"),
          lastUpdate: BigInt(position.market.state?.timestamp ?? "0"),
          fee: BigInt(position.market.state?.fee ?? "0"),
        },
        caps: await fetchMarketV1Caps(
          vaultAddress,
          position.market.uniqueKey as Hex,
          adapterAddress,
          client,
        ),
        vaultAssets: BigInt(position.state?.supplyAssets ?? "0"),
        rateAtTarget: BigInt(position.market.state?.rateAtTarget ?? "0"),
      };
    }),
  );
}

async function fetchMarketV1Caps(
  vaultAddress: Address,
  marketId: Hex,
  adapterAddress: Address,
  client: Client<Transport, Chain, Account>,
): Promise<Caps> {
  const capId = formatMarketV1CapId(marketId, adapterAddress);
  const [absoluteCap, relativeCap] = await Promise.all([
    readContract(client, {
      address: vaultAddress,
      abi: vaultV2Abi,
      functionName: "absoluteCap",
      args: [capId],
    }),
    readContract(client, {
      address: vaultAddress,
      abi: vaultV2Abi,
      functionName: "relativeCap",
      args: [capId],
    }),
  ]);

  return {
    absolute: absoluteCap,
    relative: relativeCap,
  };
}
