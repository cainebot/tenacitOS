"use client"

import { memo, useRef, useState } from "react"
import { Plus, Pencil01, Trash01, DotsHorizontal, UserCircle } from "@untitledui/icons"
import { Badge, ButtonUtility, Dropdown, ToggleBase, cx } from "@circos/ui"
import { Button as AriaButton } from "react-aria-components"

export type KanbanColumnHeaderSize = "sm" | "md"

export interface KanbanColumnHeaderProps {
  title: string
  onTitleChange?: (title: string) => void
  size?: KanbanColumnHeaderSize
  count?: number
  active?: boolean
  onlyHumans?: boolean
  onOnlyHumansChange?: (value: boolean) => void
  onAddCard?: () => void
  onDelete?: () => void
  className?: string
}

export const KanbanColumnHeader = memo(function KanbanColumnHeader({
  title,
  onTitleChange,
  size = "sm",
  count,
  active = false,
  onlyHumans = false,
  onOnlyHumansChange,
  onAddCard,
  onDelete,
  className,
}: KanbanColumnHeaderProps) {
  const isMd = size === "md"
  const [isEditing, setIsEditing] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [onlyHumansLocal, setOnlyHumansLocal] = useState(onlyHumans)
  const preventCloseRef = useRef(false)
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
        "group/header flex items-center justify-between rounded-lg transition-colors",
        isMd ? "h-[42px] px-2 py-3" : "h-10 p-2",
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
                "truncate font-semibold outline-none",
                isMd ? "text-md" : "text-sm",
                isEditing ? "text-primary" : "text-quaternary",
              )}
            >
              {title}
            </p>
          </div>
        </button>

        {count != null && (
          <Badge type="color" size={isMd ? "md" : "sm"} color="gray">
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
            size={isMd ? "sm" : "xs"}
            color="tertiary"
            icon={Plus}
            onClick={onAddCard}
          />

          <Dropdown.Root
            isOpen={isMenuOpen}
            onOpenChange={(open) => {
              if (!open && preventCloseRef.current) {
                preventCloseRef.current = false
                return
              }
              setIsMenuOpen(open)
            }}
          >
            <AriaButton
              aria-label="Column options"
              className="cursor-pointer rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-quaternary_hover pressed:text-fg-quaternary_hover"
            >
              <DotsHorizontal className={isMd ? "size-5" : "size-4"} />
            </AriaButton>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === "only-humans") {
                    preventCloseRef.current = true
                    const next = !onlyHumansLocal
                    setOnlyHumansLocal(next)
                    onOnlyHumansChange?.(next)
                    return
                  }
                  if (key === "rename") startEditing()
                  if (key === "delete") onDelete?.()
                }}
              >
                <Dropdown.Item id="only-humans" className="[&_span]:!font-semibold">
                  <div className="flex items-center gap-2 w-full">
                    <UserCircle className="size-4 shrink-0 text-fg-quaternary" />
                    <span className="flex-1 text-sm font-semibold text-secondary">Only humans</span>
                    <ToggleBase size="sm" isSelected={onlyHumansLocal} />
                  </div>
                </Dropdown.Item>
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
})
