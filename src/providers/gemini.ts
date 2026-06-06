import { ChatRequest, ChatResponse } from "../core/model-registry";

function toGeminiContents(history: any[]) {
  return history
    .filter((message) => message.role !== "system")
    .map((message) => {
      if (message.role === "assistant") {
        if (message.metadata?.geminiParts) {
          return {
            role: "model",
            parts: message.metadata.geminiParts,
          };
        }

        const parts = message.content.map((part: any) => {
          if (part.type === "text") {
            return { text: part.text };
          }
          if (part.type === "toolCall") {
            return {
              functionCall: {
                name: part.toolCall.name,
                args: part.toolCall.arguments,
                ...part.toolCall.metadata,
              },
            };
          }
          return { text: "" };
        });
        return {
          role: "model",
          parts: parts,
        };
      }

      if (message.role === "tool") {
        return {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: message.name,
                response: { result: message.content },
              },
            },
          ],
        };
      }

      return {
        role: "user",
        parts: [{ text: message.content ?? "" }],
      };
    });
}

export async function executeGemini(req: ChatRequest): Promise<ChatResponse> {
  const systemMessage = req.history.find(
    (message) => message.role === "system",
  );
  const tools = req.tools.map((tool) => tool.schema.function);

  const modelToUse = req.model || "gemini-3-flash-preview";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": req.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: systemMessage
          ? { parts: [{ text: systemMessage.content }] }
          : undefined,
        contents: toGeminiContents(req.history),
        tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Gemini API Error: ${response.statusText}\nDetails: ${JSON.stringify(errorData, null, 2)}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part: any) => typeof part.text === "string")
    .map((part: any) => part.text)
    .join("");
  const functionCalls = parts.filter((part: any) => part.functionCall);

  return {
    text: text || null,
    toolCalls:
      functionCalls.length > 0
        ? functionCalls.map((part: any, index: number) => {
            const { name, args, ...rest } = part.functionCall;
            return {
              id: `gemini-tool-${index}`,
              name: name,
              arguments: args ?? {},
              metadata: rest, 
            };
          })
        : null,
    rawMessage: {
      role: "assistant",
      content: text || null,
      geminiParts: parts,
    },
  };
}
