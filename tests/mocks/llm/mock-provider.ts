import type {
  LLMProvider,
  LLMStreamEvent,
  LLMMessage,
  ToolDefinition,
  LLMProviderConfig,
  LLMProviderName,
} from "@/lib/llm/types";

/**
 * Configurable mock LLM provider for testing.
 * Yields preset events in sequence, simulating streaming LLM responses.
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = "anthropic" as LLMProviderName; // Use a valid provider name for type safety
  private responses: LLMStreamEvent[][] = [];
  private callCount = 0;

  /** History of all calls made to this provider. */
  public calls: Array<{
    messages: LLMMessage[];
    tools: ToolDefinition[];
    config: LLMProviderConfig;
  }> = [];

  /**
   * Queue a sequence of events to be yielded on the next call.
   * Each call to streamCompletion pops the next response.
   */
  addResponse(events: LLMStreamEvent[]): void {
    this.responses.push(events);
  }

  /**
   * Convenience: queue a simple text response.
   */
  addTextResponse(text: string): void {
    this.addResponse([
      { type: "text_delta", text },
      { type: "done", usage: { inputTokens: 10, outputTokens: 5 } },
    ]);
  }

  /**
   * Convenience: queue a response with a tool call.
   */
  addToolCallResponse(
    toolName: string,
    args: Record<string, unknown>,
    followUpText?: string,
  ): void {
    const toolCallId = `mock-tc-${this.responses.length}`;
    const events: LLMStreamEvent[] = [
      {
        type: "tool_call_start",
        toolCall: { id: toolCallId, name: toolName, arguments: {} },
      },
      {
        type: "tool_call_end",
        toolCall: { id: toolCallId, name: toolName, arguments: args },
      },
      { type: "done", usage: { inputTokens: 20, outputTokens: 10 } },
    ];
    this.addResponse(events);

    // If there's a follow-up text after tool result, queue that too
    if (followUpText) {
      this.addTextResponse(followUpText);
    }
  }

  async *streamCompletion(
    messages: LLMMessage[],
    tools: ToolDefinition[],
    config: LLMProviderConfig,
    _signal?: AbortSignal,
  ): AsyncGenerator<LLMStreamEvent> {
    this.calls.push({ messages, tools, config });
    this.callCount++;

    const events = this.responses.shift();
    if (!events) {
      // Default: just return done
      yield { type: "done", usage: { inputTokens: 0, outputTokens: 0 } };
      return;
    }

    for (const event of events) {
      yield event;
    }
  }

  getCallCount(): number {
    return this.callCount;
  }
}
