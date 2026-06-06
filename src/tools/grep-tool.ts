import { rgPath } from "@vscode/ripgrep";

import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { AgentTool } from "../types";

const execFileAsync = promisify(execFile);

export const grepTool: AgentTool = {
  name: "grep",
  label: "find text",
  description: "Search for specific text inside files using ripgrep.",
  schema: {
    type: "function",
    function: {
      name: "grep",
      description:
        "Search for a specific string or regex pattern inside files in a directory. Uses ripgrep so it respects .gitignore.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "The text or regex pattern to search for.",
          },
          dirPath: {
            type: "string",
            description:
              "The directory to search in. Default is current directory '.'.",
          },
        },
        required: ["pattern"],
      },
    },
  },
  execute: async (agrs: any) => {
    try {
      const pattern = agrs.pattern;
      const targetPath = agrs.dirPath || ".";

      console.log(
        `\n system runing 'grep' for pattern ${pattern} in ${targetPath}`,
      );

      let stdout = "";

      try {
        // execFile bypasses the shell entirely, so we don't have to worry about
        // escaping quotes or bash syntax errors!
        const result = await execFileAsync(rgPath, [
          "-n",
          "-i",
          pattern,
          targetPath,
        ]);
        stdout = result.stdout;
      } catch (execError: any) {
        if (execError.code === 1) {
          return {
            content: [
              { type: "text", text: `No matches found for text: ${pattern}` },
            ],
            details: {},
          };
        }
        throw execError;
      }

      if (!stdout.trim()) {
        return {
          content: [
            { type: "text", text: `No matches found for text: ${pattern}` },
          ],
          details: {},
        };
      }

      const lines = stdout.split("\n");
      const limit = 50;
      let output = lines.slice(0, limit).join("\n");

      if (lines.length > limit) {
        output += `\n\n[Warning: Output truncated. ${lines.length} lines found, showing first ${limit}.]`;
      }

      return {
        content: [{ type: "text", text: output }],
        details: {},
      };
    } catch (error: any) {
      console.error(`grep tool error ${error.message}`);
      return {
        content: [
          { type: "text", text: `Failed to excuate grep: ${error.message}` },
        ],
        details: {},
      };
    }
  },
};
