import { ProviderName } from "../core/auth-storage";
import { AgentMessage, AssistantMessage, ToolResultMessage } from "./type";

export function convertToLlm(
  messages: AgentMessage[],
  provider: ProviderName,
) {
  if (provider === "openai") {
    return convertToOpenAi(messages);
  } else if (provider === "gemini") {
    return messages;
  }

  throw new Error(`Provider ${provider} not supported yet`);
}

export function convertToOpenAi(messages: AgentMessage[]): any[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case "system":
      case "user":
        return { role: msg.role, content: msg.content };

      case "assistant": {
        const textContent = msg.content
          .filter((part) => part.type === "text")
          .map((part: any) => part.text)
          .join("\n");

        const toolCalls = msg.content
          .filter((part) => part.type === "toolCall")
          .map((part: any) => part.toolCall);

        return {
          role: "assistant",
          content: textContent || null,
          tool_calls:
            toolCalls.length > 0
              ? toolCalls.map((tc: any) => ({
                  id: tc.id,
                  type: "function",
                  function: {
                    name: tc.name,
                    arguments: JSON.stringify(tc.arguments),
                  },
                }))
              : undefined,
        };
      }

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

export function convertToGeminiAi(messages: AgentMessage[]): any[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case "system":
        return msg;

      case "user":
        return { role: "user", parts: [{ text: msg.content }] };

      case "assistant": {
        const parts = msg.content.map((part) => {
          if (part.type === "text") {
            return { text: part.text };
          } else if (part.type === "toolCall") {
            return {
              functionCall: {
                name: part.toolCall.name,
                args: part.toolCall.arguments,
              },
            };
          } else if (part.type === "thinking") {
              return { text: `Thinking: ${part.thinking}` };
          }
          return { text: "" };
        });
        return { role: "model", parts };
      }

      case "tool":
        return {
          role: "user", // Gemini uses 'user' role for function responses in some SDKs, or 'function'
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
