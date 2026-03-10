import { Address, Hex } from "viem";
import {
  apyToRate,
  getDepositableAmount,
  getWithdrawableAmount,
  getUtilization,
  min,
  percentToWad,
  rateToApy,
  rateToUtilization,
  utilizationToRate,
} from "../../../utils/maths";
import { MarketAllocation, VaultV2Data } from "../../../utils/types";
import { Strategy } from "../../strategy";
import {
  ALLOW_IDLE_REALLOCATION,
  CAP_BUFFER_PERCENT,
  DEFAULT_APY_RANGE,
  DEFAULT_MIN_APY_DELTA_BIPS,
  marketsApyRanges,
  marketsMinApsDeltaBips,
  vaultsDefaultApyRanges,
  vaultsDefaultMinApsDeltaBips,
} from "@vault-v2-reallocation-bot/config";
import { encodeMarketParamsV1 } from "../utils";

export class ApyRange implements Strategy {
  constructor() {}

  findReallocation(vaultData: VaultV2Data) {
    const marketsData = vaultData.marketsV1Data.markets;

    let totalAmountToDeallocate = 0n;
    let totalAmountToAllocate = 0n;

    let didExceedMinApyDelta = false; // (true if *at least one* market moves enough)

    for (const marketData of marketsData) {
      const apyRange = this.getApyRange(marketData.chainId, vaultData.vaultAddress, marketData.id);

      const upperUtilizationBound = rateToUtilization(
        apyToRate(apyRange.max),
        marketData.rateAtTarget,
      );
      const lowerUtilizationBound = rateToUtilization(
        apyToRate(apyRange.min),
        marketData.rateAtTarget,
      );

      const utilization = getUtilization(marketData.state);

      if (utilization > upperUtilizationBound) {
        totalAmountToAllocate += getDepositableAmount(
          marketData,
          vaultData.totalAssets,
          upperUtilizationBound,
          CAP_BUFFER_PERCENT,
        );

        const apyDelta =
          rateToApy(utilizationToRate(upperUtilizationBound, marketData.rateAtTarget)) -
          rateToApy(utilizationToRate(utilization, marketData.rateAtTarget));

        didExceedMinApyDelta ||=
          Math.abs(Number(apyDelta / 1_000_000_000n) / 1e5) >
          this.getMinApyDeltaBips(marketData.chainId, vaultData.vaultAddress, marketData.id);
      } else if (utilization < lowerUtilizationBound) {
        totalAmountToDeallocate += getWithdrawableAmount(marketData, lowerUtilizationBound);

        const apyDelta =
          rateToApy(utilizationToRate(lowerUtilizationBound, marketData.rateAtTarget)) -
          rateToApy(utilizationToRate(utilization, marketData.rateAtTarget));

        didExceedMinApyDelta ||=
          Math.abs(Number(apyDelta / 1_000_000_000n) / 1e5) >
          this.getMinApyDeltaBips(marketData.chainId, vaultData.vaultAddress, marketData.id);
      }
    }

    if (totalAmountToDeallocate > totalAmountToAllocate && !this.allowIdleReallocation()) {
      totalAmountToDeallocate = totalAmountToAllocate;
    } else if (totalAmountToAllocate > totalAmountToDeallocate) {
      totalAmountToAllocate =
        totalAmountToDeallocate +
        min(totalAmountToAllocate - totalAmountToDeallocate, vaultData.idleAssets);
    }

    if (min(totalAmountToDeallocate, totalAmountToAllocate) === 0n || !didExceedMinApyDelta) return;

    let remainingAmountToDeallocate = totalAmountToDeallocate;
    let remainingAmountToAllocate = totalAmountToAllocate;

    const deallocations: MarketAllocation[] = [];
    const allocations: MarketAllocation[] = [];

    for (const marketData of marketsData) {
      const apyRange = this.getApyRange(marketData.chainId, vaultData.vaultAddress, marketData.id);

      const upperUtilizationBound = rateToUtilization(
        apyToRate(apyRange.max),
        marketData.rateAtTarget,
      );
      const lowerUtilizationBound = rateToUtilization(
        apyToRate(apyRange.min),
        marketData.rateAtTarget,
      );
      const utilization = getUtilization(marketData.state);

      if (utilization > upperUtilizationBound) {
        const toAllocate = min(
          getDepositableAmount(marketData, vaultData.totalAssets, upperUtilizationBound, CAP_BUFFER_PERCENT),
          remainingAmountToAllocate,
        );
        remainingAmountToAllocate -= toAllocate;

        if (toAllocate > 0n) {
          allocations.push({
            marketParams: marketData.params,
            assets: toAllocate,
          });
        }
      } else if (utilization < lowerUtilizationBound) {
        const toDeallocate = min(
          getWithdrawableAmount(marketData, lowerUtilizationBound),
          remainingAmountToDeallocate,
        );
        remainingAmountToDeallocate -= toDeallocate;

        if (toDeallocate > 0n) {
          deallocations.push({
            marketParams: marketData.params,
            assets: toDeallocate,
          });
        }
      }

      if (remainingAmountToDeallocate === 0n && remainingAmountToAllocate === 0n) break;
    }

    return {
      allocations: allocations.map((allocation) => ({
        adapterAddress: vaultData.marketsV1Data.adapterAddress,
        data: encodeMarketParamsV1(allocation.marketParams),
        assets: allocation.assets,
      })),
      deallocations: deallocations.map((deallocation) => ({
        adapterAddress: vaultData.marketsV1Data.adapterAddress,
        data: encodeMarketParamsV1(deallocation.marketParams),
        assets: deallocation.assets,
      })),
    };
  }

  protected allowIdleReallocation() {
    return ALLOW_IDLE_REALLOCATION;
  }

  protected getApyRange(chainId: number, vaultAddress: Address, marketId: Hex) {
    let apyRange = DEFAULT_APY_RANGE;

    if (vaultsDefaultApyRanges[chainId]?.[vaultAddress] !== undefined)
      apyRange = vaultsDefaultApyRanges[chainId][vaultAddress];

    if (marketsApyRanges[chainId]?.[marketId] !== undefined)
      apyRange = marketsApyRanges[chainId][marketId];

    return {
      min: percentToWad(apyRange.min),
      max: percentToWad(apyRange.max),
    };
  }

  protected getMinApyDeltaBips(chainId: number, vaultAddress: Address, marketId: Hex) {
    let minApyDeltaBips = DEFAULT_MIN_APY_DELTA_BIPS;

    if (vaultsDefaultMinApsDeltaBips[chainId]?.[vaultAddress] !== undefined)
      minApyDeltaBips = vaultsDefaultMinApsDeltaBips[chainId][vaultAddress];

    if (marketsMinApsDeltaBips[chainId]?.[marketId] !== undefined)
      minApyDeltaBips = marketsMinApsDeltaBips[chainId][marketId];

    return minApyDeltaBips;
  }
}
