import type { Address, Chain, Hex } from "viem";

export type ChainConfig = {
  chain: Chain;
  rpcUrl: string;
  vaultWhitelist: Address[];
  reallocatorPrivateKey: Hex;
};

export type MarketParamsV1 = {
  loanToken: Address;
  collateralToken: Address;
  irm: Address;
  oracle: Address;
  lltv: bigint;
};

export interface MarketStateV1 {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
}

export type MarketV1Data = {
  chainId: number;
  id: Hex;
  params: MarketParamsV1;
  state: MarketStateV1;
  caps: Caps;
  vaultAssets: bigint;
  rateAtTarget: bigint;
};

export type VaultV2Data = {
  vaultAddress: Address;
  totalAssets: bigint;
  idleAssets: bigint;
  marketsV1Data: VaultV2MarketV1Data;
};

export type VaultV2MarketV1Data = {
  adapterAddress: Address;
  markets: MarketV1Data[];
};

export type Reallocation = {
  allocations: ReallocationAction[];
  deallocations: ReallocationAction[];
};

export type ReallocationAction = {
  adapterAddress: Address;
  data: Hex;
  assets: bigint;
};

export type Caps = {
  absolute: bigint;
  relative: bigint;
};

export type MarketAllocation = {
  marketParams: MarketParamsV1;
  assets: bigint;
};

