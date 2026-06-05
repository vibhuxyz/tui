import { AgentTool } from "../types";

export interface ChatRequest {
  provider: "openai" | "gemini";
  apiKey: string;
  prompt: string;
  history: any[];
  tools: AgentTool[];
}

export interface ChatResponse {
  text: string | null;
  toolCalls: Array<{ id: string; name: string; arguments: any }> | null;
  rawMessage: any;
}
