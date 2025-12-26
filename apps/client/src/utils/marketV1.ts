import { Address, encodeAbiParameters, Hex, keccak256, parseAbiParameters } from "viem";
import { MarketParamsV1 } from "./types";

export function formatMarketV1CapId(marketId: Hex, adapterAddress: Address): Hex {
  const idData = encodeAbiParameters(parseAbiParameters("string,address,bytes32"), [
    "this",
    adapterAddress,
    marketId,
  ]) as `0x${string}`;

  return keccak256(idData);
}

export function encodeMarketParamsV1(marketParams: MarketParamsV1): Hex {
  return encodeAbiParameters(parseAbiParameters("address,address,address,address,uint256"), [
    marketParams.loanToken,
    marketParams.collateralToken,
    marketParams.oracle,
    marketParams.irm,
    marketParams.lltv,
  ]);
}
