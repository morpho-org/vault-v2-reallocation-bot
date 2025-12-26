import { AnvilTestClient, testAccount } from "@morpho-org/test";
import {
  Address,
  encodeFunctionData,
  Hex,
  maxUint128,
  maxUint256,
  parseEventLogs,
  parseUnits,
} from "viem";
import {
  USDC,
  WBTC,
  WBTC_USDC_ORACLE,
  IRM,
  MORPHO,
  VAULT_V2_FACTORY,
  MORPHO_MARKET_V1_ADAPTER_V2_FACTORY,
} from "../constants";
import { getTransactionReceipt, writeContract } from "viem/actions";
import { morphoBlueAbi } from "../abis/MorphoBlue";
import { vaultV2FactoryAbi } from "../abis/VaultV2Factory";
import { vaultV2Abi } from "../../abis/VaultV2";
import { morphoMarketV1AdapterV2FactoryAbi } from "../abis/MorphoMarketV1AdapterV2Factory";
import { MarketParamsV1 } from "../../src/utils/types";
import {
  collateralCapIdData,
  marketV1AdapterCapIdData,
  marketV1CapIdData,
} from "../../src/utils/capsIds";
import { WAD } from "../../src/utils/maths";

export type BorrowStruct = {
  marketParams: MarketParamsV1;
  collateralAmount: bigint;
  loanAmount: bigint;
};

export const marketParams1 = {
  loanToken: USDC as Address,
  collateralToken: WBTC as Address,
  oracle: WBTC_USDC_ORACLE as Address,
  irm: IRM as Address,
  lltv: parseUnits("0.385", 18),
};

export const marketParams2 = {
  loanToken: USDC as Address,
  collateralToken: WBTC as Address,
  oracle: WBTC_USDC_ORACLE as Address,
  irm: IRM as Address,
  lltv: parseUnits("0.625", 18),
};

export const marketParams3 = {
  loanToken: USDC as Address,
  collateralToken: WBTC as Address,
  oracle: WBTC_USDC_ORACLE as Address,
  irm: IRM as Address,
  lltv: parseUnits("0.77", 18),
};

export const supplier = testAccount(2);
export const borrower = testAccount(3);

export const marketId1 = "0x60f25d76d9cd6762dabce33cc13d2d018f0d33f9bd62323a7fbe0726e0518388";
export const marketId2 = "0x88d40fc93bdfe3328504a780f04c193e2938e0ec3d92e6339b6a960f4584229a";
export const marketId3 = "0x91e04f21833b80e4f17241964c25dabcd9b062a6e4790ec4fd52f72f3f5b1f2e";

export async function setupVault(client: AnvilTestClient, cap: bigint, suppliedAmount: bigint) {
  /// Deploy markets

  await writeContract(client, {
    address: MORPHO,
    abi: morphoBlueAbi,
    functionName: "createMarket",
    args: [marketParams1],
  });

  await writeContract(client, {
    address: MORPHO,
    abi: morphoBlueAbi,
    functionName: "createMarket",
    args: [marketParams2],
  });

  await writeContract(client, {
    address: MORPHO,
    abi: morphoBlueAbi,
    functionName: "createMarket",
    args: [marketParams3],
  });

  /// Deploy vault

  const vaultDeploymentHash = await writeContract(client, {
    address: VAULT_V2_FACTORY,
    abi: vaultV2FactoryAbi,
    functionName: "createVaultV2",
    args: [
      client.account.address,
      USDC,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ],
  });

  const vaultDeploymentReceipt = await getTransactionReceipt(client, { hash: vaultDeploymentHash });
  const createVaultV2Events = parseEventLogs({
    abi: vaultV2FactoryAbi,
    logs: vaultDeploymentReceipt.logs,
    eventName: "CreateVaultV2",
  });
  const vault = createVaultV2Events[0]!.args.newVaultV2;

  /// deploy adapter

  const adapterDeploymentHash = await writeContract(client, {
    address: MORPHO_MARKET_V1_ADAPTER_V2_FACTORY,
    abi: morphoMarketV1AdapterV2FactoryAbi,
    functionName: "createMorphoMarketV1AdapterV2",
    args: [vault],
  });

  const adapterDeploymentReceipt = await getTransactionReceipt(client, {
    hash: adapterDeploymentHash,
  });
  const createMorphoMarketV1AdapterV2Events = parseEventLogs({
    abi: morphoMarketV1AdapterV2FactoryAbi,
    logs: adapterDeploymentReceipt.logs,
    eventName: "CreateMorphoMarketV1AdapterV2",
  });
  const adapter = createMorphoMarketV1AdapterV2Events[0]!.args.morphoMarketV1AdapterV2;

  let calls: Hex[] = [];

  /// Set name and symbol

  calls.push(
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "setName",
      args: ["Test Vault"],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "setSymbol",
      args: ["TEST"],
    }),
  );

  /// Set Roles

  calls.push(
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "setCurator",
      args: [client.account.address],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "setIsAllocator",
          args: [client.account.address, true],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "setIsAllocator",
      args: [client.account.address, true],
    }),
  );

  /// Set adapters

  calls.push(
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "addAdapter",
          args: [adapter],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "addAdapter",
      args: [adapter],
    }),
  );

  /// First execution

  await writeContract(client, {
    address: vault,
    abi: vaultV2Abi,
    functionName: "multicall",
    args: [calls],
  });

  calls = [];

  /// Set caps

  calls.push(
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseAbsoluteCap",
          args: [marketV1AdapterCapIdData(adapter), maxUint128],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseRelativeCap",
          args: [marketV1AdapterCapIdData(adapter), WAD],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseAbsoluteCap",
          args: [collateralCapIdData(WBTC), maxUint128],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseRelativeCap",
          args: [collateralCapIdData(WBTC), WAD],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseAbsoluteCap",
          args: [marketV1CapIdData(marketParams1, adapter), cap],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseRelativeCap",
          args: [marketV1CapIdData(marketParams1, adapter), WAD],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseAbsoluteCap",
          args: [marketV1CapIdData(marketParams2, adapter), cap],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseRelativeCap",
          args: [marketV1CapIdData(marketParams2, adapter), WAD],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseAbsoluteCap",
          args: [marketV1CapIdData(marketParams3, adapter), cap],
        }),
      ],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "submit",
      args: [
        encodeFunctionData({
          abi: vaultV2Abi,
          functionName: "increaseRelativeCap",
          args: [marketV1CapIdData(marketParams3, adapter), WAD],
        }),
      ],
    }),
  );

  await writeContract(client, {
    address: vault,
    abi: vaultV2Abi,
    functionName: "multicall",
    args: [calls],
  });

  calls = [];

  /// Accept caps

  calls.push(
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseAbsoluteCap",
      args: [marketV1AdapterCapIdData(adapter), maxUint128],
    }),

    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseRelativeCap",
      args: [marketV1AdapterCapIdData(adapter), WAD],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseAbsoluteCap",
      args: [collateralCapIdData(WBTC), maxUint128],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseRelativeCap",
      args: [collateralCapIdData(WBTC), WAD],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseAbsoluteCap",
      args: [marketV1CapIdData(marketParams1, adapter), cap],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseRelativeCap",
      args: [marketV1CapIdData(marketParams1, adapter), WAD],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseAbsoluteCap",
      args: [marketV1CapIdData(marketParams2, adapter), cap],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseRelativeCap",
      args: [marketV1CapIdData(marketParams2, adapter), WAD],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseAbsoluteCap",
      args: [marketV1CapIdData(marketParams3, adapter), cap],
    }),
    encodeFunctionData({
      abi: vaultV2Abi,
      functionName: "increaseRelativeCap",
      args: [marketV1CapIdData(marketParams3, adapter), WAD],
    }),
  );

  await writeContract(client, {
    address: vault,
    abi: vaultV2Abi,
    functionName: "multicall",
    args: [calls],
  });

  calls = [];

  /// Deposit

  await client.deal({
    erc20: USDC,
    account: supplier.address,
    amount: suppliedAmount,
  });

  await client.approve({
    account: supplier.address,
    address: USDC,
    args: [vault, maxUint256],
  });

  await writeContract(client, {
    account: supplier,
    address: vault,
    abi: vaultV2Abi,
    functionName: "deposit",
    args: [suppliedAmount, supplier.address],
  });

  return { vault, adapter };
}

export async function prepareBorrow(
  client: AnvilTestClient,
  collaterals: { address: Address; amount: bigint }[],
) {
  for (const collateral of collaterals) {
    await client.deal({
      erc20: collateral.address,
      account: borrower,
      amount: collateral.amount,
    });

    await client.approve({
      account: borrower,
      address: collateral.address,
      args: [MORPHO, maxUint256],
    });
  }
}

export async function borrow(client: AnvilTestClient, borrowStructs: BorrowStruct[]) {
  for (const borrowStruct of borrowStructs) {
    await writeContract(client, {
      account: borrower,
      address: MORPHO,
      abi: morphoBlueAbi,
      functionName: "supplyCollateral",
      args: [borrowStruct.marketParams, borrowStruct.collateralAmount, borrower.address, "0x"],
    });

    await writeContract(client, {
      account: borrower,
      address: MORPHO,
      abi: morphoBlueAbi,
      functionName: "borrow",
      args: [
        borrowStruct.marketParams,
        borrowStruct.loanAmount,
        0n,
        borrower.address,
        borrower.address,
      ],
    });
  }
}
