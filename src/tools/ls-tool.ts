import fs from "node:fs/promises";
import { AgentTool } from "../types";
import path from "node:path";

export const lsTool: AgentTool = {
  name: "ls",
  label: "List Directory",
  description:
    "List directory contents for a SINGLE folder. DO NOT use this for deep recursive searching or finding specificfile types. Use the 'find' tool instead.",
  schema: {
    type: "function",
    function: {
      name: "ls",
      description:
        "List directory contents for a SINGLE folder. DO NOT use this for deep recursive searching or finding specific file types. Use the 'find' tool instead.",
      parameters: {
        type: "object",
        properties: {
          dirPath: {
            type: "string",
            description:
              "The directory path to list (e.g., '.', './src', '/Users/vibhu/'). Default is '.'.",
          },
        },
        required: [],
      },
    },
  },

  execute: async (args: any) => {
    try {
      const targetPath = args.dirPath || ".";

      console.log(`\n system runing ls for : ${targetPath}...`);

      try {
        await fs.access(targetPath);
      } catch (error) {
        throw new Error(`Path not found : ${targetPath}`);
      }

      const start = await fs.stat(targetPath);
      if (!start.isDirectory()) {
        throw new Error(`it is not a directory : ${targetPath}`);
      }

      const entires = await fs.readdir(targetPath);

      // Sort alphabetically
      entires.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

      const result: string[] = [];

      for (const entry of entires) {
        const fullPath = path.join(targetPath, entry);

        try {
          const entryStart = await fs.stat(fullPath);

          if (entryStart.isDirectory()) {
            result.push(entry + "/");
          } else {
            result.push(entry);
          }
        } catch (error) {
          // skip entries we cant read it
          result.push(entry);
        }
      }

      if (result.length === 0) {
        return {
          content: [{ type: "text", text: "(empty directory" }],
          details: {},
        };
      }

      const outputString = result.join("\n");
      return {
        content: [{ type: "text", text: outputString }],
        details: {},
      };
    } catch (error: any) {
      console.error(`Ls tool error ${error.message}`);
      return {
        content: [
          { type: "text", text: `Failed to list directory: ${error.message}` },
        ],
        details: {},
      };
    }
  },
};
