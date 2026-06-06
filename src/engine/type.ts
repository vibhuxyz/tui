import { AgentTool, AgentToolResult } from "../types";

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "toolCall"; toolCall: AgentToolCall }
  | { type: "thinking"; thinking: string };

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: any;
  metadata?: any;
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
  content: MessagePart[];
  toolCalls?: AgentToolCall[];
  stopReason?: "stop" | "tool_calls" | "error" | "aborted";
  metadata?: any;
}

export interface ToolResultMessage {
  role: "tool";
  toolCallId: string;
  name: string;
  content: string;
  isError?: boolean;
  terminate?: boolean;
  metadata?: any;
}

export type AgentMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage;

export interface AgentContext {
  cwd: string;
  messages: AgentMessage[];
  activeToolNames: string[];
  systemPrompt?: string;
  tools?: AgentTool[];
}

export interface BeforeToolCallContext {
  assistantMessage: AssistantMessage;
  toolCall: AgentToolCall;
  context: AgentContext;
}

export interface AfterToolCallContext {
  assistantMessage: AssistantMessage;
  toolCall: AgentToolCall;
  result: AgentToolResult;
  isError: boolean;
  context: AgentContext;
}

export interface ShouldStopAfterTurnContext {
  message: AssistantMessage;
  toolResults: ToolResultMessage[];
  context: AgentContext;
  newMessages: AgentMessage[];
}

import { ProviderName } from "../core/auth-storage";

export interface AgentLoopConfig {
  provider: ProviderName;
  apiKey: string;
  model?: string;
  maxTurns?: number;
  toolExecution?: "sequential" | "parallel";
  beforeToolCall?: (
    ctx: BeforeToolCallContext,
  ) => Promise<{ block?: boolean; reason?: string } | void>;
  shouldStopAfterTurn?: (ctx: ShouldStopAfterTurnContext) => Promise<boolean>;
}

export type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; message: AgentMessage[] }
  | { type: "turn_start" }
  | {
      type: "turn_end";
      message: AssistantMessage;
      toolResults: ToolResultMessage[];
    }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AssistantMessage }
  | { type: "message_end"; message: AgentMessage }
  | {
      type: "tool_execution_start";
      toolCallId: string;
      toolName: string;
      args: any;
    }
  | {
      type: "tool_execution_end";
      toolCallId: string;
      toolName: string;
      result: AgentToolResult;
      isError: boolean;
    };

export type AgentEventSink = (event: AgentEvent) => Promise<void> | void;

export type ExecutedToolCallBatch = {
  messages: ToolResultMessage[];
  terminate: boolean;
};
