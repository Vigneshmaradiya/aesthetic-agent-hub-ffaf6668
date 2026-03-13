"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Command } from "cmdk";
import { useSessionStore } from "@/stores/session-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { triggerChatAction } from "@/lib/chat/trigger";

interface OmniBarCommand {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  group: string;
}

export function OmniBar() {
  const isOpen = useSessionStore((s) => s.isOmniBarOpen);
  const closeOmniBar = useSessionStore((s) => s.closeOmniBar);
  const setShowMorningBrief = useSessionStore((s) => s.setShowMorningBrief);
  const setShowMCPPanel = useSessionStore((s) => s.setShowMCPPanel);
  const showSection = useCanvasStore((s) => s.showSection);
  const setScrollToSection = useCanvasStore((s) => s.setScrollToSection);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const commands: OmniBarCommand[] = useMemo(() => {
    const activeTicketId = useCanvasStore.getState().activeTicketId;
    const ticketRef = activeTicketId
      ? `ticket #${activeTicketId}`
      : "the active ticket";

    return [
      {
        id: "summarize",
        label: "Summarize Ticket",
        shortcut: "/summarize",
        action: () => {
          triggerChatAction(
            `Summarize ${ticketRef} with key issues, timeline, and recommended next steps.`,
          );
        },
        group: "Actions",
      },
      {
        id: "draft",
        label: "Draft Reply",
        shortcut: "/draft",
        action: () => {
          triggerChatAction(
            `Draft a professional customer reply for ${ticketRef}. Be empathetic, clear, and solution-oriented.`,
          );
        },
        group: "Actions",
      },
      {
        id: "escalate",
        label: "Escalate Ticket",
        shortcut: "/escalate",
        action: () => {
          triggerChatAction(
            `Prepare an escalation summary for ${ticketRef}. Include issue severity, customer impact, steps taken so far, and recommended escalation path.`,
          );
        },
        group: "Actions",
      },
      {
        id: "check-logs",
        label: "Check Logs",
        shortcut: "/check-logs",
        action: () => {
          showSection("diagnostics");
          setScrollToSection("diagnostics");
        },
        group: "Actions",
      },
      {
        id: "similar",
        label: "Find Similar Cases",
        shortcut: "/similar",
        action: () => {
          triggerChatAction(
            `Find similar resolved tickets related to ${ticketRef}. Show matching patterns and resolutions.`,
          );
        },
        group: "Actions",
      },
      {
        id: "rootcause",
        label: "Root Cause Analysis",
        shortcut: "/rootcause",
        action: () => {
          triggerChatAction(
            `Perform a root cause analysis for ${ticketRef}. Identify the underlying issue, provide evidence, and suggest resolution.`,
          );
        },
        group: "Actions",
      },
      {
        id: "customer",
        label: "Customer Intelligence",
        shortcut: "/customer",
        action: () => {
          triggerChatAction(
            `Look up the customer profile for ${ticketRef}. Show their ticket history, sentiment trend, and account tier.`,
          );
        },
        group: "Actions",
      },
      {
        id: "search-kb",
        label: "Search Knowledge Base",
        shortcut: "/search",
        action: () => {
          triggerChatAction(
            `Search the knowledge base for solutions related to ${ticketRef}.`,
          );
        },
        group: "Search",
      },
      // Resolution Intelligence commands
      {
        id: "readiness",
        label: "Check Ticket Readiness",
        shortcut: "/readiness",
        action: () => {
          triggerChatAction(
            `Assess the intake readiness for ${ticketRef}. Check for product/module, error description, reproduction steps, logs, and version info. Score the ticket's completeness and list any missing information with suggestions for what to ask the customer.`,
          );
        },
        group: "Resolution",
      },
      {
        id: "classify",
        label: "Classify Case",
        shortcut: "/classify",
        action: () => {
          triggerChatAction(
            `Classify ${ticketRef} into one of: Self-Service, Service Request, Feature Request, Known Issue, or Unknown Issue. Provide confidence level and reasoning, then suggest the appropriate resolution path.`,
          );
        },
        group: "Resolution",
      },
      {
        id: "resolve",
        label: "Mark Resolved & Capture",
        shortcut: "/resolve",
        action: () => {
          triggerChatAction(
            `Mark ${ticketRef} as resolved. Generate a Resolution Summary with root cause, resolution steps taken, and resolution path used. Then draft a Knowledge Base article for organizational learning.`,
          );
        },
        group: "Resolution",
      },
      {
        id: "kb-article",
        label: "Generate KB Article",
        shortcut: "/kb",
        action: () => {
          triggerChatAction(
            `Generate a knowledge base article draft from the resolution of ${ticketRef}. Include: title, problem description, root cause, numbered resolution steps, and affected versions.`,
          );
        },
        group: "Resolution",
      },
      {
        id: "incident",
        label: "Check for Incident Pattern",
        shortcut: "/incident",
        action: () => {
          triggerChatAction(
            `Analyze whether ${ticketRef} is part of a broader incident. Search for cross-ticket patterns, check for similar recent tickets, and assess if this should be escalated as a systemic issue.`,
          );
        },
        group: "Resolution",
      },
      {
        id: "morning-brief",
        label: "Morning Brief",
        action: () => {
          setShowMorningBrief(true);
        },
        group: "Navigation",
      },
      {
        id: "connections",
        label: "Manage Tool Connections",
        shortcut: "/connections",
        action: () => {
          setShowMCPPanel(true);
        },
        group: "Settings",
      },
    ];
  }, [showSection, setScrollToSection, setShowMorningBrief, setShowMCPPanel]);

  const groupedCommands = commands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.group]) acc[cmd.group] = [];
      acc[cmd.group].push(cmd);
      return acc;
    },
    {} as Record<string, OmniBarCommand[]>,
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={closeOmniBar}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />

          {/* Command palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Command
              className="relative w-full max-w-lg overflow-hidden rounded-lg border border-nexus-border bg-nexus-surface shadow-2xl"
              onKeyDown={(e) => {
                if (e.key === "Escape") closeOmniBar();
              }}
            >
              <Command.Input
                ref={inputRef}
                placeholder="Type a command or search... (e.g., /summarize)"
                className="w-full border-b border-nexus-border bg-transparent px-4 py-3 text-sm text-nexus-text outline-none placeholder:text-nexus-text-dim"
              />

              <Command.List className="max-h-72 overflow-y-auto p-2">
                <Command.Empty className="p-4 text-center text-sm text-nexus-text-dim">
                  No commands found.
                </Command.Empty>

                {Object.entries(groupedCommands).map(([group, cmds]) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-nexus-text-dim"
                  >
                    {cmds.map((cmd) => (
                      <Command.Item
                        key={cmd.id}
                        value={cmd.label}
                        onSelect={() => {
                          cmd.action();
                          closeOmniBar();
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-sm text-nexus-text aria-selected:bg-nexus-surface-raised"
                      >
                        <span>{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-nexus-text-dim">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
