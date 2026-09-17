import { useId, type ReactNode } from 'react';
import { Modal, ModalBody, ModalHeader } from '../../src/ui';

export function InventoryDialog({ title, eyebrow, onClose, children, className = '' }: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const titleID = useId();
  return <Modal isOpen variant="small" className={`alpa-dialog ${className}`} aria-labelledby={titleID} onClose={onClose} elementToFocus="input, select, textarea">
    <ModalHeader title={title} labelId={titleID} description={eyebrow} />
    <ModalBody>{children}</ModalBody>
  </Modal>;
}
