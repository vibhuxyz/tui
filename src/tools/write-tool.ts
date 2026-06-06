import * as fs from "fs/promises";
import * as path from "path";
import { AgentTool, AgentToolResult } from "../types";

export const writeTool: AgentTool = {
  name: "write_file",
  label: "Write File",
  description:
    "Write complete content to a new or existing file. This OVERWRITES the entire file. Use 'edit_file' for surgical changes.",
  schema: {
    type: "function",
    function: {
      name: "write_file",
      description: "Write text content to a file.",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The path to the file to write.",
          },
          content: {
            type: "string",
            description: "The full content to write to the file.",
          },
        },
        required: ["file_path", "content"],
      },
    },
  },
  execute: async (args: any): Promise<AgentToolResult> => {
    try {
      const fullPath = path.resolve(process.cwd(), args.file_path);
      // Ensure the directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, args.content, "utf-8");

      return {
        content: [
          { type: "text", text: `Successfully wrote to ${args.file_path}` },
        ],
        terminate: false,
      };
    } catch (error: any) {
      return {
        content: [
          { type: "text", text: `Failed to write file: ${error.message}` },
        ],
        terminate: false,
      };
    }
  },
};
