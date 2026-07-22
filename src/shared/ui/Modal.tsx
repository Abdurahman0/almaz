import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  heading?: string;
  children: ReactNode;
  wide?: boolean;
}

/** Themed dialog on Radix — focus-trapped, Esc/overlay close, scale-in 160ms. */
export function Modal({ open, onClose, heading, children, wide }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-[floatIn_160ms_ease-out]" />
        <Dialog.Content
          className={`card-velvet fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 data-[state=open]:animate-[modalIn_160ms_ease-out] ${
            wide ? 'max-w-3xl' : 'max-w-lg'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            {heading ? (
              <Dialog.Title className="text-md font-semibold text-text">{heading}</Dialog.Title>
            ) : (
              <span />
            )}
            <Dialog.Close asChild>
              <button
                aria-label="Yopish"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  heading: string;
  /** One-line consequence description. */
  description: string;
  confirmLabel?: string;
  loading?: boolean;
}

/** Danger confirm — the only way destructive actions are approved (no native dialogs). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  heading,
  description,
  confirmLabel = "O'chirish",
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} heading={heading}>
      <p className="text-sm text-muted">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="h-9 rounded-lg px-4 text-sm font-semibold text-muted transition-colors hover:bg-accent-soft hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Bekor qilish
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="h-9 rounded-lg border border-danger-soft px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
