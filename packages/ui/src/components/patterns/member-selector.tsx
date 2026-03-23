"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, ChevronUp, SearchLg } from "@untitledui/icons"
import { Avatar } from "../base/avatar"
import { BadgeWithButton, BadgeWithIcon } from "../base/badge"
import { InputBase } from "../base/input/input"
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
  const [search, setSearch] = useState("")
  const [internalSelected, setInternalSelected] = useState<string[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  const isControlled = selected !== undefined
  const selectedIds = isControlled ? selected : internalSelected

  // Click-outside handler
  useEffect(() => {
    if (!open) return

    const handleMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }

    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [open])

  const toggleUser = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id]

    if (isControlled) {
      onChange?.(next)
    } else {
      setInternalSelected(next)
      onChange?.(next)
    }
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

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.handle.toLowerCase().includes(search.toLowerCase()),
  )

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id))

  return (
    <div ref={wrapperRef} className={cx("relative inline-flex flex-col gap-1.5", className)}>
      {/* Trigger row */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev)
          if (open) setSearch("")
        }}
        className="cursor-pointer"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <BadgeWithIcon
          color="gray"
          size="md"
          iconTrailing={open ? ChevronUp : ChevronDown}
        >
          {label}
        </BadgeWithIcon>
      </button>

      {/* Selected tags row */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUsers.map((user) => (
            <BadgeWithButton
              key={user.id}
              color="gray"
              size="sm"
              onButtonClick={() => removeUser(user.id)}
              buttonLabel={`Remove ${user.name}`}
            >
              <Avatar
                size="xs"
                src={user.avatarUrl}
                alt={user.name}
                initials={user.name.charAt(0).toUpperCase()}
                className="mr-1"
              />
              {user.name}
            </BadgeWithButton>
          ))}
        </div>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-secondary bg-primary p-1 shadow-lg">
          {/* Search input */}
          <div className="mb-1">
            <InputBase
              icon={SearchLg}
              placeholder="Search..."
              size="sm"
              value={search}
              onChange={(value) => setSearch(value)}
              aria-label="Search members"
            />
          </div>

          {/* User list */}
          <div className="max-h-60 overflow-y-auto" role="listbox" aria-label="Members">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-tertiary">No members found</div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id)
                return (
                  <button
                    key={user.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleUser(user.id)}
                    className={cx(
                      "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left transition duration-100 ease-linear",
                      "hover:bg-primary_hover",
                    )}
                  >
                    <Avatar
                      size="xs"
                      src={user.avatarUrl}
                      alt={user.name}
                      initials={user.name.charAt(0).toUpperCase()}
                    />

                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-secondary">
                        {user.name}
                      </span>
                      <span className="block truncate text-sm text-tertiary">
                        {user.handle}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="size-4 shrink-0 text-brand-primary" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
