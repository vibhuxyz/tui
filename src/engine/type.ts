import { AgentTool } from "../types";

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface UserMessage {
  role: "user";
  content: string;
}

export interface SystemMessage {
  role: "system";
  content: string;
}

export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  toolCalls?: AgentToolCall[];
}

export interface ToolResultMessage {
  role: "tool";
  toolCallId: string;
  name: string;
  content: string;
}

export type AgentMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage;

export interface AgentContext {
  cwd: string;
  activeToolNames: string[];
}


export interface AgentToolResult {
  content: { type: "text", text: string }[];
  metadata?:any
}


export interface BeforeToolCallContext {
  toolCall: AgentToolCall;
  context:AgentContext
}

export interface AfterToolCallContext {
  toolCall: AgentToolCall;
  result: AgentToolResult;
  context:AgentContext
}