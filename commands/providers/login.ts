import { Command } from "commander";
import { AuthStorage, ProviderName } from "../../src/core/auth-storage";

export const loginCommand = new Command("login")
  .description("Lets user login into the provider (use it as default)")
  .option(
    "-p, --provider <providerName>",
    "Name of the provider (gemini, claude etc)",
    "",
  )
  .option("-a, --api_key <apiKey>", "Your api key", "")
  .action(async (options) => {
    console.log("logging into " + options.provider);
    const provider = options.provider.toLowerCase();
    const apiKey = options.api_key;

    if (!provider || !apiKey) {
      console.error("provider and api key is required!");
      process.exit(1);
    }

    if (provider !== "openai" && provider !== "gemini") {
      console.error("unsupported ai ");
      process.exit(1);
    }

    AuthStorage.setApiKey(provider as ProviderName, apiKey);

    console.log(`Successful login in ${provider} keys are stored`);
  });
