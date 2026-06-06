import { AgentTool } from "../types";
import fs from "node:fs/promises";
import path from "node:path";
import { truncateByBytes } from "./truncate";

export const readTool: AgentTool = {
  name: "read_file",
  label: "Read File",
  description: "Read the text contents of a file.",
  schema: {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read the contents of a file. Use offset and limit for large files.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          offset: { type: "number" },
          limit: { type: "number" },
        },

        required: ["path"],
      },
    },
  },

  execute: async (args: any) => {
    try {
      const rawPath = args.path;
      const offset = args.offset || 1;
      const limit = args.limit || 500;

      const filePath = path.resolve(process.cwd(), rawPath);
      if (!filePath.startsWith(process.cwd())) {
        throw new Error(`Permission denied: Cannot read file outside of project directory: ${rawPath}`);
      }

      console.log(`\n system runing 'read' for pattern ${rawPath}`);

      await fs.access(filePath);

      // read the file contents
      const content = await fs.readFile(filePath, "utf-8");

      const allLines = content.split("\n");
      const totalLine = allLines.length;

      const startIndex = Math.max(0, offset - 1);

      if (startIndex >= totalLine) {
        throw new Error(
          `offset ${offset} is beyond the file lines ${totalLine} line total`,
        );
      }

      // apply the limit
      const endIndex = Math.min(startIndex + limit, totalLine);

      const selectedContent = allLines.slice(startIndex, endIndex).join("\n");

      let outputText = selectedContent;

      if (endIndex < totalLine) {
        const nextOffset = endIndex + 1;

        outputText += `\n\n [Warning:file truncated.  more line in the file, use offset=${nextOffset} to read next chunk ]`;
      }
      const safeOutput = truncateByBytes(outputText);

      return {
        content: [{ type: "text", text: safeOutput }],
        details: {},
      };
    } catch (error: any) {
      console.error(`read_file tool error ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Failed to excuate read_file: ${error.message}`,
          },
        ],
        details: {},
      };
    }
  },
};
