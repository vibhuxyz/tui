import { AgentTool, AgentToolResult } from "../types";

export const planTool: AgentTool = {
  name: "propose_plan",
  label: "Propose Plan",
  description:
    "CRITICAL: Orchestrator only. Do NOT call this tool until a scout subagent has thoroughly explored the codebase and returned evidence. Use this tool to propose a step-by-step plan for the user to review BEFORE executing mutating work.",
  schema: {
    type: "function",
    function: {
      name: "propose_plan",
      description: "CRITICAL: Must ONLY be called AFTER the scout subagent has researched the codebase. Propose a step-by-step plan.",
      parameters: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            items: {
              type: "string",
            },
            description:
              "An array of detailed steps explaining what you plan to do. Mention which steps are read-only and which steps require user approval because they edit, write, delete, or run mutating commands.",
          },
        },
        required: ["steps"],
      },
    },
  },
  execute: async (args: any): Promise<AgentToolResult> => {
    return {
      content: [{ type: "text", text: JSON.stringify(args) }],
      terminate: true,
    };
  },
};
