"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { memo } from "react";

interface MarkdownContentProps {
  content: string;
}

/**
 * Normalize LLM output so markdown headers and block elements render correctly.
 * LLMs sometimes stream headers inline without preceding blank lines.
 */
function normalizeMarkdown(text: string): string {
  let result = text;

  // Ensure blank line before markdown headers that are glued to previous text
  // e.g. "some text.## Header" → "some text.\n\n## Header"
  result = result.replace(/([^\n])\n?(#{1,6}\s)/g, "$1\n\n$2");

  // Ensure blank line before lines that start with "- " or "* " (list items)
  // but only when the previous line isn't already a list item or blank
  result = result.replace(/([^\n])\n([*-] )/g, "$1\n\n$2");

  // Ensure blank line before numbered list starts (e.g. "1. ")
  result = result.replace(/([^\n])\n(\d+\.\s)/g, "$1\n\n$2");

  return result;
}

export const MarkdownContent = memo(function MarkdownContent({
  content,
}: MarkdownContentProps) {
  return (
    <div className="markdown-content text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {normalizeMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
});
