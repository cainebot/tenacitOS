'use client'

import { useState, type ReactNode } from 'react'
import { cx } from '@circos/ui'
import { ChevronRight, ChevronDown } from '@untitledui/icons'

interface AccordionOverviewProps {
  title: string
  projectId: string
  section: string // 'description' | 'goals' | 'members'
  children: ReactNode
  action?: ReactNode // Optional action button (e.g., "+ New Goal")
}

export function AccordionOverview({
  title,
  projectId,
  section,
  children,
  action,
}: AccordionOverviewProps) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`overview-accordions-${projectId}`)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>
        // Default to true (open) if section key not present
        return parsed[section] !== false
      }
    } catch {
      // SSR or storage error — default to open
    }
    return true
  })

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev
      try {
        const stored = localStorage.getItem(`overview-accordions-${projectId}`)
        const current: Record<string, boolean> = stored ? (JSON.parse(stored) as Record<string, boolean>) : {}
        current[section] = next
        localStorage.setItem(`overview-accordions-${projectId}`, JSON.stringify(current))
      } catch {
        // SSR or storage error — ignore
      }
      return next
    })
  }

  return (
    <div>
      <div
        className={cx(
          'flex flex-row items-center gap-2 py-4 cursor-pointer border-b border-secondary',
        )}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
      >
        {isOpen ? (
          <ChevronDown className="size-5 fg-quaternary shrink-0" />
        ) : (
          <ChevronRight className="size-5 fg-quaternary shrink-0" />
        )}
        <span className="text-sm font-semibold text-secondary flex-1">{title}</span>
        {action && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            {action}
          </div>
        )}
      </div>
      {isOpen && (
        <div className="pb-6">
          {children}
        </div>
      )}
    </div>
  )
}
