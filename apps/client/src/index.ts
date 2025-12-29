import type { ChainConfig } from "@vault-v2-reallocation-bot/config";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { ReallocationBot } from "./bot";
import { createStrategy } from "./strategies";

export const launchBot = (config: ChainConfig) => {
  const client = createWalletClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
    account: privateKeyToAccount(config.reallocatorPrivateKey),
  });

  const strategy = createStrategy(config.strategy);
  const bot = new ReallocationBot(client, config.vaultWhitelist, strategy);

  // Run on startup.
  void bot.run();

  // Thereafter, run every `executionInterval` seconds.
  setInterval(() => {
    void bot.run();
  }, config.executionInterval * 1000);
};
