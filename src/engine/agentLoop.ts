import { ChatRequest } from "../core/model-registry";
import { executeOpenAI } from "../providers/openai";
import { AgentTool } from "../types";
import { buildSystemPrompt } from "./systemPrompt";

export async function agentLoop(
  prompt: string,
  apiKey: string,
  tools: AgentTool[],
  provider: "openai" | "gemini" = "openai",
) {
  const messages: any[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: prompt },
  ];

  while (true) {
    const request: ChatRequest = {
      provider,
      apiKey,
      prompt,
      history: messages,
      tools,
    };

    let response;

    if (provider === "openai") {
      response = await executeOpenAI(request);
    } else if (provider === "gemini") {
      // response = await executeGemini(request);
    } else {
      throw new Error("Unknown provider");
    }

    messages.push(response?.rawMessage);

    if (response?.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const tool = tools.find((t) => t.name === toolCall.name);

        if (tool) {
          const result = await tool.execute(toolCall.arguments);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: tool.name,
            content: result.content[0].text,
          });
        }
      }
      continue;
      
    }

    if (response?.text) {
      
    }
  }
}
