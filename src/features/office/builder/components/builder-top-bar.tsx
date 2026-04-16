'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Badge, cx } from '@circos/ui'
import { ArrowLeft, FlipBackward, FlipForward, Save01, Send01 } from '@untitledui/icons'
import { commandHistory } from '../stores/command-history'
import { useBuilderStore } from '../stores/builder-store'
import { useOfficeStore } from '@/features/office/stores/office-store'
import { useBuilderSave } from '../hooks/use-builder-save'
import { PublishConfirmModal } from './publish-confirm-modal'
import { UnsavedChangesModal } from './unsaved-changes-modal'
import type { OfficeMapDocument } from '@/features/office/types'

export function BuilderTopBar() {
  const router = useRouter()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [showUnsaved, setShowUnsaved] = useState(false)

  const dirty = useBuilderStore((s) => s.dirty)
  const currentVersionNum = useBuilderStore((s) => s.currentVersionNum)
  const zones = useBuilderStore((s) => s.zones)

  const { saveDraft, publish, saving, error, clearError } = useBuilderSave()

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

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 3000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  // Serialize current grid state to OfficeMapDocument
  const serializeMap = useCallback((): OfficeMapDocument | null => {
    const grid = (globalThis as any).__circos_builder_grid
    const mapDoc = useOfficeStore.getState().mapDocument
    if (!grid || !mapDoc) return null
    return grid.serialize(zones, mapDoc) as OfficeMapDocument
  }, [zones])

  // Back button: intercept if dirty
  const handleBack = () => {
    if (dirty) {
      setShowUnsaved(true)
    } else {
      router.push('/office')
    }
  }

  return (
    <div className={cx('flex items-start bg-primary border-b border-primary shrink-0')}>
      {/* Back cell — isolated with border-r */}
      <div className="flex items-center p-3 border-r border-primary shrink-0">
        <Button
          size="lg"
          color="tertiary"
          iconLeading={ArrowLeft}
          onClick={handleBack}
        />
      </div>

      {/* Content area — flex-1, justify-between */}
      <div className="flex flex-1 items-center justify-between px-4 py-3 self-stretch">
        {/* Left group: Title + Undo/Redo + Draft badge */}
        <div className="flex items-center gap-6">
          <p className="text-lg font-semibold text-primary">CircOS Office - Map Builder</p>
          <div className="flex items-center gap-2">
            <Button
              size="lg"
              color="tertiary"
              iconLeading={FlipBackward}
              isDisabled={!canUndo}
              onClick={() => commandHistory.undo()}
              aria-label="Undo"
            />
            <Button
              size="lg"
              color="tertiary"
              iconLeading={FlipForward}
              isDisabled={!canRedo}
              onClick={() => commandHistory.redo()}
              aria-label="Redo"
            />
            <Badge type="modern" color="brand" size="md">Draft</Badge>
          </div>
        </div>

        {/* Right group: error message + Save Draft + Publish */}
        <div className="flex items-center gap-2">
          {error && (
            <p className="text-sm text-error-primary animate-in fade-in">{error}</p>
          )}
          <Button
            size="lg"
            color="secondary"
            iconLeading={Save01}
            isDisabled={!dirty || saving}
            isLoading={saving}
            onClick={async () => {
              const mapJson = serializeMap()
              await saveDraft(mapJson)
            }}
          >
            Save Draft
          </Button>
          <Button
            size="lg"
            color="primary"
            iconLeading={Send01}
            isDisabled={saving}
            onClick={() => setShowPublish(true)}
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Publish confirmation modal */}
      <PublishConfirmModal
        isOpen={showPublish}
        onClose={() => setShowPublish(false)}
        onPublish={async () => {
          const mapJson = serializeMap()
          const result = await publish(mapJson)
          if (result) setShowPublish(false)
        }}
        currentVersionNum={currentVersionNum}
        nextVersionNum={currentVersionNum + 1}
        isPublishing={saving}
      />

      {/* Unsaved changes modal */}
      <UnsavedChangesModal
        isOpen={showUnsaved}
        onClose={() => setShowUnsaved(false)}
        onDiscard={() => {
          useBuilderStore.getState().markClean()
          router.push('/office')
        }}
        onSave={async () => {
          const mapJson = serializeMap()
          const result = await saveDraft(mapJson)
          if (result) router.push('/office')
        }}
        isSaving={saving}
      />
    </div>
  )
}
