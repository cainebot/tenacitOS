"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp } from "@untitledui/icons"
import { BadgeWithIcon } from "../base/badge"
import { Select } from "../base/select/select"
import { Tag, TagGroup, TagList } from "../base/tags/tags"
import { cx } from "../../utils/cx"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemberSelectorUser {
  id: string
  name: string
  handle: string
  avatarUrl?: string
}

export interface MemberSelectorProps {
  users: MemberSelectorUser[]
  /** Controlled: array of selected user ids */
  selected?: string[]
  onChange?: (ids: string[]) => void
  /** Trigger badge label. Defaults to "Members" */
  label?: string
  className?: string
}

// ---------------------------------------------------------------------------
// MemberSelector
// ---------------------------------------------------------------------------

export function MemberSelector({
  users,
  selected,
  onChange,
  label = "Members",
  className,
}: MemberSelectorProps) {
  const [open, setOpen] = useState(false)
  const [internalSelected, setInternalSelected] = useState<string[]>([])
  const [comboKey, setComboKey] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const isControlled = selected !== undefined
  const selectedIds = isControlled ? selected : internalSelected

  // Move keyboard focus into the ComboBox input when the panel opens or
  // resets, so the user can start typing immediately.
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const input = wrapperRef.current?.querySelector<HTMLInputElement>('[role="combobox"]')
      input?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [open, comboKey])

  // Click-outside — excludes React Aria portal overlays so ComboBox
  // item clicks don't accidentally close the panel before selection fires.
  useEffect(() => {
    if (!open) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element
      if (wrapperRef.current?.contains(target)) return
      // React Aria renders popovers inside [data-react-aria-top-layer]
      if (target.closest("[data-react-aria-top-layer]")) return
      setOpen(false)
    }

    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [open])

  const addUser = (id: string) => {
    if (selectedIds.includes(id)) return
    const next = [...selectedIds, id]
    if (isControlled) {
      onChange?.(next)
    } else {
      setInternalSelected(next)
      onChange?.(next)
    }
    // Increment key to reset ComboBox search after selection
    setComboKey((prev) => prev + 1)
  }

  const removeUser = (id: string) => {
    const next = selectedIds.filter((s) => s !== id)
    if (isControlled) {
      onChange?.(next)
    } else {
      setInternalSelected(next)
      onChange?.(next)
    }
  }

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id))

  const comboItems = users.map((u) => ({
    id: u.id,
    label: u.name,
    supportingText: u.handle,
    avatarUrl: u.avatarUrl,
  }))

  return (
    <div ref={wrapperRef} className={cx("relative inline-flex flex-col gap-1.5", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer self-start"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <BadgeWithIcon
          color="gray"
          size="lg"
          type="modern"
          iconTrailing={open ? ChevronUp : ChevronDown}
        >
          {label}
        </BadgeWithIcon>
      </button>

      {/* Selected tags row — capped to dropdown width so tags wrap to next line */}
      {selectedUsers.length > 0 && (
        <TagGroup label="Selected members" size="md">
          <TagList className="flex max-w-[19.5rem] flex-wrap gap-1">
            {selectedUsers.map((user) => (
              <Tag key={user.id} id={user.id} avatarSrc={user.avatarUrl} onClose={removeUser}>
                {user.name}
              </Tag>
            ))}
          </TagList>
        </TagGroup>
      )}

      {/* Search panel — UUI Select.ComboBox handles input + floating listbox */}
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-[19.5rem] min-w-[19.5rem]">
          <Select.ComboBox
            key={comboKey}
            items={comboItems}
            placeholder="Search..."
            size="md"
            shortcut={false}
            // Keep listbox always open while panel is visible.
            // React Aria ignores programmatic focus() for menuTrigger="focus",
            // so we use the controlled isOpen prop instead.
            isOpen
            onOpenChange={() => {}}
            onSelectionChange={(key) => {
              if (key != null) addUser(String(key))
            }}
          >
            {(item) => (
              <Select.Item
                id={item.id}
                label={item.label}
                avatarUrl={item.avatarUrl}
                supportingText={item.supportingText}
              />
            )}
          </Select.ComboBox>
        </div>
      )}
    </div>
  )
}
