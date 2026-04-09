"use client"

import { memo, useRef, useState } from "react"
import { Trash01, DotsHorizontal } from "@untitledui/icons"
import { Dropdown, cx } from "@circos/ui"
import { Button as AriaButton } from "react-aria-components"
import { GripVertical } from "@/components/icons/grip-vertical"

export interface BoardSettingColumnHeaderProps {
  title: string
  onTitleChange?: (title: string) => void
  onDelete?: () => void
  /** From useSortable — attach ONLY to the grip icon for column drag */
  dragHandleListeners?: Record<string, unknown>
  dragHandleAttributes?: Record<string, unknown>
  className?: string
}

export const BoardSettingColumnHeader = memo(function BoardSettingColumnHeader({
  title,
  onTitleChange,
  onDelete,
  dragHandleListeners,
  dragHandleAttributes,
  className,
}: BoardSettingColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const titleRef = useRef<HTMLParagraphElement>(null)

  const startEditing = () => {
    setIsEditing(true)
    requestAnimationFrame(() => {
      const el = titleRef.current
      if (!el) return
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    })
  }

  const handleBlur = () => {
    setIsEditing(false)
    const text = titleRef.current?.textContent?.trim() ?? ""
    if (text && text !== title) onTitleChange?.(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      titleRef.current?.blur()
    }
    if (e.key === "Escape") {
      if (titleRef.current) titleRef.current.textContent = title
      titleRef.current?.blur()
    }
  }

  const actionsVisible = isEditing || isMenuOpen

  return (
    <div
      className={cx(
        "group/header flex items-center justify-between gap-1 rounded-lg h-10 p-2 bg-secondary hover:bg-secondary_hover transition-colors",
        className,
      )}
    >
      {/* Left: grip drag handle */}
      <button
        type="button"
        className="cursor-grab rounded-md p-0.5"
        {...dragHandleListeners}
        {...dragHandleAttributes}
      >
        <GripVertical className="size-4 text-fg-quaternary" />
      </button>

      {/* Center: editable name */}
      <button
        type="button"
        className="cursor-text flex-1 min-w-0"
        onClick={startEditing}
      >
        <div
          className={cx(
            "flex items-center rounded-md px-2 py-0.5",
            isEditing && "border-2 border-brand bg-primary shadow-xs",
          )}
        >
          <p
            ref={titleRef}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cx(
              "truncate font-semibold text-sm outline-none",
              isEditing ? "text-primary" : "text-quaternary",
            )}
          >
            {title}
          </p>
        </div>
      </button>

      {/* Right: kebab menu — hover-visible */}
      <div
        className={cx(
          "flex items-center",
          !actionsVisible && "hidden group-hover/header:flex",
        )}
      >
        <Dropdown.Root
          isOpen={isMenuOpen}
          onOpenChange={setIsMenuOpen}
        >
          <AriaButton
            aria-label="Column options"
            className="cursor-pointer rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-quaternary_hover pressed:text-fg-quaternary_hover"
          >
            <DotsHorizontal className="size-4" />
          </AriaButton>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === "delete") onDelete?.()
              }}
            >
              <Dropdown.Item
                id="delete"
                label="Delete section"
                icon={Trash01}
                className="[&_svg]:!text-fg-error-primary [&_span]:!text-error-primary"
              />
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </div>
    </div>
  )
})
