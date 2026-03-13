import { useChatStore } from "@/stores/chat-store";
import { useSessionStore } from "@/stores/session-store";
import { useHitlStore } from "@/stores/hitl-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { createSSEConnection } from "@/lib/streaming/sse-client";
import type { ChatMessage, ThoughtStep, ToolCallEvent } from "@/types/chat";
import type { CommunicationDockTab } from "@/types/canvas";
import { handleToolResultForCanvas } from "@/lib/chat/canvas-bridge";
import { parseAssistantResponseForCanvas } from "@/lib/chat/response-parser";

/**
 * Programmatically trigger a chat message from anywhere in the app.
 * This is the non-hook version for use outside React components
 * (e.g., command palette actions, suggested action buttons).
 *
 * Returns the AbortController so callers can cancel if needed.
 */
export function triggerChatAction(message: string): AbortController {
  const store = useChatStore.getState();
  const sessionStore = useSessionStore.getState();
  const hitlStore = useHitlStore.getState();

  // Add user message to store
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: message,
    timestamp: new Date(),
  };
  store.addMessage(userMessage);
  store.setStreaming(true);

  // Build conversation history
  const allMessages = [...store.messages, userMessage];
  const conversationHistory = allMessages.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  // Capture canvas state so the LLM knows which ticket is active —
  // identical to what useSSE does for manual chat messages.
  const canvas = useCanvasStore.getState();
  const canvasContext =
    canvas.activeTicketId && canvas.ticketIntelligence
      ? {
          activeTicketId: canvas.activeTicketId,
          subject: canvas.ticketIntelligence.subject ?? "",
          priority: canvas.ticketIntelligence.priority ?? "",
          status: canvas.ticketIntelligence.status ?? "",
          requester: canvas.ticketIntelligence.requester ?? "",
          summary: canvas.ticketIntelligence.summary ?? "",
          tags: canvas.ticketIntelligence.tags ?? [],
          currentStage: canvas.resolutionWorkflow.currentStage,
          completedStages: canvas.resolutionWorkflow.completedStages,
        }
      : undefined;

  const connectedMCPs = Object.entries(sessionStore.mcpConnections)
    .filter(([, status]) => status === "connected")
    .map(([service]) => service);

  const controller = createSSEConnection(
    "/api/chat",
    {
      messages: conversationHistory,
      provider: sessionStore.llmProvider ?? undefined,
      model: sessionStore.llmModel ?? undefined,
      hitlMode: hitlStore.mode,
      canvasContext,
      connectedMCPs: connectedMCPs.length > 0 ? connectedMCPs : undefined,
    },
    {
      onMessage(data) {
        useChatStore.getState().appendToStream(data);
      },
      onThought(data) {
        try {
          const parsed = JSON.parse(data) as {
            step: string;
            content: string;
            timestamp: string;
          };
          const thought: ThoughtStep = {
            step: parsed.step,
            content: parsed.content,
            timestamp: new Date(parsed.timestamp),
          };
          useChatStore.getState().addThoughtStep(thought);
        } catch {
          // Ignore
        }
      },
      onToolCall(data) {
        try {
          const parsed = JSON.parse(data) as {
            tool: string;
            args: Record<string, unknown>;
            requiresApproval?: boolean;
            actionId?: string;
            risk?: "low" | "medium" | "high";
            description?: string;
          };
          const toolCall: ToolCallEvent = {
            tool: parsed.tool,
            args: parsed.args,
            resolved: false,
          };
          useChatStore.getState().addToolCall(toolCall);

          if (parsed.requiresApproval && parsed.actionId) {
            // Route create_ticket_comment drafts to Communication Dock
            // so the engineer can review/edit before approving
            if (parsed.tool === "zendesk__create_ticket_comment") {
              const body = String(
                parsed.args?.body ?? parsed.args?.comment ?? "",
              );
              if (body.length > 0) {
                const canvasStore = useCanvasStore.getState();
                canvasStore.setSuggestedDraft(body);
                canvasStore.setCommunicationDockExpanded(true);
                // Set dock tab based on comment type
                const tab: CommunicationDockTab =
                  parsed.args?.public === false ? "internal_note" : "reply";
                canvasStore.setCommunicationDockTab(tab);
              }
            }

            useHitlStore.getState().addPendingAction({
              id: parsed.actionId,
              description:
                parsed.tool === "zendesk__create_ticket_comment"
                  ? "Send comment — review draft in Communication Dock"
                  : (parsed.description ?? `Execute ${parsed.tool}`),
              tool: parsed.tool,
              args: parsed.args,
              risk: parsed.risk ?? "medium",
              createdAt: new Date(),
            });
          }
        } catch {
          // Ignore
        }
      },
      onToolResult(data) {
        try {
          const parsed = JSON.parse(data) as {
            tool: string;
            result: unknown;
          };
          useChatStore.getState().resolveToolCall(parsed.tool, parsed.result);
          handleToolResultForCanvas(parsed.tool, parsed.result);
        } catch {
          // Ignore
        }
      },
      onDone() {
        const streamContent = useChatStore.getState().currentStreamBuffer;
        useChatStore.getState().finalizeStream();
        if (streamContent) {
          parseAssistantResponseForCanvas(streamContent);
        }
      },
      onError(data) {
        useChatStore.getState().finalizeStream();
        try {
          const parsed = JSON.parse(data) as { message?: string };
          if (parsed.message) {
            useChatStore.getState().addMessage({
              id: crypto.randomUUID(),
              role: "system",
              content: `Error: ${parsed.message}`,
              timestamp: new Date(),
            });
          }
        } catch {
          // Ignore
        }
      },
    },
  );

  return controller;
}
