'use client'

import { cx } from '@circos/ui'
import { CheckCircle } from '@untitledui/icons'

interface GoalItemProps {
  title: string
  isComplete: boolean
  onClick?: () => void
}

export function GoalItem({ title, isComplete, onClick }: GoalItemProps) {
  const content = (
    <>
      {isComplete ? (
        <CheckCircle className="size-5 fg-brand-primary shrink-0" />
      ) : (
        <div className="size-5 rounded-full border-2 border-secondary shrink-0" />
      )}
      <span
        className={cx(
          'text-sm truncate',
          isComplete ? 'line-through text-tertiary' : 'text-secondary',
        )}
      >
        {title}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className="flex flex-row items-center gap-3 w-full cursor-pointer hover:bg-primary_hover rounded-md px-2 py-1.5 text-left"
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="flex flex-row items-center gap-3 px-2 py-1.5">
      {content}
    </div>
  )
}
