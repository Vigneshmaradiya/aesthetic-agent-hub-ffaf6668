import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMProvider,
  LLMProviderConfig,
  LLMMessage,
  ToolDefinition,
  LLMStreamEvent,
  ToolCallRequest,
} from "../types";

/** Convert canonical messages to Anthropic format. */
function convertMessages(
  messages: LLMMessage[],
): Anthropic.Messages.MessageParam[] {
  const result: Anthropic.Messages.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "system") continue; // system is a top-level param

    if (msg.role === "assistant" && msg.toolCalls?.length) {
      // Assistant message with tool calls → content blocks
      const content: Anthropic.Messages.ContentBlockParam[] = [];
      if (msg.content) {
        content.push({ type: "text", text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        content.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.arguments,
        });
      }
      result.push({ role: "assistant", content });
    } else if (msg.role === "user" && msg.toolResults?.length) {
      // Tool results → user message with tool_result content blocks
      const content: Anthropic.Messages.ToolResultBlockParam[] =
        msg.toolResults.map((tr) => ({
          type: "tool_result" as const,
          tool_use_id: tr.toolCallId,
          content: tr.content,
          is_error: tr.isError,
        }));
      result.push({ role: "user", content });
    } else {
      result.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  return result;
}

/** Convert tool definitions to Anthropic tool format. */
function convertTools(tools: ToolDefinition[]): Anthropic.Messages.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: t.parameters.properties as unknown as Record<
        string,
        Anthropic.Messages.Tool.InputSchema
      >,
      required: t.parameters.required,
    },
  }));
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;

  async *streamCompletion(
    messages: LLMMessage[],
    tools: ToolDefinition[],
    config: LLMProviderConfig,
    signal?: AbortSignal,
  ): AsyncGenerator<LLMStreamEvent> {
    const client = new Anthropic({ apiKey: config.apiKey });

    const systemMessage =
      messages.find((m) => m.role === "system")?.content ?? undefined;
    const conversationMessages = convertMessages(
      messages.filter((m) => m.role !== "system"),
    );
    const anthropicTools = convertTools(tools);

    const stream = client.messages.stream(
      {
        model: config.model,
        max_tokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0.3,
        system: systemMessage,
        messages: conversationMessages,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      },
      { signal },
    );

    // Track current tool call being built
    let currentToolCall: Partial<ToolCallRequest> | null = null;
    let currentToolArgs = "";

    try {
      for await (const event of stream) {
        if (signal?.aborted) return;

        switch (event.type) {
          case "content_block_start":
            if (event.content_block.type === "tool_use") {
              currentToolCall = {
                id: event.content_block.id,
                name: event.content_block.name,
              };
              currentToolArgs = "";
              yield {
                type: "tool_call_start",
                toolCall: {
                  id: event.content_block.id,
                  name: event.content_block.name,
                },
              };
            }
            break;

          case "content_block_delta":
            if (event.delta.type === "text_delta") {
              yield { type: "text_delta", text: event.delta.text };
            } else if (event.delta.type === "input_json_delta") {
              currentToolArgs += event.delta.partial_json;
              yield { type: "tool_call_delta", text: event.delta.partial_json };
            }
            break;

          case "content_block_stop":
            if (currentToolCall) {
              let parsedArgs: Record<string, unknown> = {};
              try {
                parsedArgs = JSON.parse(currentToolArgs);
              } catch {
                /* empty args */
              }
              yield {
                type: "tool_call_end",
                toolCall: {
                  id: currentToolCall.id,
                  name: currentToolCall.name,
                  arguments: parsedArgs,
                },
              };
              currentToolCall = null;
              currentToolArgs = "";
            }
            break;

          case "message_stop": {
            const finalMessage = await stream.finalMessage();
            yield {
              type: "done",
              usage: {
                inputTokens: finalMessage.usage.input_tokens,
                outputTokens: finalMessage.usage.output_tokens,
              },
            };
            break;
          }
        }
      }
    } catch (err) {
      if (signal?.aborted) return;
      const message =
        err instanceof Error ? err.message : "Anthropic API error";
      yield { type: "error", error: message };
    }
  }
}
