import { Command } from "commander";

import { input, password, select } from "@inquirer/prompts";
import chalk from "chalk";
import { getAllTools } from "../src/tools";
import { AuthStorage, ProviderName } from "../src/core/auth-storage";
import { runAgentLoop } from "../src/engine/agentLoop";
import { AgentMessage } from "../src/engine/type";

export const chatCommand = new Command("chat")
  .description("start chat session..")
  .action(async () => {
    console.log(chalk.bold.blue("Welcome to tui \n"));
    let activeProvider = AuthStorage.getAuthenticatedProviders()[0] ?? "openai";
    const chatHistory: AgentMessage[] = [];

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
        const results = await runAgentLoop(
          [{ role: "user", content: promptStr }],
          {
            cwd: process.cwd(),
            messages: chatHistory,
            activeToolNames: activeTools.map((t) => t.name),
            tools: activeTools,
          },
          {
            provider: activeProvider,
            apiKey: activeKey,
          },
          (event) => {
            if (
              event.type === "message_end" &&
              event.message.role === "assistant"
            ) {
              const textContent = event.message.content
                .filter((p) => p.type === "text")
                .map((p: any) => p.text)
                .join("");
              if (textContent) {
              }
            }
          },
        );

        chatHistory.push(...results);

        const lastMessage = results[results.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          const text = lastMessage.content
            .filter((p) => p.type === "text")
            .map((p: any) => p.text)
            .join("");
          console.log(`\n${chalk.bold.cyan("Agent:")} ${chalk.cyan(text)}\n`);
        }
      } catch (error) {
        console.error(chalk.red("Agent Error:"), error);
      }
    }
  });
