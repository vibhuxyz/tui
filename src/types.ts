export interface AgentToolResult<T = any> {
  content: { type: "text"; text: string }[];
  details?: T;
  terminate?: boolean;
}

export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface AgentTool {
  name: string;
  label: string;
  description: string;
  schema: ToolSchema;
  execute: (args: any) => Promise<AgentToolResult>;
  executionMode?: "sequential" | "parallel";
}
