'use client'

import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '@circos/ui'
import { Send01 } from '@untitledui/icons'

interface PublishConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish: () => void
  currentVersionNum: number
  nextVersionNum: number
  isPublishing: boolean
}

export function PublishConfirmModal({
  isOpen,
  onClose,
  onPublish,
  currentVersionNum,
  nextVersionNum,
  isPublishing,
}: PublishConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      size="sm"
    >
      <ModalHeader>Publish Map v{nextVersionNum}?</ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-tertiary">
            This will update the live office for all connected viewers.
          </p>
          <p className="text-sm text-tertiary">
            Current version: v{currentVersionNum}
          </p>
          <p className="text-sm text-tertiary">
            New version: v{nextVersionNum}
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          color="primary"
          iconLeading={Send01}
          onClick={onPublish}
          isLoading={isPublishing}
          className="flex-1"
        >
          Publish
        </Button>
      </ModalFooter>
    </Modal>
  )
}
