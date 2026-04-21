'use client'

import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '@circos/ui'

interface ZoneRequiredModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ZoneRequiredModal({ isOpen, onClose }: ZoneRequiredModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      size="sm"
    >
      <ModalHeader>Selecciona una zona</ModalHeader>
      <ModalBody>
        <p className="text-sm text-tertiary">
          Debes tener seleccionada al menos una zona para poder pintar zonas en el mapa.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  )
}
