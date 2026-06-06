import { AgentTool, AgentToolResult } from "../engine/type";
import * as fs from "fs/promises";
import * as path from "path";

export const editTool: AgentTool = {
  name: "edit_file",
  label: "Edit File",
  description: "Surgically replace text in an existing file. Provide the EXACT old string you want to replace, and the EXACT new string.",
  schema: {
    type: "function",
    function: {
      name: "edit_file",
      description: "Replace a specific string of text within a file.",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The path to the file to edit.",
          },
          old_string: {
            type: "string",
            description: "The EXACT literal text currently in the file that you want to replace.",
          },
          new_string: {
            type: "string",
            description: "The literal text to replace it with.",
          },
        },
        required: ["file_path", "old_string", "new_string"],
      },
    },
  },
  execute: async (args: any): Promise<AgentToolResult> => {
    try {
      const fullPath = path.resolve(process.cwd(), args.file_path);
      const content = await fs.readFile(fullPath, "utf-8");

      if (!content.includes(args.old_string)) {
        return {
          content: [{ type: "text", text: `Edit failed: Could not find the exact 'old_string' in ${args.file_path}. Make sure whitespace and indentation match perfectly.` }],
          terminate: false,
        };
      }

      // Check for multiple occurrences to warn the agent
      const occurrences = content.split(args.old_string).length - 1;
      if (occurrences > 1) {
         return {
          content: [{ type: "text", text: `Edit failed: 'old_string' was found ${occurrences} times. Your old_string must be unique to avoid accidental replacements.` }],
          terminate: false,
        };
      }

      const newContent = content.replace(args.old_string, args.new_string);
      await fs.writeFile(fullPath, newContent, "utf-8");
      
      return {
        content: [{ type: "text", text: `Successfully edited ${args.file_path}` }],
        terminate: false,
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to edit file: ${error.message}` }],
        terminate: false,
      };
    }
  },
};
