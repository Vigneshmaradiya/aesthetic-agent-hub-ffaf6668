import OpenAI from "openai";
import type {
  LLMProvider,
  LLMProviderConfig,
  LLMMessage,
  ToolDefinition,
  LLMStreamEvent,
} from "../types";

/** Convert canonical messages to OpenAI format. */
function convertMessages(
  messages: LLMMessage[],
  isReasoningModel: boolean,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // o1/o3 models use "developer" role instead of "system"
      result.push({
        role: isReasoningModel ? "developer" : "system",
        content: msg.content,
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
      continue;
    }

    if (msg.role === "assistant" && msg.toolCalls?.length) {
      result.push({
        role: "assistant",
        content: msg.content || null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      });
    } else if (msg.role === "user" && msg.toolResults?.length) {
      // Each tool result is a separate "tool" message
      for (const tr of msg.toolResults) {
        result.push({
          role: "tool",
          tool_call_id: tr.toolCallId,
          content: tr.content,
        });
      }
    } else {
      result.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  return result;
}

/** Convert tool definitions to OpenAI function format. */
function convertTools(
  tools: ToolDefinition[],
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: "object",
        properties: t.parameters.properties,
        required: t.parameters.required,
      },
    },
  }));
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;

  async *streamCompletion(
    messages: LLMMessage[],
    tools: ToolDefinition[],
    config: LLMProviderConfig,
    signal?: AbortSignal,
  ): AsyncGenerator<LLMStreamEvent> {
    const client = new OpenAI({ apiKey: config.apiKey });

    const isReasoningModel =
      config.model.startsWith("o1") || config.model.startsWith("o3");

    const openaiMessages = convertMessages(messages, isReasoningModel);
    const openaiTools = convertTools(tools);

    try {
      const stream = await client.chat.completions.create(
        {
          model: config.model,
          messages: openaiMessages,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          stream: true,
          ...(isReasoningModel
            ? { max_completion_tokens: config.maxTokens ?? 4096 }
            : {
                max_completion_tokens: config.maxTokens ?? 4096,
                temperature: config.temperature ?? 0.3,
              }),
        },
        { signal },
      );

      // Track tool calls being built incrementally (indexed)
      const pendingToolCalls = new Map<
        number,
        { id: string; name: string; args: string }
      >();

      for await (const chunk of stream) {
        if (signal?.aborted) return;

        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta;

        // Text content
        if (delta.content) {
          yield { type: "text_delta", text: delta.content };
        }

        // Tool calls (streamed incrementally by index)
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;

            if (!pendingToolCalls.has(idx)) {
              // New tool call
              pendingToolCalls.set(idx, {
                id: tc.id ?? "",
                name: tc.function?.name ?? "",
                args: tc.function?.arguments ?? "",
              });
              yield {
                type: "tool_call_start",
                toolCall: { id: tc.id, name: tc.function?.name },
              };
            } else {
              // Append to existing
              const pending = pendingToolCalls.get(idx)!;
              if (tc.id) pending.id = tc.id;
              if (tc.function?.name) pending.name += tc.function.name;
              if (tc.function?.arguments) {
                pending.args += tc.function.arguments;
              }
              yield {
                type: "tool_call_delta",
                text: tc.function?.arguments,
              };
            }
          }
        }

        // Finish reason
        if (
          choice.finish_reason === "stop" ||
          choice.finish_reason === "tool_calls"
        ) {
          // Finalize any pending tool calls
          for (const [, pending] of pendingToolCalls) {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = JSON.parse(pending.args);
            } catch {
              /* empty args */
            }
            yield {
              type: "tool_call_end",
              toolCall: {
                id: pending.id,
                name: pending.name,
                arguments: parsedArgs,
              },
            };
          }
          pendingToolCalls.clear();
        }
      }

      yield {
        type: "done",
        usage: { inputTokens: 0, outputTokens: 0 }, // OpenAI streams don't include usage per chunk
      };
    } catch (err) {
      if (signal?.aborted) return;
      const message = err instanceof Error ? err.message : "OpenAI API error";
      yield { type: "error", error: message };
    }
  }
}
