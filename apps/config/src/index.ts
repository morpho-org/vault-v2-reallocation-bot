import dotenv from "dotenv";
import type { Chain, Hex } from "viem";
import { CAP_BUFFER_PERCENT, type ChainSettings, chains } from "./config";
import type { ChainConfig, StrategyName } from "./types";

dotenv.config();

export function chainConfig(chainSettings: ChainSettings): ChainConfig {
  const { chain, strategy, vaultWhitelist, executionInterval } = chainSettings;
  const { rpcUrl, reallocatorPrivateKey } = getSecrets(chain);
  return {
    chain,
    chainId: chain.id,
    rpcUrl,
    reallocatorPrivateKey,
    vaultWhitelist,
    executionInterval,
    strategy,
  };
}

export function getSecrets(chain: Chain) {
  const chainId = chain.id;
  const defaultRpcUrl = chain?.rpcUrls.default.http[0];

  const rpcUrl = process.env[`RPC_URL_${chainId}`] ?? defaultRpcUrl;
  const reallocatorPrivateKey = process.env[`REALLOCATOR_PRIVATE_KEY_${chainId}`];

  if (!rpcUrl) {
    throw new Error(`No RPC URL found for chainId ${chainId}`);
  }
  if (!reallocatorPrivateKey) {
    throw new Error(`No reallocator private key found for chainId ${chainId}`);
  }
  return {
    rpcUrl,
    reallocatorPrivateKey: reallocatorPrivateKey as Hex,
  };
}

export { CAP_BUFFER_PERCENT, type ChainConfig, type ChainSettings, type StrategyName, chains };
export * from "./strategies";
