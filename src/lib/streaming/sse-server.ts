import type { SSEEventType } from "./sse-client";

/**
 * Encode a named SSE event in the standard format.
 * Multi-line data is split into separate `data:` lines per SSE spec.
 */
export function encodeSSEEvent(type: SSEEventType, data: string): string {
  const dataLines = data
    .split("\n")
    .map((line) => `data: ${line}`)
    .join("\n");
  return `event: ${type}\n${dataLines}\n\n`;
}

/**
 * Create a ReadableStream that emits SSE events.
 * Returns the stream and a controller for sending events.
 */
export function createSSEStream(): {
  stream: ReadableStream<Uint8Array>;
  send: (type: SSEEventType, data: string) => void;
  close: () => void;
} {
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null =
    null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
    cancel() {
      streamController = null;
    },
  });

  const send = (type: SSEEventType, data: string) => {
    if (!streamController) return;
    try {
      const encoded = encoder.encode(encodeSSEEvent(type, data));
      streamController.enqueue(encoded);
    } catch {
      // Stream may have been closed
    }
  };

  const close = () => {
    if (!streamController) return;
    try {
      streamController.close();
    } catch {
      // Stream may already be closed
    }
    streamController = null;
  };

  return { stream, send, close };
}

/**
 * Standard SSE response headers for Next.js API routes.
 */
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;
