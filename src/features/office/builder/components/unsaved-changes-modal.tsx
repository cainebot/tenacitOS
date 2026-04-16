'use client'

import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '@circos/ui'
import { Save01 } from '@untitledui/icons'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onClose: () => void
  onDiscard: () => void
  onSave: () => void
  isSaving: boolean
}

export function UnsavedChangesModal({
  isOpen,
  onClose,
  onDiscard,
  onSave,
  isSaving,
}: UnsavedChangesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      size="sm"
    >
      <ModalHeader>Unsaved Changes</ModalHeader>
      <ModalBody>
        <p className="text-sm text-tertiary">
          You have unsaved changes. Discard or save?
        </p>
      </ModalBody>
      <ModalFooter>
        <Button
          color="secondary-destructive"
          onClick={onDiscard}
          className="flex-1"
        >
          Discard
        </Button>
        <Button
          color="primary"
          iconLeading={Save01}
          onClick={onSave}
          isLoading={isSaving}
          className="flex-1"
        >
          Save Draft
        </Button>
      </ModalFooter>
    </Modal>
  )
}
