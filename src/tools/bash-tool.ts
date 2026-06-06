
import { exec } from "child_process";
import { promisify } from "util";
import { AgentTool, AgentToolResult } from "../types";

const execAsync = promisify(exec);

export const bashTool: AgentTool = {
  name: "bash",
  label: "Bash Command",
  description: "Execute a bash command in the terminal. Use this for installing packages, running tests, or git operations.",
  schema: {
    type: "function",
    function: {
      name: "bash",
      description: "Execute a shell command.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute.",
          },
        },
        required: ["command"],
      },
    },
  },
  execute: async (args: any): Promise<AgentToolResult> => {
    try {
      const { stdout, stderr } = await execAsync(args.command, { cwd: process.cwd() });
      const output = stdout + (stderr ? `\nErrors:\n${stderr}` : "");
      return {
        content: [{ type: "text", text: output.trim() || "Command executed successfully with no output." }],
        terminate: false,
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Command failed: ${error.message}\n${error.stdout || ""}\n${error.stderr || ""}` }],
        terminate: false,
      };
    }
  },
};
