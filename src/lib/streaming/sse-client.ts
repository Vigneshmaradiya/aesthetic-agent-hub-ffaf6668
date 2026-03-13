export type SSEEventType =
  | "message"
  | "thought"
  | "tool_call"
  | "tool_result"
  | "done"
  | "error";

export interface SSEEvent {
  type: SSEEventType;
  data: string;
}

export interface SSEHandlers {
  onMessage?: (data: string) => void;
  onThought?: (data: string) => void;
  onToolCall?: (data: string) => void;
  onToolResult?: (data: string) => void;
  onDone?: (data: string) => void;
  onError?: (data: string) => void;
}

/**
 * Parse SSE-formatted text into structured events.
 * Handles the format: event: xxx\ndata: xxx\n\n
 */
function parseSSEChunk(text: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const blocks = text.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    let eventType: SSEEventType = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim() as SSEEventType;
      } else if (line.startsWith("data: ")) {
        dataLines.push(line.slice(6));
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5));
      }
    }

    const data = dataLines.join("\n");
    if (data || eventType === "done") {
      events.push({ type: eventType, data });
    }
  }

  return events;
}

/**
 * Create an SSE connection using fetch + ReadableStream (not EventSource).
 * Returns an AbortController for cancellation.
 */
export function createSSEConnection(
  url: string,
  body: Record<string, unknown>,
  handlers: SSEHandlers,
): AbortController {
  const controller = new AbortController();

  const run = async () => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        handlers.onError?.(
          JSON.stringify({
            status: response.status,
            message: response.statusText,
          }),
        );
        return;
      }

      if (!response.body) {
        handlers.onError?.(JSON.stringify({ message: "No response body" }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (terminated by double newline)
        const lastDoubleNewline = buffer.lastIndexOf("\n\n");
        if (lastDoubleNewline === -1) continue;

        const completeChunk = buffer.slice(0, lastDoubleNewline + 2);
        buffer = buffer.slice(lastDoubleNewline + 2);

        const events = parseSSEChunk(completeChunk);

        for (const event of events) {
          switch (event.type) {
            case "message":
              handlers.onMessage?.(event.data);
              break;
            case "thought":
              handlers.onThought?.(event.data);
              break;
            case "tool_call":
              handlers.onToolCall?.(event.data);
              break;
            case "tool_result":
              handlers.onToolResult?.(event.data);
              break;
            case "done":
              handlers.onDone?.(event.data);
              break;
            case "error":
              handlers.onError?.(event.data);
              break;
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const events = parseSSEChunk(buffer);
        for (const event of events) {
          switch (event.type) {
            case "message":
              handlers.onMessage?.(event.data);
              break;
            case "thought":
              handlers.onThought?.(event.data);
              break;
            case "tool_call":
              handlers.onToolCall?.(event.data);
              break;
            case "tool_result":
              handlers.onToolResult?.(event.data);
              break;
            case "done":
              handlers.onDone?.(event.data);
              break;
            case "error":
              handlers.onError?.(event.data);
              break;
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Connection was intentionally cancelled
        return;
      }
      handlers.onError?.(
        JSON.stringify({
          message: err instanceof Error ? err.message : "Unknown error",
        }),
      );
    }
  };

  void run();

  return controller;
}
