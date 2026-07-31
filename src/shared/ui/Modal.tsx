import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  heading?: string;
  children: ReactNode;
  wide?: boolean;
  /** md caps the panel narrower (confirm dialogs); default lg. */
  size?: 'md' | 'lg';
  /** Element to focus when the dialog opens (overrides Radix default). */
  initialFocus?: RefObject<HTMLElement | null>;
}

/** Themed dialog on Radix — focus-trapped, Esc/overlay close, scale-in 160ms. */
export function Modal({ open, onClose, heading, children, wide, size = 'lg', initialFocus }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-md data-[state=open]:animate-[floatIn_160ms_ease-out]" />
        <Dialog.Content
          onOpenAutoFocus={
            initialFocus
              ? (e) => {
                  e.preventDefault();
                  initialFocus.current?.focus();
                }
              : undefined
          }
          className={`glass fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--r-lg)] p-6 shadow-lg data-[state=open]:animate-[modalIn_180ms_ease-out] ${
            wide ? 'max-w-3xl' : size === 'md' ? 'max-w-md' : 'max-w-lg'
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
                className="rounded-[var(--r-sm)] p-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
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
  /**
   * The destructive action. May be sync (paired with `loading`) or async — when
   * it returns a promise the dialog drives its own spinner and, if the promise
   * rejects, shows the error inline and stays open (the user keeps their place).
   */
  onConfirm: () => void | Promise<unknown>;
  heading: string;
  /** One-line consequence description. */
  description: string;
  confirmLabel?: string;
  /** External busy state, for legacy `mutate` callers. */
  loading?: boolean;
  /** External inline error, for legacy callers that track it themselves. */
  error?: string | null;
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
  error,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  // reset transient state whenever the dialog is (re)opened/closed
  useEffect(() => {
    if (!open) {
      setBusy(false);
      setLocalErr(null);
    }
  }, [open]);

  const isBusy = busy || Boolean(loading);
  const shownErr = localErr ?? error ?? null;

  const handleConfirm = async () => {
    setLocalErr(null);
    try {
      const r = onConfirm();
      if (r && typeof (r as { then?: unknown }).then === 'function') {
        setBusy(true);
        await r;
      }
    } catch (e) {
      // failure: keep the dialog open, surface the reason inline
      setLocalErr(e instanceof Error && e.message ? e.message : "Amalni bajarib bo'lmadi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} heading={heading} size="md" initialFocus={cancelRef}>
      <p className="text-sm text-muted">{description}</p>
      {shownErr && (
        <p role="alert" className="mt-3 rounded-[var(--r-sm)] bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
          {shownErr}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          ref={cancelRef}
          onClick={onClose}
          disabled={isBusy}
          className="h-9 rounded-[var(--r-sm)] px-4 text-sm font-semibold text-muted transition-colors hover:bg-accent-soft hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Bekor qilish
        </button>
        <button
          onClick={handleConfirm}
          disabled={isBusy}
          className="flex h-9 items-center gap-2 rounded-[var(--r-sm)] border border-danger-soft px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isBusy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
