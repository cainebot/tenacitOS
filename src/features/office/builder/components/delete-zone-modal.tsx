'use client'

import { Trash03 } from '@untitledui/icons'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '@circos/ui'

interface DeleteZoneModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  zoneName: string
}

export function DeleteZoneModal({ isOpen, onClose, onConfirm, zoneName }: DeleteZoneModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      size="sm"
    >
      <ModalHeader>Delete Zone</ModalHeader>
      <ModalBody>
        <p className="text-sm text-tertiary">
          Are you sure you want to delete &ldquo;{zoneName}&rdquo;? This will remove all painted
          tiles associated with this zone. This action cannot be undone.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          color="primary-destructive"
          iconLeading={Trash03}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  )
}
