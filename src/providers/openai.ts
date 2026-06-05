import { ChatRequest, ChatResponse } from "../core/model-registry";

export async function executeOpenAI(req: ChatRequest): Promise<ChatResponse> {
  const openaiTools = req.tools.map((t) => t.schema);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      messages: req.history,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      tool_choice: openaiTools.length > 0 ? "auto" : undefined,
    }),
  });

  if (!response.ok) {
    console.error("Open ai error ", response.statusText);
    const errorData = await response.json();
    console.error(
      "OpenAI API Error details:",
      JSON.stringify(errorData, null, 2),
    );
    process.exit(1);
  }

  const data = await response.json();
  const assistantMessage = data.choices[0].message;

  let toolCalls = null;

  if (assistantMessage.tool_calls) {
    toolCalls = assistantMessage.tool_calls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));
  }

  return {
    text: assistantMessage.content || null,
    toolCalls: toolCalls,
    rawMessage: assistantMessage,
  };
}
