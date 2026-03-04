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

  const bot = new ReallocationBot(client, config.vaultWhitelist, createStrategy(config.strategy));

  // Run on startup.
  void bot.run();

  console.log(`Bot running on chain ${config.chain.name} with strategy ${config.strategy}`);

  // Thereafter, run every `executionInterval` minutes.
  setInterval(
    () => {
      void bot.run();
    },
    config.executionInterval * 60 * 1000,
  );
};
