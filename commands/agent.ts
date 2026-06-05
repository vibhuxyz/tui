import { Command } from "commander";

import { agentLoop } from "../src/engine/agentLoop";
import { getAllTools } from "../src/tools";
import { AuthStorage } from "../src/core/auth-storage";

export const agentCommand = new Command("agent")
  .description("Runs the agent")
  .option("-p, --prompt <prompt>", "prompt", "")
  .action(async (options) => {
    const prompt = options.prompt;
    if (!prompt) {
      console.error("Error: Please provide a prompt using the -p flag.");
      process.exit(1);
    }

    const apiKey = AuthStorage.getApiKey("openai");

    if (!apiKey) {
      console.error(
        "Error: OpenAI API key not found. Run 'opencode providers login' or use '/login' in chat.",
      );
      process.exit(1);
    }

    const activeTools = getAllTools();

    console.log("Asking OpenAI (and checking tools)...");

    try {
      const finalAnswer = await agentLoop(prompt, apiKey, activeTools);
      console.log(`\n Agent: ` + finalAnswer);
    } catch (error) {
      console.error("Agent Loop Failed:", error);
      process.exit(1);
    }
  });
