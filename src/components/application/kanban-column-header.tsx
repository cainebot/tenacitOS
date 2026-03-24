"use client"

import { useRef, useState } from "react"
import { Plus, Pencil01, Trash01, DotsHorizontal } from "@untitledui/icons"
import { Badge, ButtonUtility, Dropdown, cx } from "@circos/ui"
import { Button as AriaButton } from "react-aria-components"

export interface KanbanColumnHeaderProps {
  title: string
  onTitleChange?: (title: string) => void
  count?: number
  active?: boolean
  onAddCard?: () => void
  onDelete?: () => void
  className?: string
}

export function KanbanColumnHeader({
  title,
  onTitleChange,
  count,
  active = false,
  onAddCard,
  onDelete,
  className,
}: KanbanColumnHeaderProps) {
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
        "group/header flex h-10 items-center justify-between rounded-lg p-2 transition-colors",
        active
          ? "border border-brand bg-primary_alt"
          : "bg-secondary hover:bg-secondary_hover",
        className,
      )}
    >
      {/* Left: title + count */}
      <div className="flex items-center gap-1">
        {/* Invisible input — click to edit */}
        <button
          type="button"
          className="cursor-text"
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
                "truncate text-sm font-semibold outline-none",
                isEditing ? "text-primary" : "text-quaternary",
              )}
            >
              {title}
            </p>
          </div>
        </button>

        {count != null && (
          <Badge type="color" size="sm" color="gray">
            {count}
          </Badge>
        )}
      </div>

      {/* Right: actions — visible on hover, editing, or menu open */}
      {!active && (
        <div
          className={cx(
            "flex items-center gap-1",
            !actionsVisible && "hidden group-hover/header:flex",
          )}
        >
          <ButtonUtility
            size="xs"
            color="tertiary"
            icon={Plus}
            onClick={onAddCard}
          />

          <Dropdown.Root onOpenChange={setIsMenuOpen}>
            <AriaButton
              aria-label="Column options"
              className="cursor-pointer rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-quaternary_hover pressed:text-fg-quaternary_hover"
            >
              <DotsHorizontal className="size-4" />
            </AriaButton>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === "rename") startEditing()
                  if (key === "delete") onDelete?.()
                }}
              >
                <Dropdown.Item id="rename" label="Rename section" icon={Pencil01} />
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
      )}
    </div>
  )
}
