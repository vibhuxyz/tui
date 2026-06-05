import { executeOpenAI } from "../providers/openai";
import { executeGemini } from "../providers/gemini";
import { convertToLlm } from "./messages";
import {
  AgentContext,
  AgentEventSink,
  AgentLoopConfig,
  AgentMessage,
  AgentToolCall,
  AssistantMessage,
  ExecutedToolCallBatch,
  ToolResultMessage,
} from "./type";

export async function runAgentLoop(
  prompts: AgentMessage[],
  context: AgentContext,
  config: AgentLoopConfig,
  emit: AgentEventSink,
): Promise<AgentMessage[]> {
  const newMessages: AgentMessage[] = [...prompts];

  const currentContext: AgentContext = {
    ...context,
    messages: [...context.messages, ...prompts],
  };

  await emit({ type: "agent_start" });

  for (const prompt of prompts) {
    await emit({ type: "message_start", message: prompt });
    await emit({ type: "message_end", message: prompt });
  }

  await runLoop(currentContext, newMessages, config, emit);

  await emit({ type: "agent_end", message: newMessages });

  return newMessages;
}

async function runLoop(
  initialContext: AgentContext,
  newMessages: AgentMessage[],
  config: AgentLoopConfig,
  emit: AgentEventSink,
  signal?: AbortSignal,
): Promise<void> {
  let currentContext = initialContext;
  let hasMoreToolCalls = true;
  let turnCount = 0;

  while (hasMoreToolCalls) {
    if (signal?.aborted) return;
    if (config.maxTurns && turnCount >= config.maxTurns) break;
    turnCount++;

    await emit({ type: "turn_start" });

    const message = await streamAssistantResponse(
      currentContext,
      config,
      signal,
      emit,
    );

    currentContext.messages.push(message);
    newMessages.push(message);

    if (message.stopReason === "error" || message.stopReason === "aborted") {
      await emit({ type: "turn_end", message, toolResults: [] });
      return;
    }

    const toolCalls = message.content
      .filter(
        (part): part is { type: "toolCall"; toolCall: AgentToolCall } =>
          part.type === "toolCall",
      )
      .map((part) => part.toolCall);

    const toolResults: ToolResultMessage[] = [];
    hasMoreToolCalls = false;

    if (toolCalls.length > 0) {
      const resultBatch = await executeToolCalls(
        currentContext,
        message,
        config,
        signal,
        emit,
      );
      toolResults.push(...resultBatch.messages);
      hasMoreToolCalls = !resultBatch.terminate;
      
      for (const result of toolResults) {
        currentContext.messages.push(result);
        newMessages.push(result);
      }
    }

    await emit({ type: "turn_end", message, toolResults });

    if (config.shouldStopAfterTurn) {
      const stop = await config.shouldStopAfterTurn({
        message,
        toolResults,
        context: currentContext,
        newMessages,
      });
      if (stop) break;
    }
    
    // If no tool calls, we stop unless hasMoreToolCalls was set by some other logic
    if (toolCalls.length === 0) {
        hasMoreToolCalls = false;
    }
  }
}

async function streamAssistantResponse(
  context: AgentContext,
  config: AgentLoopConfig,
  signal: AbortSignal | undefined,
  emit: AgentEventSink,
): Promise<AssistantMessage> {
  const llmMessages = convertToLlm(context.messages, config.provider);

  const activeTools =
    context.tools?.filter((t) => context.activeToolNames.includes(t.name)) ||
    [];

  const partialMessage: AssistantMessage = { role: "assistant", content: [] };
  await emit({ type: "message_start", message: partialMessage });

  try {
    let response;
    if (config.provider === "openai") {
      response = await executeOpenAI({
        apiKey: config.apiKey,
        history: llmMessages,
        tools: activeTools,
        provider: "openai",
        prompt: "",
      });
    } else if (config.provider === "gemini") {
        response = await executeGemini({
            apiKey: config.apiKey,
            history: llmMessages,
            tools: activeTools,
            provider: "gemini",
            prompt: "",
        });
    } else {
      throw new Error(`provider ${config.provider} not implemented`);
    }

    const assistantMsg: AssistantMessage = {
      role: "assistant",
      content: [
        ...(response.text
          ? [{ type: "text" as const, text: response.text }]
          : []),
        ...(response.toolCalls?.map((tc) => ({
          type: "toolCall" as const,
          toolCall: tc,
        })) || []),
      ],
      stopReason:
        response.toolCalls && response.toolCalls.length > 0
          ? "tool_calls"
          : "stop",
      metadata: response.rawMessage?.geminiParts
        ? { geminiParts: response.rawMessage.geminiParts }
        : undefined,
    };

    await emit({ type: "message_end", message: assistantMsg });

    return assistantMsg;
  } catch (error) {
    const errorMsg: AssistantMessage = {
      role: "assistant",
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      stopReason: "error",
    };

    await emit({ type: "message_end", message: errorMsg });
    return errorMsg;
  }
}

async function executeToolCalls(
  currentContext: AgentContext,
  assistantMessage: AssistantMessage,
  config: AgentLoopConfig,
  signal: AbortSignal | undefined,
  emit: AgentEventSink,
): Promise<ExecutedToolCallBatch> {
  const toolCalls = assistantMessage.content
    .filter(
      (part): part is { type: "toolCall"; toolCall: AgentToolCall } =>
        part.type === "toolCall",
    )
    .map((part) => part.toolCall);

  const hasSequentialToolCall = toolCalls.some((tc) => {
    const tool = currentContext.tools?.find((t) => t.name === tc.name);
    return tool?.executionMode === "sequential";
  });

  if (config.toolExecution === "sequential" || hasSequentialToolCall) {
    return executeToolCallsSequential(
      currentContext,
      assistantMessage,
      toolCalls,
      config,
      signal,
      emit,
    );
  }

  return executeToolCallsParallel(
    currentContext,
    assistantMessage,
    toolCalls,
    config,
    signal,
    emit,
  );
}

async function executeToolCallsSequential(
  currentContext: AgentContext,
  assistantMessage: AssistantMessage,
  toolCalls: AgentToolCall[],
  config: AgentLoopConfig,
  signal: AbortSignal | undefined,
  emit: AgentEventSink,
): Promise<ExecutedToolCallBatch> {
  const messages: ToolResultMessage[] = [];
  let terminateBatch = false;
  for (const toolCall of toolCalls) {
    if (signal?.aborted) break;
    const result = await runSingleTool(
      currentContext,
      assistantMessage,
      toolCall,
      config,
      signal,
      emit,
    );
    messages.push(result);
    if (result.terminate) {
      terminateBatch = true;
      break;
    }
  }
  return { messages, terminate: terminateBatch };
}

async function executeToolCallsParallel(
  currentContext: AgentContext,
  assistantMessage: AssistantMessage,
  toolCalls: AgentToolCall[],
  config: AgentLoopConfig,
  signal: AbortSignal | undefined,
  emit: AgentEventSink,
): Promise<ExecutedToolCallBatch> {
  const toolPromises = toolCalls.map((toolCall) =>
    runSingleTool(currentContext, assistantMessage, toolCall, config, signal, emit),
  );
  const results = await Promise.all(toolPromises);
  return {
    messages: results,
    terminate: results.some((r) => r.terminate),
  };
}

async function runSingleTool(
  context: AgentContext,
  assistantMsg: AssistantMessage,
  toolCall: AgentToolCall,
  config: AgentLoopConfig,
  signal: AbortSignal | undefined,
  emit: AgentEventSink,
): Promise<ToolResultMessage> {
  const tool = context.tools?.find((t) => t.name === toolCall.name);
  if (!tool) {
    return {
      role: "tool",
      toolCallId: toolCall.id,
      name: toolCall.name,
      content: `Error: Tool ${toolCall.name} not found`,
      isError: true,
    };
  }

  await emit({
    type: "tool_execution_start",
    toolCallId: toolCall.id,
    toolName: tool.name,
    args: toolCall.arguments,
  });

  if (config.beforeToolCall) {
    const hookResult = await config.beforeToolCall({
      assistantMessage: assistantMsg,
      toolCall,
      context,
    });
    if (hookResult?.block) {
      const blockedResult: ToolResultMessage = {
        role: "tool",
        toolCallId: toolCall.id,
        name: tool.name,
        content: `Blocked: ${hookResult.reason}`,
        isError: true,
      };
      await emit({
        type: "tool_execution_end",
        toolCallId: toolCall.id,
        toolName: tool.name,
        result: { content: [{ type: "text", text: blockedResult.content }] },
        isError: true,
      });
      return blockedResult;
    }
  }

  try {
    const result = await tool.execute(toolCall.arguments);
    const finalizedResult: ToolResultMessage = {
      role: "tool",
      toolCallId: toolCall.id,
      name: tool.name,
      content: result.content[0].text,
      terminate: result.terminate,
    };

    await emit({
      type: "tool_execution_end",
      toolCallId: toolCall.id,
      toolName: tool.name,
      result,
      isError: false,
    });

    return finalizedResult;
  } catch (error) {
    const errorResult: ToolResultMessage = {
      role: "tool",
      toolCallId: toolCall.id,
      name: tool.name,
      content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      isError: true,
    };
    await emit({
      type: "tool_execution_end",
      toolCallId: toolCall.id,
      toolName: tool.name,
      result: { content: [{ type: "text", text: errorResult.content }] },
      isError: true,
    });
    return errorResult;
  }
}
