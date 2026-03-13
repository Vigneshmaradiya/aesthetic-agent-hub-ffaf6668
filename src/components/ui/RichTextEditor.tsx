"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback } from "react";

interface RichTextEditorProps {
  initialContent?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
}

/** Strip HTML tags and return plain text. */
export function getPlainText(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, "");
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent ?? tmp.innerText ?? "";
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  ariaLabel,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        isActive
          ? "bg-nexus-accent/20 text-nexus-accent"
          : "text-nexus-text-muted hover:bg-nexus-surface-raised hover:text-nexus-text"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  initialContent = "",
  placeholder = "Compose your response...",
  onUpdate,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[200px] p-3 text-sm leading-relaxed text-nexus-text outline-none focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(ed.getHTML());
    },
  });

  const handleInsertContent = useCallback(
    (text: string) => {
      editor?.commands.insertContent(text);
    },
    [editor],
  );

  // Expose insertContent on the DOM for external use (e.g., canned responses)
  if (typeof window !== "undefined" && editor) {
    (window as unknown as Record<string, unknown>).__nexusEditorInsert =
      handleInsertContent;
  }

  if (!editor) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-nexus-border bg-nexus-surface">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-nexus-border px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          ariaLabel="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          ariaLabel="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          ariaLabel="Underline"
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          ariaLabel="Strikethrough"
        >
          <span className="line-through">S</span>
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-nexus-border" aria-hidden="true" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          ariaLabel="Bullet list"
        >
          &bull; List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          ariaLabel="Numbered list"
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          ariaLabel="Code block"
        >
          {"</>"}
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-nexus-border" aria-hidden="true" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          ariaLabel="Undo"
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          ariaLabel="Redo"
        >
          ↪
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}
