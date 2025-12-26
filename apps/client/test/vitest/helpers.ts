import { encodeFunctionData, Address, Hex } from "viem";
import {
  MarketParamsV1,
  MarketStateV1,
  Reallocation,
  ReallocationAction,
} from "../../src/utils/types";
import { vaultV2Abi } from "../../abis/VaultV2";
import { encodeMarketParamsV1 } from "../../src/strategies/marketV1/utils";

export function formatMarketStateV1(
  marketStateArray: readonly [bigint, bigint, bigint, bigint, bigint, bigint],
): MarketStateV1 {
  return {
    totalSupplyAssets: marketStateArray[0],
    totalSupplyShares: marketStateArray[1],
    totalBorrowAssets: marketStateArray[2],
    totalBorrowShares: marketStateArray[3],
    lastUpdate: marketStateArray[4],
    fee: marketStateArray[5],
  };
}

export const abs = (x: bigint) => (x < 0n ? -x : x);

export function encodeReallocation(reallocation: Reallocation): Hex[] {
  return [
    ...reallocation.deallocations.map(encodeDeallocation),
    ...reallocation.allocations.map(encodeAllocation),
  ];
}

function encodeAllocation(allocation: ReallocationAction): Hex {
  return encodeFunctionData({
    abi: vaultV2Abi,
    functionName: "allocate",
    args: [allocation.adapterAddress, allocation.data, allocation.assets],
  });
}

function encodeDeallocation(deallocation: ReallocationAction): Hex {
  return encodeFunctionData({
    abi: vaultV2Abi,
    functionName: "deallocate",
    args: [deallocation.adapterAddress, deallocation.data, deallocation.assets],
  });
}
