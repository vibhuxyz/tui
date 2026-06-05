import { rootCertificates } from "node:tls";
import { AgentMessage } from "./type";
import { execPath } from "node:process";

export function convertToLlm(
  message: AgentMessage[],
  provider: "openai" | "gemini",
) {
  if (provider === "openai") {
    return convertToOpenAi(message);
  }

  throw new Error("Provider not supported yet");
}

export function convertToOpenAi(message: AgentMessage[]): any[] {
  return message.map((msg) => {
    switch (msg.role) {
      case "system":
      case "user":
        return { role: msg.role, content: msg.content };

      case "assistant":
        return {
          role: "assistant",
          content: msg.content,
          tool_calls: msg.toolCalls?.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              agruments: JSON.stringify(tc.arguments),
            },
          })),
        };

      case "tool":
        return {
          role: "tool",
          tool_call_id: msg.toolCallId,
          content: msg.content,
        };

      default:
        const _exhaustiveCheck: never = msg;
        return _exhaustiveCheck;
    }
  });
}

export function convertToGeminiAi(message: AgentMessage[]): any {
  return message.map((msg) => {
    switch (msg.role) {
      case "user":
        return { role: "user", parts: [{ text: msg.content }] };

      case "assistant":
        return {
          role: "model",
          parts: [
            ...(msg.content ? [{ text: msg.content }] : []),
            ...(msg.toolCalls?.map((tc) => ({
              functionCall: {
                name: tc.name,
                args: tc.arguments,
              },
            })) || []),
          ],
        };
      case "tool":
        return {
          role: "function",
          parts: [
            {
              functionResponse: {
                name: msg.name,
                response: { content: msg.content },
              },
            },
          ],
        };

      default:
        return { role: "user", parts: [{ text: "" }] };
    }
  });
}
