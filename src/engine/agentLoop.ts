import { ChatRequest } from "../core/model-registry";
import { executeGemini } from "../providers/gemini";
import { executeOpenAI } from "../providers/openai";
import { AgentTool } from "../types";
import { buildSystemPrompt } from "./systemPrompt";

function isProjectOverviewPrompt(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  if (isSpecificFileQuestion(normalized)) {
    return false;
  }

  return (
    /\b(project|repo|repository|codebase|files|folders|directories|structure|architecture)\b/.test(
      normalized,
    ) &&
    /\b(tell|explain|describe|overview|what|about|understand)\b/.test(
      normalized,
    )
  );
}

function isSpecificFileQuestion(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  return (
    /\b(read|show|open|what|written|inside|content|contents)\b/.test(
      normalized,
    ) &&
    /(?:^|\s|["'`])[\w.-]+\.(json|ts|tsx|js|jsx|md|txt|yml|yaml|toml|lock|env)(?:\s|["'`]|$)/.test(
      normalized,
    )
  );
}

function isCasualConversationPrompt(prompt: string): boolean {
  const normalized = prompt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return true;
  }

  if (
    /\b(project|repo|repository|codebase|file|files|folder|folders|directory|directories|bug|error|fix|code|implement|read|search|find|grep|list|ls|weather)\b/.test(
      normalized,
    )
  ) {
    return false;
  }

  return /^(hi|hy|hey|hello|yo|namaste|thanks|thank you|ok|okay|cool|great|how are you|what's up|whats up)(\s+(there|bro|dude|sir|man|how are you|are you okay|what's up|whats up))*$/.test(
    normalized,
  );
}

function selectToolsForPrompt(prompt: string, tools: AgentTool[]): AgentTool[] {
  if (isCasualConversationPrompt(prompt)) {
    return [];
  }

  if (isSpecificFileQuestion(prompt)) {
    return tools.filter((tool) => tool.name === "find" || tool.name === "read_file");
  }

  return tools;
}

function hasEnoughProjectOverviewEvidence(
  toolUsage: Map<string, number>,
  availableTools: AgentTool[],
): boolean {
  const hasTool = (name: string) => availableTools.some((tool) => tool.name === name);
  const used = (name: string) => (toolUsage.get(name) ?? 0) > 0;

  const requiredTools = ["ls", "find", "grep", "read_file"].filter(hasTool);
  const usedRequiredTools = requiredTools.every(used);
  const readCount = toolUsage.get("read_file") ?? 0;

  return usedRequiredTools && (!hasTool("read_file") || readCount >= 2);
}

function buildProjectOverviewReminder(): string {
  return [
    "You tried to answer a broad project-overview question before gathering enough evidence.",
    "Before answering, use the repository tools in this order: ls for the root, find for source/config files, grep for entry points or command wiring, and read_file for package.json plus relevant source files.",
    "Then answer with concrete file-based evidence.",
  ].join("\n");
}

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
  const toolUsage = new Map<string, number>();
  const requiresProjectOverviewResearch = isProjectOverviewPrompt(prompt);
  const activeTools = selectToolsForPrompt(prompt, tools);
  let projectOverviewReminders = 0;

  while (true) {
    const request: ChatRequest = {
      provider,
      apiKey,
      prompt,
      history: messages,
      tools: activeTools,
    };

    let response;

    if (provider === "openai") {
      response = await executeOpenAI(request);
    } else if (provider === "gemini") {
      response = await executeGemini(request);
    } else {
      throw new Error("Unknown provider");
    }

    messages.push(response?.rawMessage);

    if (response?.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const tool = activeTools.find((t) => t.name === toolCall.name);

        if (tool) {
          const result = await tool.execute(toolCall.arguments);
          toolUsage.set(tool.name, (toolUsage.get(tool.name) ?? 0) + 1);

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
      if (
        requiresProjectOverviewResearch &&
        !hasEnoughProjectOverviewEvidence(toolUsage, activeTools) &&
        projectOverviewReminders < 2
      ) {
        projectOverviewReminders += 1;
        messages.push({
          role: "user",
          content: buildProjectOverviewReminder(),
        });
        continue;
      }

      return response.text;
    }
  }
}
