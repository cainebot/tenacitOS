"use client"

import { useCallback, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import { CodeBlock } from "@tiptap/extension-code-block"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import CharacterCount from "@tiptap/extension-character-count"
import Typography from "@tiptap/extension-typography"
import Dropcursor from "@tiptap/extension-dropcursor"
import Gapcursor from "@tiptap/extension-gapcursor"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold01,
  Italic01,
  Underline01,
  Strikethrough01,
  AlignLeft,
  AlignCenter,
  Dotpoints01,
  Palette,
  Brackets,
  Link01,
  Image01,
  Type01,
  CheckSquare,
  Table as TableIcon,
  ReverseLeft,
  ReverseRight,
  DotsHorizontal,
} from "@untitledui/icons"
import { cx } from "../../utils/cx"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TextEditorIconType =
  | "bold" | "italic" | "underline" | "strike"
  | "color" | "highlight" | "code"
  | "link" | "image" | "table"
  | "align-left" | "align-center"
  | "bullet-list" | "ordered-list" | "task-list"
  | "undo" | "redo"

export interface TextEditorProps {
  /** Initial HTML content */
  content?: string
  /** Called when content changes (returns HTML string) */
  onContentChange?: (html: string) => void
  /** Hint text below the editor — use "{count}" and "{chars}" for character count placeholders */
  hintText?: string
  /** Max characters (enables character count) */
  maxCharacters?: number
  /** Whether to show hint text */
  showHintText?: boolean
  /** Whether the editor is disabled / read-only */
  isDisabled?: boolean
  /** Placeholder when empty */
  placeholder?: string
  className?: string
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function ToolbarButton({
  icon: Icon,
  active = false,
  disabled = false,
  onPress,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  disabled?: boolean
  onPress: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onPress}
      className={cx(
        "flex cursor-pointer items-center justify-center rounded-(--radius-sm) p-1.5 transition duration-100",
        "text-fg-quaternary hover:bg-primary_hover hover:text-fg-quaternary_hover",
        active && "bg-primary_hover text-fg-secondary",
        disabled && "cursor-not-allowed opacity-30",
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}

function ToolbarDivider() {
  return (
    <div className="flex h-8 w-3 items-center justify-center">
      <div className="h-full w-px bg-border-secondary" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Color picker popover
// ---------------------------------------------------------------------------

const textColors = [
  { label: "Default", value: "" },
  { label: "Gray", value: "var(--text-tertiary)" },
  { label: "Red", value: "#F97066" },
  { label: "Orange", value: "#F79009" },
  { label: "Yellow", value: "#FEC84B" },
  { label: "Green", value: "#75E0A7" },
  { label: "Blue", value: "#53B1FD" },
  { label: "Purple", value: "#BDB4FE" },
  { label: "Pink", value: "#FDA29B" },
]

function ColorPickerButton({
  icon: Icon,
  active,
  onColorSelect,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onColorSelect: (color: string) => void
  label: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={() => setIsOpen(!isOpen)}
        className={cx(
          "flex cursor-pointer items-center justify-center rounded-(--radius-sm) p-1.5 transition duration-100",
          "text-fg-quaternary hover:bg-primary_hover hover:text-fg-quaternary_hover",
          (active || isOpen) && "bg-primary_hover text-fg-secondary",
        )}
      >
        <Icon className="size-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg bg-primary p-2 shadow-lg ring-1 ring-secondary_alt">
            {textColors.map((c) => (
              <button
                key={c.label}
                type="button"
                aria-label={c.label}
                onClick={() => {
                  onColorSelect(c.value)
                  setIsOpen(false)
                }}
                className="flex size-6 cursor-pointer items-center justify-center rounded-full transition hover:ring-2 hover:ring-brand-500"
              >
                {c.value ? (
                  <span
                    className="size-4 rounded-full border border-white/10"
                    style={{ backgroundColor: c.value }}
                  />
                ) : (
                  <span className="size-4 rounded-full bg-primary ring-1 ring-inset ring-secondary text-[8px] font-bold leading-4 text-center text-quaternary">
                    A
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TextEditor({
  content = "",
  onContentChange,
  hintText,
  maxCharacters,
  showHintText = true,
  isDisabled = false,
  placeholder = "Start writing...",
  className,
}: TextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: "ml-4 list-disc space-y-1" } },
        orderedList: { HTMLAttributes: { class: "ml-4 list-decimal space-y-1" } },
        paragraph: { HTMLAttributes: { class: "mb-2 last:mb-0" } },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: { class: "font-semibold text-primary" },
        },
        strike: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
      }),
      Underline,
      TextStyle,
      Color,
      CodeBlock.configure({
        HTMLAttributes: {
          class: "rounded-(--radius-md) bg-quaternary px-4 py-3 font-mono text-xs text-secondary my-2",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-brand-secondary underline decoration-brand-secondary/40 underline-offset-2 hover:decoration-brand-secondary cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-(--radius-md) max-w-full my-2",
        },
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "rounded-sm px-1 py-0.5",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "space-y-1 my-2",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: "border-collapse border border-secondary my-2 w-full",
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-secondary px-3 py-2 text-sm",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-secondary bg-quaternary px-3 py-2 text-sm font-medium",
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CharacterCount.configure({
        limit: maxCharacters,
      }),
      Typography,
      Dropcursor.configure({ color: "var(--brand-500)", width: 2 }),
      Gapcursor,
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    editable: !isDisabled,
    onUpdate: ({ editor: e }) => {
      onContentChange?.(e.getHTML())
    },
    editorProps: {
      attributes: {
        class: "flex-1 overflow-y-auto text-sm leading-5 text-primary outline-none min-h-[100px]",
      },
    },
  })

  const [showMore, setShowMore] = useState(false)

  const toggle = useCallback(
    (action: () => void) => {
      action()
      editor?.chain().focus().run()
    },
    [editor],
  )

  if (!editor) return null

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL", previousUrl)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  const handleAddImage = () => {
    const url = window.prompt("Image URL")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const handleColorSelect = (color: string) => {
    if (color) {
      editor.chain().focus().setColor(color).run()
    } else {
      editor.chain().focus().unsetColor().run()
    }
  }

  const handleHighlightSelect = (color: string) => {
    if (color) {
      editor.chain().focus().toggleHighlight({ color }).run()
    } else {
      editor.chain().focus().unsetHighlight().run()
    }
  }

  const charCount = editor.storage.characterCount?.characters() ?? 0
  const resolvedHint = hintText
    ?.replace("{count}", String(charCount))
    ?.replace("{chars}", maxCharacters ? String(maxCharacters - charCount) : "∞")

  return (
    <div className={cx("flex flex-col gap-2 isolate", className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-1">
        {/* Basic toolbar */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            icon={Bold01}
            label="Bold"
            active={editor.isActive("bold")}
            onPress={() => toggle(() => editor.chain().toggleBold().run())}
          />
          <ToolbarButton
            icon={Italic01}
            label="Italic"
            active={editor.isActive("italic")}
            onPress={() => toggle(() => editor.chain().toggleItalic().run())}
          />
          <ToolbarButton
            icon={Underline01}
            label="Underline"
            active={editor.isActive("underline")}
            onPress={() => toggle(() => editor.chain().toggleUnderline().run())}
          />

          <ToolbarDivider />

          <ToolbarButton
            icon={Dotpoints01}
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onPress={() => toggle(() => editor.chain().toggleBulletList().run())}
          />
          <ToolbarButton
            icon={Link01}
            label="Link"
            active={editor.isActive("link")}
            onPress={handleSetLink}
          />
          <ToolbarButton
            icon={Brackets}
            label="Code block"
            active={editor.isActive("codeBlock")}
            onPress={() => toggle(() => editor.chain().toggleCodeBlock().run())}
          />

          <ToolbarDivider />

          {/* More toggle */}
          <ToolbarButton
            icon={DotsHorizontal}
            label="More options"
            active={showMore}
            onPress={() => setShowMore(!showMore)}
          />
        </div>

        {/* Extended toolbar */}
        {showMore && (
          <div className="flex flex-wrap items-center gap-0.5 border-t border-secondary/50 pt-1">
            <ToolbarButton
              icon={ReverseLeft}
              label="Undo"
              disabled={!editor.can().undo()}
              onPress={() => toggle(() => editor.chain().undo().run())}
            />
            <ToolbarButton
              icon={ReverseRight}
              label="Redo"
              disabled={!editor.can().redo()}
              onPress={() => toggle(() => editor.chain().redo().run())}
            />

            <ToolbarDivider />

            <ToolbarButton
              icon={Strikethrough01}
              label="Strikethrough"
              active={editor.isActive("strike")}
              onPress={() => toggle(() => editor.chain().toggleStrike().run())}
            />
            <ColorPickerButton
              icon={Palette}
              label="Text color"
              active={editor.isActive("textStyle")}
              onColorSelect={handleColorSelect}
            />
            <ColorPickerButton
              icon={Type01}
              label="Highlight"
              active={editor.isActive("highlight")}
              onColorSelect={handleHighlightSelect}
            />

            <ToolbarDivider />

            <ToolbarButton
              icon={AlignLeft}
              label="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onPress={() => toggle(() => editor.chain().setTextAlign("left").run())}
            />
            <ToolbarButton
              icon={AlignCenter}
              label="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onPress={() => toggle(() => editor.chain().setTextAlign("center").run())}
            />

            <ToolbarDivider />

            <ToolbarButton
              icon={CheckSquare}
              label="Task list"
              active={editor.isActive("taskList")}
              onPress={() => toggle(() => editor.chain().toggleTaskList().run())}
            />
            <ToolbarButton
              icon={Image01}
              label="Image"
              onPress={handleAddImage}
            />
            <ToolbarButton
              icon={TableIcon}
              label="Table"
              active={editor.isActive("table")}
              onPress={handleInsertTable}
            />
          </div>
        )}
      </div>

      {/* Editor + hint text */}
      <div className="flex flex-1 flex-col gap-2">
        {/* Editor area */}
        <div
          className={cx(
            "relative flex flex-1 flex-col rounded-(--radius-md) border bg-primary p-4 shadow-xs transition",
            editor.isFocused
              ? "border-brand-300 ring-4 ring-brand-500/24"
              : "border-primary",
            isDisabled && "opacity-50 pointer-events-none",
          )}
        >
          <EditorContent editor={editor} />

        </div>

        {/* Hint text */}
        {showHintText && resolvedHint && (
          <p className="text-sm text-tertiary">{resolvedHint}</p>
        )}
      </div>
    </div>
  )
}
