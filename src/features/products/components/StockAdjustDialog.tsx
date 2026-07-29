import { useEffect, useState } from 'react';
import { Button, Modal, NumberInput, toast } from '@/shared/ui';
import type { ApiError } from '@/shared/api/client';
import { useAdjustStock } from '../hooks';
import type { ProductOut } from '@/shared/api/types';

type Mode = 'set' | 'delta';

/**
 * Adjust a product's stock via POST /catalog/variants/{id}/stock. Two modes from
 * the doc: SET an exact stock_qty, or apply a signed DELTA (+/−). Optimistic (the
 * hook patches every cached list and rolls back on error) + toast feedback.
 */
export function StockAdjustDialog({
  product,
  open,
  onClose,
}: {
  product: ProductOut | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const adjust = useAdjustStock();
  const variant =
    product?.variants.find((v) => v.fulfillment_type === 'stocked') ?? product?.variants[0];
  const current = variant?.stock_qty ?? 0;

  const [mode, setMode] = useState<Mode>('set');
  const [setVal, setSetVal] = useState<number | ''>(current);
  const [deltaVal, setDeltaVal] = useState<number | ''>('');

  // Re-seed the "set" field whenever a different product opens.
  useEffect(() => {
    if (open) {
      setMode('set');
      setSetVal(current);
      setDeltaVal('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const preview =
    mode === 'set'
      ? typeof setVal === 'number'
        ? setVal
        : current
      : Math.max(0, current + (typeof deltaVal === 'number' ? deltaVal : 0));

  const submit = () => {
    if (!variant) return;
    const body =
      mode === 'set'
        ? { stock_qty: typeof setVal === 'number' ? setVal : 0 }
        : { delta: typeof deltaVal === 'number' ? deltaVal : 0 };
    if (mode === 'delta' && !deltaVal) return; // nothing to add/subtract
    adjust.mutate(
      { variantId: variant.id, body },
      {
        onSuccess: () => {
          toast.success('Zaxira yangilandi');
          onClose();
        },
        onError: (e) => toast.error((e as unknown as ApiError).message || 'Zaxirani saqlashda xatolik'),
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} heading="Zaxirani sozlash">
      {!variant ? (
        <p className="text-sm text-muted">Bu mahsulotda variant yo'q — zaxira sozlab bo'lmaydi.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-[var(--r-md)] bg-surface-2 px-4 py-3 text-sm">
            <span className="text-muted">Hozirgi zaxira</span>
            <span className="tnum text-md font-semibold text-text">{current} dona</span>
          </div>

          {/* mode toggle */}
          <div className="flex rounded-[var(--r-md)] bg-surface-2 p-0.5 text-sm">
            {(['set', 'delta'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-[var(--r-sm)] py-1.5 font-medium transition-colors ${
                  mode === m ? 'bg-surface text-text shadow-xs' : 'text-muted hover:text-text'
                }`}
              >
                {m === 'set' ? 'Aniq son' : "Qo'shish / ayirish"}
              </button>
            ))}
          </div>

          {mode === 'set' ? (
            <NumberInput label="Yangi zaxira (dona)" value={setVal} onChange={setSetVal} min={0} step={1} suffix="dona" />
          ) : (
            <div>
              <NumberInput
                label="O'zgarish (± dona)"
                value={deltaVal}
                onChange={setDeltaVal}
                step={1}
                suffix="dona"
                placeholder="masalan 20 yoki -5"
              />
              <p className="mt-1 text-2xs text-muted">Manfiy son ayiradi (masalan −5).</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted">Natija</span>
            <span className="tnum text-md font-bold text-accent-ink">{preview} dona</span>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="button" onClick={submit} loading={adjust.isPending}>
              Saqlash
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
