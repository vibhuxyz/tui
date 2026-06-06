import { Command } from "commander";

import { getOrchestratorTools } from "../src/tools";
import { AuthStorage } from "../src/core/auth-storage";
import { runAgentLoop } from "../src/engine/agentLoop";
import { buildSystemPrompt } from "../src/engine/systemPrompt";

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

    const activeTools = getOrchestratorTools();

    console.log("Asking OpenAI (and checking tools)...");

    try {
      const results = await runAgentLoop(
        [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: prompt },
        ],
        {
          cwd: process.cwd(),
          messages: [],
          activeToolNames: activeTools.map((t) => t.name),
          tools: activeTools,
        },
        {
          provider: "openai",
          apiKey: apiKey,
        },
        (event) => {
          if (event.type === "message_end" && event.message.role === "assistant") {
            const textContent = event.message.content
              .filter((p) => p.type === "text")
              .map((p: any) => p.text)
              .join("");
            if (textContent) {
              process.stdout.write(textContent);
            }
          }
        },
      );

      const lastMessage = results[results.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        const text = lastMessage.content
          .filter((p) => p.type === "text")
          .map((p: any) => p.text)
          .join("");
        console.log(`\n\nAgent: ${text}`);
      }
    } catch (error) {
      console.error("Agent Loop Failed:", error);
      process.exit(1);
    }
  });
