import { Command } from "commander";

import { input, password, select } from "@inquirer/prompts";
import chalk from "chalk";
import { getOrchestratorTools } from "../src/tools";
import { AuthStorage, ProviderName } from "../src/core/auth-storage";
import { runAgentLoop } from "../src/engine/agentLoop";
import { AgentMessage } from "../src/engine/type";
import { buildSystemPrompt } from "../src/engine/systemPrompt";

export const chatCommand = new Command("chat")
  .description("start chat session..")
  .action(async () => {
    console.log(chalk.bold.blue("Welcome to tui \n"));
    let activeProvider = AuthStorage.getAuthenticatedProviders()[0] ?? "openai";
    const chatHistory: AgentMessage[] = [
      { role: "system", content: buildSystemPrompt() },
    ];

    if (!AuthStorage.getApiKey(activeProvider)) {
      console.log(
        chalk.yellow(" You are not logged in Type '/login' to login\n"),
      );
    }

    const activeTools = getOrchestratorTools();

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

        let isAgentFinished = false;
        let currentPrompts: AgentMessage[] = [
          { role: "user", content: promptStr },
        ];
        while (!isAgentFinished) {
          const results = await runAgentLoop(
            currentPrompts,
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

          if (
            lastMessage &&
            lastMessage.role === "tool" &&
            lastMessage.name === "propose_plan"
          ) {
            const planData = JSON.parse(lastMessage.content);
            console.log(`\n${chalk.bold.magenta("Agent Proposed a Plan:")}`);
            planData.steps.forEach((step: string, index: number) => {
              console.log(chalk.magenta(`${index + 1}. ${step}`));
            });

            const feedback = await input({
              message: chalk.bold.yellow(
                "Do you approve this plan? (Type 'yes' to approve, or type your feedback to change it): ",
              ),
            });

            if (
              feedback.toLowerCase() === "yes" ||
              feedback.toLowerCase() === "y"
            ) {
              console.log(chalk.green("Plan approved. Executing..."));
              currentPrompts = [
                {
                  role: "user",
                  content:
                    "Plan approved. Please execute the plan exactly as proposed.",
                },
              ];
            } else {
              console.log(
                chalk.yellow("Sending feedback and squashing history..."),
              );
              chatHistory.splice(-2, 2);
              currentPrompts = [
                {
                  role: "user",
                  content: `Your previous plan was rejected. The user provided this feedback: "${feedback}". Please propose a new plan.`,
                },
              ];
            }
          } else {
            if (lastMessage && lastMessage.role === "assistant") {
              const text = lastMessage.content
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join("");
              if (text) {
                console.log(
                  `\n${chalk.bold.cyan("Agent:")} ${chalk.cyan(text)}\n`,
                );
              }
            }
            isAgentFinished = true;
          }
        }
      } catch (error) {
        console.error(chalk.red("Agent Error:"), error);
      }
    }
  });
