import { chainConfig, chains } from "@vault-v2-reallocation-bot/config";
import { launchBot } from ".";

async function run() {
  const configs = chains.map((chainMinimalConfig) =>
    chainConfig(chainMinimalConfig.chain, chainMinimalConfig.strategy),
  );

  try {
    // biome-ignore lint/complexity/noForEach: <explanation>
    configs.forEach((config) => launchBot(config));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
