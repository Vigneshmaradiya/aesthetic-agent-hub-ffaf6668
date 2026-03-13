"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

interface SlashCommand {
  command: string;
  description: string;
  category: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/analyze",
    description: "Analyze this ticket and suggest a resolution path",
    category: "Resolution",
  },
  {
    command: "/classify",
    description: "Classify ticket type (Self-Service, Known Issue, etc.)",
    category: "Resolution",
  },
  {
    command: "/similar",
    description: "Find similar past cases and their resolutions",
    category: "Resolution",
  },
  {
    command: "/experts",
    description: "Identify subject matter experts for this issue",
    category: "Resolution",
  },
  {
    command: "/draft",
    description: "Draft a customer reply for the current ticket",
    category: "Communication",
  },
  {
    command: "/escalate",
    description: "Escalate ticket with a structured handoff summary",
    category: "Communication",
  },
  {
    command: "/kb",
    description: "Search the knowledge base for relevant articles",
    category: "Knowledge",
  },
  {
    command: "/brief",
    description: "Get today's ticket queue morning brief",
    category: "Queue",
  },
  {
    command: "/logs",
    description: "Parse and analyze attached log files",
    category: "Diagnostics",
  },
  {
    command: "/summarize",
    description: "Summarize this ticket's key details and history",
    category: "Diagnostics",
  },
];

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  onValueChange,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<SlashCommand[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const closeSuggestions = useCallback(() => {
    setSuggestions([]);
    setActiveIndex(0);
  }, []);

  const handleSend = useCallback(
    (overrideValue?: string) => {
      const trimmed = (overrideValue ?? value).trim();
      if (!trimmed || disabled) return;
      onSend(trimmed);
      setValue("");
      closeSuggestions();
      onValueChange?.("");

      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) el.style.height = "auto";
      });
    },
    [value, disabled, onSend, onValueChange, closeSuggestions],
  );

  const selectSuggestion = useCallback(
    (cmd: SlashCommand) => {
      setValue(cmd.command + " ");
      onValueChange?.(cmd.command + " ");
      closeSuggestions();
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    },
    [onValueChange, closeSuggestions],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % suggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex(
            (i) => (i - 1 + suggestions.length) % suggestions.length,
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          selectSuggestion(suggestions[activeIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          closeSuggestions();
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [suggestions, activeIndex, selectSuggestion, closeSuggestions, handleSend],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onValueChange?.(newValue);
      adjustHeight();

      // Show suggestions only while the user is still typing the command token
      // (starts with "/" and no space yet)
      if (newValue.startsWith("/") && !newValue.includes(" ")) {
        const query = newValue.slice(1).toLowerCase();
        const filtered = SLASH_COMMANDS.filter(
          (c) =>
            c.command.slice(1).startsWith(query) ||
            c.description.toLowerCase().includes(query),
        );
        setSuggestions(filtered);
        setActiveIndex(0);
      } else {
        closeSuggestions();
      }
    },
    [adjustHeight, onValueChange, closeSuggestions],
  );

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Group suggestions by category for display
  const grouped = suggestions.reduce<
    Record<string, SlashCommand[]>
  >((acc, cmd) => {
    (acc[cmd.category] ??= []).push(cmd);
    return acc;
  }, {});

  return (
    <div className="relative">
      {/* Slash command suggestions dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-lg border border-nexus-border bg-nexus-surface shadow-xl">
          <div className="border-b border-nexus-border px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
              Commands
            </span>
          </div>
          <ul
            ref={listRef}
            className="max-h-56 overflow-y-auto p-1"
            role="listbox"
          >
            {Object.entries(grouped).map(([category, cmds]) => (
              <li key={category}>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const flatIndex = suggestions.indexOf(cmd);
                  const isActive = flatIndex === activeIndex;
                  return (
                    <button
                      key={cmd.command}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      onMouseDown={(e) => {
                        e.preventDefault(); // keep textarea focus
                        selectSuggestion(cmd);
                      }}
                      className={`flex w-full items-baseline gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-nexus-accent/10 text-nexus-text"
                          : "text-nexus-text hover:bg-nexus-surface-raised"
                      }`}
                    >
                      <span className="shrink-0 font-mono text-sm font-semibold text-nexus-accent">
                        {cmd.command}
                      </span>
                      <span className="truncate text-xs text-nexus-text-muted">
                        {cmd.description}
                      </span>
                    </button>
                  );
                })}
              </li>
            ))}
          </ul>
          <div className="border-t border-nexus-border px-3 py-1.5">
            <span className="text-[10px] text-nexus-text-dim">
              ↑↓ navigate · ↵ / Tab select · Esc dismiss
            </span>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask Nexus anything... (type / for commands)"
          rows={1}
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          className="flex-1 resize-none rounded-lg border border-nexus-border bg-nexus-surface px-3 py-2 text-sm text-nexus-text placeholder:text-nexus-text-dim focus:border-nexus-accent-dim focus:outline-none focus:ring-1 focus:ring-nexus-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-nexus-base transition-colors hover:bg-nexus-accent-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
