'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Badge, cx } from '@circos/ui'
import { ArrowLeft, FlipBackward, FlipForward, Save01, Send01 } from '@untitledui/icons'
import { commandHistory } from '../stores/command-history'

export function BuilderTopBar() {
  const router = useRouter()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Subscribe to CommandHistory changes via onChange callback (NO polling)
  useEffect(() => {
    const syncState = () => {
      setCanUndo(commandHistory.canUndo)
      setCanRedo(commandHistory.canRedo)
    }
    // Subscribe to changes
    commandHistory.onChange = syncState
    // Initial sync
    syncState()
    return () => {
      // Cleanup: only unset if we're still the subscriber
      if (commandHistory.onChange === syncState) {
        commandHistory.onChange = null
      }
    }
  }, [])

  // Keyboard shortcuts: Cmd+Z (undo), Cmd+Shift+Z / Cmd+Y (redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        commandHistory.undo()
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        commandHistory.redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
          isDisabled={!canUndo}
          onClick={() => commandHistory.undo()}
          aria-label="Undo"
        />
        <Button
          color="tertiary"
          iconLeading={FlipForward}
          isDisabled={!canRedo}
          onClick={() => commandHistory.redo()}
          aria-label="Redo"
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
