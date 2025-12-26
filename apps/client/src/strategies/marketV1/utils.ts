import { encodeAbiParameters, Hex, parseAbiParameters } from "viem";
import { MarketParamsV1 } from "../../utils/types";

export function encodeMarketParamsV1(marketParams: MarketParamsV1): Hex {
  return encodeAbiParameters(parseAbiParameters("address,address,address,address,uint256"), [
    marketParams.loanToken,
    marketParams.collateralToken,
    marketParams.oracle,
    marketParams.irm,
    marketParams.lltv,
  ]);
}
