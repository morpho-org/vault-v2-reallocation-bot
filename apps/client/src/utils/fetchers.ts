import { Account, Chain, Client, Transport, type Address, type Hex } from "viem";
import { VaultV2CapType } from "@morpho-org/blue-api-sdk";
import { apiSdk } from "../api/index.js";
import type { MarketV1CapAPIData, MarketV1Data, VaultV2Data } from "./types";
import { decodeMarketV1CapIdData, marketV1CapId, marketV1UniqueKey } from "./capsIds.js";

export async function fetchVaultData(
  address: Address,
  client: Client<Transport, Chain, Account>,
): Promise<VaultV2Data> {
  const { vaultV2ByAddress } = await apiSdk.getVaultsV2BasicData({
    chainId: client.chain.id,
    address,
  });

  const marketV1Caps = (
    vaultV2ByAddress?.caps?.items?.filter((cap) => cap.type === VaultV2CapType.MarketV1) ?? []
  ).map((capItem) => {
    return {
      id: capItem.id,
      idData: capItem.idData,
      absoluteCap: BigInt(capItem.absoluteCap ?? "0"),
      relativeCap: BigInt(capItem.relativeCap ?? "0"),
    };
  });

  const adapters = vaultV2ByAddress?.adapters?.items ?? [];
  const totalAssets = BigInt(vaultV2ByAddress?.totalAssets ?? "0");
  const idleAssets = BigInt(vaultV2ByAddress?.idleAssets ?? "0");

  const marketV1Adapter = adapters.find((adapter) => adapter.type === "MorphoMarketV1");

  if (!marketV1Adapter) {
    throw new Error("MarketV1Adapter not found");
  }

  if (marketV1Caps.length === 0) {
    throw new Error("MarketV1 Caps not found");
  }

  const marketV1AdapterPositions = await apiSdk.getMarketV1AdapterPositions({
    address: marketV1Adapter.address,
    chainId: client.chain.id,
  });

  if (!marketV1AdapterPositions.marketPositions?.items) {
    throw new Error("MarketV1AdapterPositions not found");
  }

  const marketsV1Data = {
    adapterAddress: marketV1Adapter.address,
    markets: await fetchMarketV1Data(client, marketV1Adapter.address, marketV1Caps),
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
  client: Client<Transport, Chain, Account>,
  adapterAddress: Address,
  marketV1Caps: MarketV1CapAPIData[],
): Promise<MarketV1Data[]> {
  const markets = await getAdapterMarkets(client, adapterAddress, marketV1Caps);

  const missingCaps = marketV1Caps.filter(
    (cap) => !markets.some((market) => marketV1CapId(market.params, adapterAddress) === cap.id),
  );

  if (missingCaps.length > 0) {
    const missingMarkets = await getMissingMarketsData(
      client,
      missingCaps.map((cap) => {
        const { marketParams } = decodeMarketV1CapIdData(cap.idData);
        return marketV1UniqueKey(marketParams);
      }),
      adapterAddress,
      marketV1Caps,
    );
    return [...markets, ...missingMarkets];
  }

  return markets;
}

async function getAdapterMarkets(
  client: Client<Transport, Chain, Account>,
  adapterAddress: Address,
  marketV1Caps: MarketV1CapAPIData[],
): Promise<MarketV1Data[]> {
  const marketV1AdapterPositions = await apiSdk.getMarketV1AdapterPositions({
    address: adapterAddress,
    chainId: client.chain.id,
  });

  if (!marketV1AdapterPositions.marketPositions?.items) {
    throw new Error("MarketV1AdapterPositions not found");
  }

  return await Promise.all(
    marketV1AdapterPositions.marketPositions.items.map(async (position) => {
      const params = {
        loanToken: position.market.loanAsset.address,
        collateralToken:
          position.market.collateralAsset?.address ?? "0x0000000000000000000000000000000000000000",
        oracle: position.market.oracle?.address ?? "0x0000000000000000000000000000000000000000",
        irm: position.market.irmAddress,
        lltv: BigInt(position.market.lltv),
      };
      const caps = marketV1Caps.find((cap) => cap.id === marketV1CapId(params, adapterAddress)) ?? {
        absoluteCap: 0n,
        relativeCap: 0n,
      };
      return {
        chainId: client.chain.id,
        id: position.market.uniqueKey as Hex,
        params,
        state: {
          totalSupplyAssets: BigInt(position.market.state?.supplyAssets ?? "0"),
          totalSupplyShares: BigInt(position.market.state?.supplyShares ?? "0"),
          totalBorrowAssets: BigInt(position.market.state?.borrowAssets ?? "0"),
          totalBorrowShares: BigInt(position.market.state?.borrowShares ?? "0"),
          lastUpdate: BigInt(position.market.state?.timestamp ?? "0"),
          fee: BigInt(position.market.state?.fee ?? "0"),
        },
        caps: { absolute: caps.absoluteCap, relative: caps.relativeCap },
        vaultAssets: BigInt(position.state?.supplyAssets ?? "0"),
        rateAtTarget: BigInt(position.market.state?.rateAtTarget ?? "0"),
      };
    }),
  );
}

async function getMissingMarketsData(
  client: Client<Transport, Chain, Account>,
  ids: Hex[],
  adapterAddress: Address,
  marketV1Caps: MarketV1CapAPIData[],
): Promise<MarketV1Data[]> {
  const missingMarkets = await apiSdk.getMissingMarketsData({
    uniqueKeys: ids,
    chainId: client.chain.id,
  });

  if (!missingMarkets.markets?.items) {
    throw new Error("MissingMarkets not found");
  }

  return await Promise.all(
    missingMarkets.markets.items.map(async (market) => {
      const params = {
        loanToken: market.loanAsset.address,
        collateralToken:
          market.collateralAsset?.address ?? "0x0000000000000000000000000000000000000000",
        oracle: market.oracle?.address ?? "0x0000000000000000000000000000000000000000",
        irm: market.irmAddress,
        lltv: BigInt(market.lltv),
      };
      const caps = marketV1Caps.find((cap) => cap.id === marketV1CapId(params, adapterAddress)) ?? {
        absoluteCap: 0n,
        relativeCap: 0n,
      };
      return {
        chainId: client.chain.id,
        id: market.uniqueKey as Hex,
        params,
        state: {
          totalSupplyAssets: BigInt(market.state?.supplyAssets ?? "0"),
          totalSupplyShares: BigInt(market.state?.supplyShares ?? "0"),
          totalBorrowAssets: BigInt(market.state?.borrowAssets ?? "0"),
          totalBorrowShares: BigInt(market.state?.borrowShares ?? "0"),
          lastUpdate: BigInt(market.state?.timestamp ?? "0"),
          fee: BigInt(market.state?.fee ?? "0"),
        },
        caps: { absolute: caps.absoluteCap, relative: caps.relativeCap },
        vaultAssets: 0n,
        rateAtTarget: BigInt(market.state?.rateAtTarget ?? "0"),
      };
    }),
  );
}
