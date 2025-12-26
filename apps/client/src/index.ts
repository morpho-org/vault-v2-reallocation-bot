import type { ChainConfig } from "@morpho-blue-reallocation-bot/config";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { ReallocationBot } from "./bot";
import { EquilizeUtilizations } from "./strategies";

export const launchBot = (config: ChainConfig) => {
  const client = createWalletClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
    account: privateKeyToAccount(config.reallocatorPrivateKey),
  });

  const bot = new ReallocationBot(
    config.chainId,
    client,
    config.vaultWhitelist,
    new EquilizeUtilizations(),
  );

  // Run on startup.
  void bot.run();

  // Thereafter, run every `executionInterval` seconds.
  setInterval(() => {
    void bot.run();
  }, config.executionInterval * 1000);
};
