export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thoughts?: ThoughtStep[];
  toolCalls?: ToolCallEvent[];
  timestamp: Date;
}

export interface ThoughtStep {
  step: string;
  content: string;
  timestamp: Date;
}

export interface ToolCallEvent {
  callId?: string;
  tool: string;
  args: Record<string, unknown>;
  result?: unknown;
  resolved: boolean;
}
