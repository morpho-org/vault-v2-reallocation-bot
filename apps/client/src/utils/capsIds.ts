import { Address, encodeAbiParameters, Hex, keccak256, parseAbiParameters } from "viem";
import { MarketParamsV1 } from "./types";

// Collateral

export function collateralCapIdData(collateralAddress: Address): Hex {
  return encodeAbiParameters(parseAbiParameters("string,address"), [
    "collateralToken",
    collateralAddress,
  ]) as `0x${string}`;
}

export function collateralCapId(collateralAddress: Address): Hex {
  return keccak256(collateralCapIdData(collateralAddress));
}

// MarketV1

export function marketV1CapIdData(marketId: Hex, adapterAddress: Address): Hex {
  return encodeAbiParameters(parseAbiParameters("string,address,bytes32"), [
    "this",
    adapterAddress,
    marketId,
  ]) as `0x${string}`;
}

export function marketV1AdapterCapIdData(adapterAddress: Address): Hex {
  return encodeAbiParameters(parseAbiParameters("string,address"), [
    "this",
    adapterAddress,
  ]) as `0x${string}`;
}

export function marketV1CapId(marketId: Hex, adapterAddress: Address): Hex {
  return keccak256(marketV1CapIdData(marketId, adapterAddress));
}

export function marketV1AdapterCapId(adapterAddress: Address): Hex {
  return keccak256(marketV1AdapterCapIdData(adapterAddress));
}
