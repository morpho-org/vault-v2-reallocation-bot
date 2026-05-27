import {
  Address,
  decodeAbiParameters,
  encodeAbiParameters,
  Hex,
  keccak256,
  parseAbiParameters,
} from "viem";
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

export function marketV1CapIdData(marketParams: MarketParamsV1, adapterAddress: Address): Hex {
  return encodeAbiParameters(
    parseAbiParameters("string,address,(address,address,address,address,uint256)"),
    [
      "this/marketParams",
      adapterAddress,
      [
        marketParams.loanToken,
        marketParams.collateralToken,
        marketParams.oracle,
        marketParams.irm,
        marketParams.lltv,
      ],
    ],
  ) as `0x${string}`;
}

export function marketV1AdapterCapIdData(adapterAddress: Address): Hex {
  return encodeAbiParameters(parseAbiParameters("string,address"), [
    "this",
    adapterAddress,
  ]) as `0x${string}`;
}

export function marketV1CapId(marketParams: MarketParamsV1, adapterAddress: Address): Hex {
  return keccak256(marketV1CapIdData(marketParams, adapterAddress));
}

export function decodeMarketV1CapIdData(idData: Hex): {
  adapterAddress: Address;
  marketParams: MarketParamsV1;
} {
  const [prefix, adapterAddress, marketParams] = decodeAbiParameters(
    parseAbiParameters("string,address,(address,address,address,address,uint256)"),
    idData,
  );

  if (prefix !== "this/marketParams") {
    throw new Error("Invalid MarketV1 cap idData");
  }

  return {
    adapterAddress,
    marketParams: {
      loanToken: marketParams[0],
      collateralToken: marketParams[1],
      oracle: marketParams[2],
      irm: marketParams[3],
      lltv: marketParams[4],
    },
  };
}

export function marketV1UniqueKey(marketParams: MarketParamsV1): Hex {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("address,address,address,address,uint256"), [
      marketParams.loanToken,
      marketParams.collateralToken,
      marketParams.oracle,
      marketParams.irm,
      marketParams.lltv,
    ]),
  );
}

export function marketV1AdapterCapId(adapterAddress: Address): Hex {
  return keccak256(marketV1AdapterCapIdData(adapterAddress));
}
