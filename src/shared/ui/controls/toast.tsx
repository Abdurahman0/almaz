import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

let nextId = 1;
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function push(kind: ToastKind, message: string) {
  toasts = [...toasts, { id: nextId++, kind, message }];
  emit();
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Global imperative toast API — replaces inline success hacks and alert(). */
export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
};

const icons: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};
const bars: Record<ToastKind, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-accent',
};
const iconColor: Record<ToastKind, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent-ink',
};

function ToastCard({ item }: { item: ToastItem }) {
  const [hover, setHover] = useState(false);
  const remaining = useRef(3500);
  const started = useRef(0);

  useEffect(() => {
    if (hover) return;
    started.current = Date.now();
    const t = window.setTimeout(() => dismissToast(item.id), remaining.current);
    return () => {
      window.clearTimeout(t);
      remaining.current -= Date.now() - started.current;
    };
  }, [hover, item.id]);

  const Icon = icons[item.kind];
  return (
    <div
      role="status"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="float-panel pointer-events-auto relative flex w-80 items-start gap-2.5 overflow-hidden py-3 pl-4 pr-2 animate-[toastIn_180ms_ease-out]"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${bars[item.kind]}`} aria-hidden />
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor[item.kind]}`} strokeWidth={1.5} />
      <p className="min-w-0 flex-1 text-sm text-text">{item.message}</p>
      <button
        onClick={() => dismissToast(item.id)}
        aria-label="Yopish"
        className="rounded p-1 text-muted transition-colors hover:text-text"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** Mount once near the app root. Top-right stack, hover pauses auto-dismiss. */
export function ToastViewport() {
  const items = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
  );
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-2">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}
