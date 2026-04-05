'use client'

import { useRouter } from 'next/navigation'
import { Button, Badge, cx } from '@circos/ui'
import { ArrowLeft, FlipBackward, FlipForward, Save01, Send01 } from '@untitledui/icons'

export function BuilderTopBar() {
  const router = useRouter()

  return (
    <div className={cx('flex items-center bg-primary border-b border-primary h-[52px] shrink-0')}>
      {/* Back cell — isolated with border-r, structurally separate from flex row */}
      <div className="flex items-center justify-center px-2 py-2 border-r border-primary h-full">
        <Button
          color="tertiary"
          iconLeading={ArrowLeft}
          onClick={() => router.push('/office')}
        />
      </div>

      {/* Title */}
      <div className="flex items-center px-4">
        <p className="text-md font-semibold text-primary">CircOS Office - Map Builder</p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center group: Undo, Redo, Draft badge */}
      <div className="flex items-center gap-2">
        <Button
          color="tertiary"
          iconLeading={FlipBackward}
          isDisabled
        />
        <Button
          color="tertiary"
          iconLeading={FlipForward}
          isDisabled
        />
        <Badge color="brand" size="sm">Draft</Badge>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right group: Save Draft, Publish */}
      <div className="flex items-center gap-3 pr-4">
        <Button
          color="secondary"
          iconLeading={Save01}
          isDisabled
        >
          Save Draft
        </Button>
        <Button
          color="primary"
          iconLeading={Send01}
          isDisabled
        >
          Publish
        </Button>
      </div>
    </div>
  )
}
