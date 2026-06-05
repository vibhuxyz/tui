import { Command } from "commander";

import { agentLoop } from "../src/engine/agentLoop";
import { input, password, select } from "@inquirer/prompts";
import chalk from "chalk";
import { getAllTools } from "../src/tools";
import { AuthStorage, ProviderName } from "../src/core/auth-storage";

export const chatCommand = new Command("chat")
  .description("start chat session..")
  .action(async () => {
    console.log(chalk.bold.blue("Welcome to tui \n"));
    let activeProvider = AuthStorage.getAuthenticatedProviders()[0] ?? "openai";

    if (!AuthStorage.getApiKey(activeProvider)) {
      console.log(
        chalk.yellow(" You are not logged in Type '/login' to login\n"),
      );
    }

    const activeTools = getAllTools();

    while (true) {
      const promptStr = await input({ message: chalk.bold.green("You:") });
      const promptLower = promptStr.trim().toLowerCase();

      if (!promptLower) continue;

      if (promptLower === "/exit" || promptLower === "/quit") {
        console.log(chalk.gray("Exiting..."));
        break;
      }

      if (promptLower === "/login") {
        const chosenProvider = (await select({
          message: "Which ai provider do you want to login ? ",
          choices: [
            { name: "OpenAI / gpt", value: "openai" },
            { name: "Gemini", value: "gemini" },
          ],
        })) as ProviderName;

        console.log(chalk.dim(`Logging into ${chosenProvider}....`));
        const newKey = await password({
          message: `Enter the ${chosenProvider} API Key:`,
        });

        if (newKey.trim()) {
          AuthStorage.setApiKey(chosenProvider, newKey.trim());
          activeProvider = chosenProvider;
          console.log(
            chalk.green(`Successfully logged in! ${chosenProvider}\n`),
          );
        } else {
          console.log(chalk.red(" Login cancelled: Key cannot be empty.\n"));
        }
        continue;
      }

      const activeKey = AuthStorage.getApiKey(activeProvider);
      if (!activeKey) {
        console.log(chalk.red("You cannot chat Please type '/login' first \n"));
        continue;
      }

      try {
        console.log(chalk.dim("Thinking..."));
        const finalAnswer = await agentLoop(
          promptStr,
          activeKey,
          activeTools,
          activeProvider,
        );
        console.log(
          `\n${chalk.bold.cyan("Agent:")} ${chalk.cyan(finalAnswer)}\n`,
        );
      } catch (error) {
        console.error(chalk.red("Agent Error:"), error);
      }
    }
  });
