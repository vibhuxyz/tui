import { Command } from "commander";

export const logoutCommand = new Command("logout")
  .description("Lets user logout from the provider")
  .option(
    "-p, --provider <providerName>",
    "Name of the provider (gemini, claude etc)",
    "",
  )
  .action(async(options) => {
    console.log("logging out for provider " + options.provider);
    
  });
