import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
  type Part,
  SchemaType,
} from "@google/generative-ai";
import type {
  LLMProvider,
  LLMProviderConfig,
  LLMMessage,
  ToolDefinition,
  LLMStreamEvent,
} from "../types";

/** Map JSON Schema types to Gemini SchemaType. */
function mapSchemaType(jsonType: string): SchemaType {
  switch (jsonType) {
    case "string":
      return SchemaType.STRING;
    case "number":
    case "integer":
      return SchemaType.NUMBER;
    case "boolean":
      return SchemaType.BOOLEAN;
    case "array":
      return SchemaType.ARRAY;
    case "object":
      return SchemaType.OBJECT;
    default:
      return SchemaType.STRING;
  }
}

/** Convert canonical messages to Gemini Content format. */
function convertMessages(messages: LLMMessage[]): Content[] {
  const result: Content[] = [];

  for (const msg of messages) {
    if (msg.role === "system") continue; // system is a model config param

    const geminiRole = msg.role === "assistant" ? "model" : "user";

    if (msg.role === "assistant" && msg.toolCalls?.length) {
      // Model message with function calls
      const parts: Part[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        parts.push({
          functionCall: {
            name: tc.name,
            args: tc.arguments,
          },
        });
      }
      result.push({ role: geminiRole, parts });
    } else if (msg.role === "user" && msg.toolResults?.length) {
      // Tool results as functionResponse parts
      const parts: Part[] = msg.toolResults.map((tr) => ({
        functionResponse: {
          name: tr.name,
          response: {
            result: tr.content,
            error: tr.isError ? tr.content : undefined,
          },
        },
      }));
      result.push({ role: "function" as Content["role"], parts });
    } else {
      result.push({
        role: geminiRole,
        parts: [{ text: msg.content }],
      });
    }
  }

  return result;
}

/** Convert tool definitions to Gemini FunctionDeclaration format. */
function convertTools(tools: ToolDefinition[]): FunctionDeclaration[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries(t.parameters.properties).map(([key, prop]) => [
          key,
          {
            type: mapSchemaType(prop.type),
            description: prop.description,
            ...(prop.enum ? { enum: prop.enum } : {}),
          },
        ]),
      ) as Record<string, never>,
      required: t.parameters.required,
    },
  })) as unknown as FunctionDeclaration[];
}

export class GoogleProvider implements LLMProvider {
  readonly name = "google" as const;

  async *streamCompletion(
    messages: LLMMessage[],
    tools: ToolDefinition[],
    config: LLMProviderConfig,
    signal?: AbortSignal,
  ): AsyncGenerator<LLMStreamEvent> {
    const genAI = new GoogleGenerativeAI(config.apiKey);

    const systemMessage =
      messages.find((m) => m.role === "system")?.content ?? undefined;

    const geminiFunctions = convertTools(tools);
    const geminiTools =
      geminiFunctions.length > 0
        ? [{ functionDeclarations: geminiFunctions }]
        : undefined;

    const model = genAI.getGenerativeModel({
      model: config.model,
      tools: geminiTools,
      systemInstruction: systemMessage
        ? { role: "system", parts: [{ text: systemMessage }] }
        : undefined,
      generationConfig: {
        temperature: config.temperature ?? 0.3,
        maxOutputTokens: config.maxTokens ?? 4096,
      },
    });

    const contents = convertMessages(
      messages.filter((m) => m.role !== "system"),
    );

    try {
      const result = await model.generateContentStream({ contents });

      for await (const chunk of result.stream) {
        if (signal?.aborted) return;

        const candidates = chunk.candidates;
        if (!candidates?.length) continue;

        const parts = candidates[0].content?.parts;
        if (!parts) continue;

        for (const part of parts) {
          if ("text" in part && part.text) {
            yield { type: "text_delta", text: part.text };
          }

          if ("functionCall" in part && part.functionCall) {
            const fc = part.functionCall;
            const callId = crypto.randomUUID();
            // Gemini returns full function calls in one chunk
            yield {
              type: "tool_call_start",
              toolCall: { id: callId, name: fc.name },
            };
            yield {
              type: "tool_call_end",
              toolCall: {
                id: callId,
                name: fc.name,
                arguments: (fc.args as Record<string, unknown>) ?? {},
              },
            };
          }
        }
      }

      const response = await result.response;
      const usage = response.usageMetadata;
      yield {
        type: "done",
        usage: {
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
        },
      };
    } catch (err) {
      if (signal?.aborted) return;
      const message = err instanceof Error ? err.message : "Gemini API error";
      yield { type: "error", error: message };
    }
  }
}
