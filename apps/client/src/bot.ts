import {
  encodeFunctionData,
  Hex,
  type Account,
  type Address,
  type Chain,
  type Client,
  type Transport,
} from "viem";
import { estimateGas, writeContract } from "viem/actions";

import { vaultV2Abi } from "../abis/VaultV2.js";

import { Strategy } from "./strategies/strategy.js";
import { fetchVaultData } from "./utils/fetchers.js";
import { Reallocation, ReallocationAction, VaultV2Data } from "./utils/types.js";

export class ReallocationBot {
  private client: Client<Transport, Chain, Account>;
  private vaultWhitelist: Address[];
  private strategy: Strategy;
  constructor(
    client: Client<Transport, Chain, Account>,
    vaultWhitelist: Address[],
    strategy: Strategy,
  ) {
    this.client = client;
    this.vaultWhitelist = vaultWhitelist;
    this.strategy = strategy;
  }

  async run() {
    const { client } = this;
    let vaultsData: VaultV2Data[] = [];
    try {
      vaultsData = await Promise.all(
        this.vaultWhitelist.map(async (vaultAddress) => fetchVaultData(vaultAddress, client)),
      );
    } catch (error) {
      console.error("Error fetching vaults data", error);
      return;
    }

    await Promise.all(
      vaultsData.map(async (vaultData) => {
        const reallocation = await this.strategy.findReallocation(vaultData);

        if (!reallocation) return;

        try {
          /// TX SIMULATION

          const populatedTx = {
            to: vaultData.vaultAddress,
            data: encodeFunctionData({
              abi: vaultV2Abi,
              functionName: "multicall",
              args: [this.encodeReallocation(reallocation)],
            }),
            value: 0n,
          };

          await estimateGas(client, populatedTx);

          // TX EXECUTION

          await writeContract(client, {
            address: vaultData.vaultAddress,
            abi: vaultV2Abi,
            functionName: "multicall",
            args: [this.encodeReallocation(reallocation)],
          });

          console.log(`Reallocated on ${vaultData.vaultAddress}`);
        } catch (error) {
          console.log(`Failed to reallocate on ${vaultData.vaultAddress}`);
          console.error("reallocation error", error);
        }
      }),
    );
  }

  private encodeReallocation(reallocation: Reallocation): Hex[] {
    return [
      ...reallocation.deallocations.map(this.encodeDeallocation),
      ...reallocation.allocations.map(this.encodeAllocation),
    ];
  }

  private encodeAllocation(allocation: ReallocationAction): Hex {
    return encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "allocate",
      args: [allocation.adapterAddress, allocation.data, allocation.assets],
    });
  }

  private encodeDeallocation(deallocation: ReallocationAction): Hex {
    return encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "deallocate",
      args: [deallocation.adapterAddress, deallocation.data, deallocation.assets],
    });
  }
}
