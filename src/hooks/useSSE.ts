"use client";

import { useCallback, useEffect, useRef } from "react";
import { createSSEConnection } from "@/lib/streaming/sse-client";
import { useChatStore } from "@/stores/chat-store";
import { useSessionStore } from "@/stores/session-store";
import { useHitlStore } from "@/stores/hitl-store";
import { useCanvasStore } from "@/stores/canvas-store";
import type { ThoughtStep, ToolCallEvent, ChatMessage } from "@/types/chat";
import { handleToolResultForCanvas } from "@/lib/chat/canvas-bridge";
import { parseAssistantResponseForCanvas } from "@/lib/chat/response-parser";

/**
 * React hook that wraps createSSEConnection and integrates with the chat store.
 * Sends full conversation history along with provider, model, and HITL mode.
 * Handles HITL approval requests by adding them to the hitl store.
 */
export function useSSE() {
  const controllerRef = useRef<AbortController | null>(null);

  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToStream = useChatStore((s) => s.appendToStream);
  const finalizeStream = useChatStore((s) => s.finalizeStream);
  const addThoughtStep = useChatStore((s) => s.addThoughtStep);
  const addToolCall = useChatStore((s) => s.addToolCall);
  const resolveToolCall = useChatStore((s) => s.resolveToolCall);
  const setStreaming = useChatStore((s) => s.setStreaming);

  const addPendingAction = useHitlStore((s) => s.addPendingAction);
  const clearPending = useHitlStore((s) => s.clearPending);

  // Abort any active connection on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      // Abort any previous connection
      controllerRef.current?.abort();

      // Add user message to chat
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      addMessage(userMessage);

      setStreaming(true);

      // Build full conversation history for the API
      const { llmProvider, llmModel, mcpConnections } =
        useSessionStore.getState();
      const hitlMode = useHitlStore.getState().mode;

      // Build list of connected MCP service IDs
      const connectedMCPs = Object.entries(mcpConnections)
        .filter(([, status]) => status === "connected")
        .map(([service]) => service);

      // Capture canvas state so the LLM knows about the active ticket
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

      const allMessages = [...messages, userMessage];
      const conversationHistory = allMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      const controller = createSSEConnection(
        "/api/chat",
        {
          messages: conversationHistory,
          provider: llmProvider ?? undefined,
          model: llmModel ?? undefined,
          hitlMode,
          canvasContext,
          connectedMCPs: connectedMCPs.length > 0 ? connectedMCPs : undefined,
        },
        {
          onMessage(data) {
            appendToStream(data);
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
              addThoughtStep(thought);
            } catch {
              // Ignore malformed thought events
            }
          },

          onToolCall(data) {
            try {
              const parsed = JSON.parse(data) as {
                callId?: string;
                tool: string;
                args: Record<string, unknown>;
                requiresApproval?: boolean;
                actionId?: string;
                risk?: "low" | "medium" | "high";
                description?: string;
              };

              // Only add to the UI tool call list when it's NOT a HITL
              // approval request. HITL events are emitted separately (once
              // for the approval prompt, once when the tool actually runs).
              // Without this guard both events call addToolCall and the
              // second entry stays permanently "running" because
              // resolveToolCall only resolves the first match by name.
              if (!parsed.requiresApproval) {
                const toolCall: ToolCallEvent = {
                  callId: parsed.callId,
                  tool: parsed.tool,
                  args: parsed.args,
                  resolved: false,
                };
                addToolCall(toolCall);
              }

              // If HITL approval is required, add to pending actions store
              if (parsed.requiresApproval && parsed.actionId) {
                addPendingAction({
                  id: parsed.actionId,
                  description: parsed.description ?? `Execute ${parsed.tool}`,
                  tool: parsed.tool,
                  args: parsed.args,
                  risk: parsed.risk ?? "medium",
                  createdAt: new Date(),
                });
              }
            } catch {
              // Ignore malformed tool call events
            }
          },

          onToolResult(data) {
            try {
              const parsed = JSON.parse(data) as {
                callId?: string;
                tool: string;
                result: unknown;
              };
              resolveToolCall(parsed.tool, parsed.result, parsed.callId);
              handleToolResultForCanvas(parsed.tool, parsed.result);
            } catch {
              // Ignore malformed tool result events
            }
          },

          onDone() {
            const streamContent = useChatStore.getState().currentStreamBuffer;
            finalizeStream();
            // Any HITL approval cards left open (e.g. auto-timed-out on
            // the server) should be dismissed now that the stream is done.
            clearPending();
            controllerRef.current = null;
            if (streamContent) {
              parseAssistantResponseForCanvas(streamContent);
            }
          },

          onError(data) {
            // On error, finalize what we have and stop streaming
            finalizeStream();
            clearPending();
            controllerRef.current = null;

            try {
              const parsed = JSON.parse(data) as { message?: string };
              if (parsed.message) {
                addMessage({
                  id: crypto.randomUUID(),
                  role: "system",
                  content: `Error: ${parsed.message}`,
                  timestamp: new Date(),
                });
              }
            } catch {
              // Ignore parse errors on error events
            }
          },
        },
      );

      controllerRef.current = controller;
    },
    [
      messages,
      addMessage,
      appendToStream,
      finalizeStream,
      addThoughtStep,
      addToolCall,
      addPendingAction,
      clearPending,
      resolveToolCall,
      setStreaming,
    ],
  );

  return { sendMessage };
}
