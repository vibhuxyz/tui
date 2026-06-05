import { glob } from "glob";
import { AgentTool } from "../types";

export const findTool: AgentTool = {
  name: "find",
  label: "find files",
  description: "The BEST tool for recursively finding files by extension (e.g. '**/*.ts') or searching deep directory trees. Always use this instead of 'ls' when looking for specific files.",
  schema: {
    type: "function",
    function: {
      name: "find",
      description:
        "The BEST tool for recursively finding files by extension (e.g. '**/*.ts') or searching deep directory trees. Always use this instead of 'ls' when looking for specific files.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description:
              "Glob pattern to match files, e.g. '*.ts', '**/*.json', or 'src/**/*.ts'",
          },
          dirPath: {
            type: "string",
            description:
              "Directory to search in (default: current directory '.')",
          },
        },
        required: ["pattern"],
      },
    },
  },

  execute: async (args: any) => {
    try {
      const pattern = args.pattern;
      const targetPath = args.dirPath || ".";

      console.log(
        `\n system runing 'find for pattern ${pattern} in ${targetPath}`,
      );

      const files = await glob(pattern, {
        cwd: targetPath,
        ignore: ["**/node_modules/**", "**/.git/**"],
        nodir: true, // Only return files not the folders
      });

      if (files.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No files found by matching this pattern ${pattern}`,
            },
          ],
          details: {},
        };
      }

      const limit = 100;

      let output = files.slice(0, limit).join("\n");

      if (files.length > limit) {
        output += `\n\n[Warning: Output truncated. ${files.length} total results found, showing first ${limit}.]`;
      }
      return {
        content: [{ type: "text", text: output }],
        details: {},
      };
    } catch (error: any) {
      console.error(`find tool error ${error.message}`);
      return {
        content: [
          { type: "text", text: `Failed to excuate find: ${error.message}` },
        ],
        details: {},
      };
    }
  },
};
