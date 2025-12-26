import { Address, zeroAddress } from "viem";
import {
  getDepositableAmount,
  getWithdrawableAmount,
  getUtilization,
  min,
  wDivDown,
} from "../../../utils/maths";
import { MarketAllocation, VaultV2Data } from "../../../utils/types";
import { Strategy } from "../../strategy";
import {
  DEFAULT_MIN_UTILIZATION_DELTA_BIPS,
  vaultsMinUtilizationDeltaBips,
} from "@vault-v2-reallocation-bot/config";
import { encodeMarketParamsV1 } from "../utils";

export class EquilizeUtilizations implements Strategy {
  findReallocation(vaultData: VaultV2Data) {
    const marketsData = vaultData.marketsV1Data.markets.filter(
      (marketData) => marketData.params.collateralToken !== zeroAddress,
    );

    const targetUtilization = wDivDown(
      marketsData.reduce((acc, marketData) => acc + marketData.state.totalBorrowAssets, 0n),
      marketsData.reduce(
        (acc, marketData) => acc + marketData.state.totalSupplyAssets,
        vaultData.idleAssets,
      ),
    );

    let totalAmountToDeallocate = 0n;
    let totalAmountToAllocate = 0n;

    let didExceedMinUtilizationDelta = false; // (true if *at least one* market moves enough)
    // TODO: to estimate change in APR, we need `startRateAtTarget`, which we're not currently fetching or passing in
    // let didExceedMinAprDelta = false; // (true if *at least one* market moves enough)

    for (const marketData of marketsData) {
      const utilization = getUtilization(marketData.state);
      if (utilization > targetUtilization) {
        totalAmountToAllocate += getDepositableAmount(
          marketData,
          vaultData.totalAssets,
          targetUtilization,
        );
      } else {
        totalAmountToDeallocate += getWithdrawableAmount(marketData, targetUtilization);
      }

      didExceedMinUtilizationDelta ||=
        Math.abs(Number((utilization - targetUtilization) / 1_000_000_000n) / 1e5) >
        this.getMinUtilizationDeltaBips(marketData.chainId, marketData.id);
    }

    if (min(totalAmountToDeallocate, totalAmountToAllocate) === 0n || !didExceedMinUtilizationDelta)
      return;

    let remainingAmountToDeallocate = totalAmountToDeallocate;
    let remainingAmountToAllocate = totalAmountToAllocate;

    const allocations: MarketAllocation[] = [];
    const deallocations: MarketAllocation[] = [];

    for (const marketData of marketsData) {
      const utilization = getUtilization(marketData.state);

      if (utilization > targetUtilization) {
        const toAllocate = min(
          getDepositableAmount(marketData, vaultData.totalAssets, targetUtilization),
          remainingAmountToAllocate,
        );
        remainingAmountToAllocate -= toAllocate;

        allocations.push({
          marketParams: marketData.params,
          assets: toAllocate,
        });
      } else {
        const toDeallocate = min(
          getWithdrawableAmount(marketData, targetUtilization),
          remainingAmountToDeallocate,
        );
        remainingAmountToDeallocate -= toDeallocate;

        deallocations.push({
          marketParams: marketData.params,
          assets: toDeallocate,
        });
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

  private getMinUtilizationDeltaBips(chainId: number, vaultAddress: Address) {
    return (
      vaultsMinUtilizationDeltaBips[chainId]?.[vaultAddress] ?? DEFAULT_MIN_UTILIZATION_DELTA_BIPS
    );
  }
}
