'use client'

import type { ComponentType } from 'react'
import { BadgeWithDot, cx } from '@circos/ui'
import { LinkExternal01 } from '@untitledui/icons'
import type { GoalStatus } from '@/types/project'

type PropertyVariant =
  | { type: 'status'; value: GoalStatus }
  | { type: 'date'; value: string }
  | { type: 'epic'; code: string; href: string }
  | { type: 'none'; icon?: ComponentType<{ className?: string }> }

interface PropertiesValuesProps {
  label: string
  variant: PropertyVariant
}

const statusColorMap: Record<GoalStatus, 'gray' | 'brand' | 'success'> = {
  planning: 'gray',
  active: 'brand',
  completed: 'success',
}

const statusLabelMap: Record<GoalStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  completed: 'Completed',
}

function renderValue(variant: PropertyVariant) {
  switch (variant.type) {
    case 'status': {
      const color = statusColorMap[variant.value]
      const label = statusLabelMap[variant.value]
      return (
        <BadgeWithDot color={color} type="pill-color" size="sm">
          {label}
        </BadgeWithDot>
      )
    }

    case 'date':
      return <span className="text-sm text-secondary">{variant.value}</span>

    case 'epic':
      return (
        <a
          href={variant.href}
          className="text-sm text-brand-secondary underline inline-flex items-center gap-1"
        >
          {variant.code}
          <LinkExternal01 className="size-3.5" />
        </a>
      )

    case 'none': {
      const Icon = variant.icon
      return (
        <span className="text-sm text-quaternary inline-flex items-center gap-1.5">
          {Icon && <Icon className="size-4 fg-quaternary" />}
          None
        </span>
      )
    }
  }
}

export function PropertiesValues({ label, variant }: PropertiesValuesProps) {
  return (
    <div className={cx('flex flex-row items-center py-2')}>
      <span className="w-24 shrink-0 text-sm text-tertiary">{label}</span>
      <div className="flex-1 min-w-0">{renderValue(variant)}</div>
    </div>
  )
}
