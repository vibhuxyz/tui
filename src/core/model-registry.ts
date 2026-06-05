import { AgentTool } from "../types";
import { ProviderName } from "./auth-storage";

export interface ChatRequest {
  provider: ProviderName;
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
