'use client'

import { cx } from '@circos/ui'
import { StepIconBase } from '@circos/ui'

interface GoalItemProps {
  title: string
  isComplete: boolean
  onClick?: () => void
}

export function GoalItem({ title, isComplete, onClick }: GoalItemProps) {
  const content = (
    <>
      {isComplete ? (
        <StepIconBase status="Complete" size="md" className="shrink-0" />
      ) : (
        <StepIconBase status="Incomplete" size="md" className="shrink-0" />
      )}
      <span
        className={cx(
          'text-lg font-semibold truncate',
          isComplete ? 'line-through text-quaternary' : 'text-primary',
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
        className="flex flex-row items-center gap-[18px] w-full cursor-pointer hover:bg-primary_hover rounded-md px-2 py-1.5 text-left"
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="flex flex-row items-center gap-[18px] px-2 py-1.5">
      {content}
    </div>
  )
}
