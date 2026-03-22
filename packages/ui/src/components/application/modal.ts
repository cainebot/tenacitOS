// Shim: re-export native UUI Modal + custom layout wrappers for pattern imports
export {
  Modal as NativeModal,
  ModalOverlay,
  Dialog,
  DialogTrigger,
} from "../../../../../src/components/application/modals/modal"

// Re-export the high-level Modal wrapper and layout components from modal-wrapper
export { Modal, ModalHeader, ModalBody, ModalFooter } from "./modal-wrapper"
export type { ModalSize } from "./modal-wrapper"
