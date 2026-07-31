import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Info, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  Combobox,
  ConfirmDialog,
  ErrorCard,
  Input,
  Money,
  NumberInput,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  orderStatusLabels,
  toast,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib/format';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import { FEATURES } from '@/shared/config/flags';
import type { ApiError } from '@/shared/api/client';
import type { OrderItemCreate, OrderOut, OrderStatus } from '@/shared/api/types';
import { useCombos, useProducts } from '@/features/products/hooks';
import { useStaff } from '@/features/settings/rbac';
import { useOrder, useReplaceOrderItems, useSetOrderStatus, useUpdateOrder } from '../hooks';

const STATUS_OPTIONS = (Object.keys(orderStatusLabels) as OrderStatus[]).map((s) => ({ value: s, label: orderStatusLabels[s] }));
// Cancellation/return releases stock — handled by /orders/{id}/cancel, never here.
const CANCEL_LIKE = new Set<OrderStatus>(['cancelled', 'refunded', 'returned']);
// Line-item editing is only accepted by the server in these statuses (probed live;
// draft added per §6 — verified editable 2026-07-31).
const EDITABLE_STATUSES = new Set<OrderStatus>(['draft', 'pending', 'waiting_payment', 'payment_review']);

/** One editable line-item row. Keyed by a stable client id, NOT the server item id
 *  (which the API regenerates on every /items replace). engraving_text + box_id are
 *  carried through untouched so a full-replacement save never drops them. */
interface EditRow {
  key: string;
  variant_id: string;
  quantity: number;
  ring_size: string;
  engraving_text: string | null;
  box_id: string | null;
  sizeError?: string;
  qtyError?: string;
}

/** Resolved product/combo facts for a variant_id. */
interface VariantMeta {
  name: string;
  sku: string;
  unitPrice: number;
  requiresRingSize: boolean;
  allowedSizes: string[] | null;
  isCombo: boolean;
}

const sig = (rows: EditRow[]) =>
  JSON.stringify(
    rows.map((r) => ({ v: r.variant_id, q: r.quantity, s: r.ring_size.trim(), e: r.engraving_text ?? null, b: r.box_id ?? null })),
  );

/*
 * Full order editor (FEATURES.orderEditing). Three live endpoints, deliberately kept
 * separate because they have different rules:
 *   - line items → PATCH /orders/{id}/items (full-replacement; server recalculates
 *     totals + stock; only in pending/waiting_payment/payment_review)
 *   - notes      → PATCH /orders/{id}
 *   - status     → POST  /orders/{id}/status (history-preserving)
 * Totals are always taken from the returned OrderOut — never computed on the client.
 */
export default function OrderEditPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const lang = useUiStore((s) => s.lang);
  const order = useOrder(orderId);
  const products = useProducts();
  const combos = useCombos({ status: 'active', limit: 100 });
  const replaceItems = useReplaceOrderItems(orderId);
  const update = useUpdateOrder(orderId);
  const setStatus = useSetOrderStatus();

  // variant_id -> resolved facts (product or combo).
  const metaMap = useMemo(() => {
    const m = new Map<string, VariantMeta>();
    for (const p of products.data ?? []) {
      for (const vr of p.variants) {
        m.set(vr.id, {
          name: pickName(p, lang),
          sku: vr.sku,
          unitPrice: Number(p.effective_price),
          requiresRingSize: Boolean(p.requires_ring_size),
          allowedSizes: p.available_sizes && p.available_sizes.length > 0 ? p.available_sizes : null,
          isCombo: false,
        });
      }
    }
    for (const c of combos.data?.items ?? []) {
      if (!c.variant_id) continue;
      m.set(c.variant_id, {
        name: pickName(c, lang),
        sku: "To'plam",
        unitPrice: Number(c.price),
        requiresRingSize: false,
        allowedSizes: null,
        isCombo: true,
      });
    }
    return m;
  }, [products.data, combos.data, lang]);

  const meta = (variantId: string): VariantMeta | null => metaMap.get(variantId) ?? null;

  // Options for the "add item" picker — active, in-stock variants + combos.
  const addOptions = useMemo(
    () => [
      ...(products.data ?? []).flatMap((p) =>
        p.variants
          .filter((vr) => vr.is_active)
          .map((vr) => ({
            value: vr.id,
            label: `${pickName(p, lang)} · ${vr.sku}`,
            description: `${formatMoney(Number(p.effective_price))} — ${vr.available} dona mavjud`,
            disabled: vr.available <= 0,
          })),
      ),
      ...(combos.data?.items ?? [])
        .filter((c) => c.variant_id)
        .map((c) => ({
          value: c.variant_id as string,
          label: `${pickName(c, lang)} · To'plam`,
          description: `${formatMoney(Number(c.price))} — ${c.available} to'plam mavjud`,
          disabled: c.available <= 0,
        })),
    ],
    [products.data, combos.data, lang],
  );

  const staff = useStaff();
  const operatorOptions = useMemo(
    () => [
      { value: '', label: 'Tayinlanmagan' },
      ...(staff.data ?? []).filter((u) => u.is_active).map((u) => ({ value: u.id, label: u.full_name || u.email })),
    ],
    [staff.data],
  );

  const [rows, setRows] = useState<EditRow[]>([]);
  const [status, setLocalStatus] = useState<OrderStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [addValue, setAddValue] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{ key: string; name: string } | null>(null);
  const seeded = useRef(false);
  const keyCounter = useRef(0);

  // Seed rows/status/notes from an authoritative OrderOut (initial load + after save).
  const applyOrder = (o: OrderOut) => {
    setRows(
      o.items.map((it) => ({
        key: `seed-${keyCounter.current++}`,
        variant_id: it.variant_id,
        quantity: it.quantity,
        ring_size: it.ring_size ?? '',
        engraving_text: it.engraving_text,
        box_id: it.box_id,
      })),
    );
    setLocalStatus(o.status);
    setNotes(o.notes ?? '');
    setOperatorId(o.assigned_operator_id ?? '');
    setStatusError(null);
    setPageError(null);
  };

  // Seed once on first load. Post-save re-seeding is explicit (from the returned
  // OrderOut) because React Query notifies cache updates asynchronously.
  useEffect(() => {
    if (order.data && !seeded.current) {
      applyOrder(order.data);
      seeded.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.data]);

  const orig = order.data;
  const originalSig = useMemo(
    () =>
      orig
        ? sig(
            orig.items.map((it) => ({
              key: '',
              variant_id: it.variant_id,
              quantity: it.quantity,
              ring_size: it.ring_size ?? '',
              engraving_text: it.engraving_text,
              box_id: it.box_id,
            })),
          )
        : '',
    [orig],
  );

  const editable = orig ? EDITABLE_STATUSES.has(orig.status) : false;
  const itemsChanged = editable && sig(rows) !== originalSig;
  const statusChanged = Boolean(orig) && status !== orig!.status;
  const notesChanged = Boolean(orig) && notes.trim() !== (orig!.notes ?? '');
  const operatorChanged = Boolean(orig) && (operatorId || null) !== (orig!.assigned_operator_id ?? null);
  const noItems = editable && rows.length === 0; // empty list → server 422; block the save
  const dirty = itemsChanged || statusChanged || notesChanged || operatorChanged;
  const saving = replaceItems.isPending || update.isPending || setStatus.isPending;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && !saving && currentLocation.pathname !== nextLocation.pathname,
  );

  if (!FEATURES.orderEditing) {
    return (
      <Card>
        <p className="text-sm text-muted">Buyurtmani tahrirlash o'chirilgan.</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate(`/orders/${orderId}`)}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Orqaga
        </Button>
      </Card>
    );
  }
  if (order.isPending) return <Skeleton className="h-64 w-full" />;
  if (order.isError || !orig) return <ErrorCard error={order.error} onRetry={() => order.refetch()} />;

  // ---- row mutators (clear the touched row's error on edit) ----
  const patchRow = (key: string, patch: Partial<EditRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const setQty = (key: string, quantity: number | '') => patchRow(key, { quantity: Math.max(1, Number(quantity) || 1), qtyError: undefined });
  const setSize = (key: string, ring_size: string) => patchRow(key, { ring_size, sizeError: undefined });
  const addItem = (variantId: string) => {
    if (!variantId) return;
    setRows((rs) => [
      ...rs,
      { key: `new-${keyCounter.current++}`, variant_id: variantId, quantity: 1, ring_size: '', engraving_text: null, box_id: null },
    ]);
    setAddValue('');
    setPageError(null);
  };
  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));

  // ---- estimate (provisional, shown while unsaved; server is authoritative) ----
  const estItemsTotal = rows.reduce((sum, r) => sum + (meta(r.variant_id)?.unitPrice ?? 0) * r.quantity, 0);
  const estGrandTotal = estItemsTotal + Number(orig.delivery_fee);

  const buildItems = (): OrderItemCreate[] =>
    rows.map((r) => {
      const m = meta(r.variant_id);
      if (m?.isCombo) return { variant_id: r.variant_id, quantity: r.quantity };
      return {
        variant_id: r.variant_id,
        quantity: r.quantity,
        ring_size: m?.requiresRingSize && r.ring_size.trim() ? r.ring_size.trim() : null,
        engraving_text: r.engraving_text || null,
        box_id: r.box_id || null,
      };
    });

  // Light client validation for fixed-size products — instant feedback; the server
  // is still the source of truth (its 400 is mapped back onto the row too).
  const validateRows = (): boolean => {
    let ok = true;
    setRows((rs) =>
      rs.map((r) => {
        const m = meta(r.variant_id);
        if (m?.requiresRingSize && m.allowedSizes) {
          const val = r.ring_size.trim();
          if (!val) {
            ok = false;
            return { ...r, sizeError: "O'lchamni tanlang" };
          }
          if (!m.allowedSizes.includes(val)) {
            ok = false;
            return { ...r, sizeError: `Mavjud o'lchamlar: ${m.allowedSizes.join(', ')}` };
          }
        }
        return r;
      }),
    );
    return ok;
  };

  const mapSaveError = (e: unknown) => {
    const msg = (e as ApiError)?.message ?? '';
    // Status restriction on the items endpoint (editing closed for this status).
    if (/holat=/.test(msg)) return setPageError(msg);
    // Ring-size whitelist 400: "…'20' o'lchami mavjud emas." → the offending row(s).
    if (/o'?lcham/i.test(msg)) {
      const bad = msg.match(/'([^']+)'/)?.[1] ?? null;
      const targets = rows.filter((r) => (bad ? r.ring_size.trim() === bad : true)).map((r) => r.key);
      if (targets.length) setRows((rs) => rs.map((r) => (targets.includes(r.key) ? { ...r, sizeError: msg } : r)));
      else setPageError(msg);
      return;
    }
    // Box/gift-box requirement 400 (e.g. "…quti majburiy…"). The API exposes no
    // per-category requires_box flag, so this can't be pre-validated — surface it.
    if (/quti|box/i.test(msg)) return setPageError(msg);
    // Insufficient stock 400: "Zaxira yetarli emas (SKU XXX): …" → that row's quantity.
    const sku = msg.match(/SKU\s+([^)\s:]+)/)?.[1] ?? null;
    if (sku) {
      const targets = rows.filter((r) => meta(r.variant_id)?.sku === sku).map((r) => r.key);
      if (targets.length) setRows((rs) => rs.map((r) => (targets.includes(r.key) ? { ...r, qtyError: msg } : r)));
      else setPageError(msg);
      return;
    }
    // Status-transition errors (from POST /status).
    if (/holat|status|o'?tish/i.test(msg)) return setStatusError(msg);
    toast.error(msg || 'Xatolik');
  };

  const save = async () => {
    setPageError(null);
    setStatusError(null);
    if (statusChanged && CANCEL_LIKE.has(status as OrderStatus)) {
      setStatusError("Bekor/qaytarish — buyurtma sahifasidagi «Bekor qilish» orqali");
      return;
    }
    if (noItems) {
      setPageError("Buyurtmada kamida bitta mahsulot bo'lishi kerak");
      return;
    }
    if (itemsChanged && !validateRows()) return;
    try {
      // Order matters: items first (while still editable), then the PATCH fields
      // (notes/operator — one request), then status.
      let latest: OrderOut | null = null;
      if (itemsChanged) latest = await replaceItems.mutateAsync({ items: buildItems() });
      if (notesChanged || operatorChanged) {
        latest = await update.mutateAsync({
          ...(notesChanged ? { notes: notes.trim() || null } : {}),
          ...(operatorChanged ? { assigned_operator_id: operatorId || null } : {}),
        });
      }
      if (statusChanged) latest = await setStatus.mutateAsync({ id: orderId, status: status as OrderStatus });
      if (latest) applyOrder(latest); // re-seed from the authoritative returned OrderOut
      toast.success('Saqlandi');
    } catch (e) {
      mapSaveError(e);
    }
  };

  const renderSize = (r: EditRow, m: VariantMeta) => {
    if (!m.requiresRingSize) return null;
    if (m.allowedSizes) {
      return (
        <div>
          <div className="flex flex-wrap gap-1.5">
            {m.allowedSizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(r.key, s)}
                className={`min-w-[44px] rounded-[var(--r-sm)] border px-2.5 py-1.5 text-xs font-semibold tnum transition-colors ${
                  r.ring_size === s ? 'border-accent bg-accent-soft text-accent-ink' : 'border-border text-text hover:border-strong'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {r.sizeError && <p className="mt-1 text-2xs text-danger">{r.sizeError}</p>}
        </div>
      );
    }
    return (
      <Input
        label="O'lcham"
        placeholder="masalan 17"
        inputMode="decimal"
        value={r.ring_size}
        onChange={(e) => setSize(r.key, e.target.value)}
        error={r.sizeError}
      />
    );
  };

  return (
    <div>
      <PageHeader
        heading={`${orig.order_no} — tahrirlash`}
        actions={
          <Button variant="ghost" onClick={() => navigate(`/orders/${orderId}`)}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Orqaga
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Line items */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-semibold text-text">Mahsulotlar</h2>
              <span className="text-2xs text-muted">{rows.length} ta</span>
            </div>

            {!editable && (
              <div className="flex gap-3 rounded-[var(--r-md)] border border-danger-soft bg-danger-soft/50 p-3.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={1.75} />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-text">Bu buyurtma tarkibini o'zgartirib bo'lmaydi</p>
                  <p className="mt-1 text-muted">
                    To'lov tasdiqlangan yoki yetkazish boshlangan (holat: {orderStatusLabels[orig.status]}). Mahsulot yoki o'lchamni
                    o'zgartirish uchun buyurtmani <span className="font-medium text-text">bekor qiling</span> va{' '}
                    <span className="font-medium text-text">yangisini yarating</span>. Holat va izohni bu yerda tahrirlash mumkin.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {rows.map((r) => {
                const m = meta(r.variant_id);
                const rowTotal = (m?.unitPrice ?? 0) * r.quantity;
                const sizeEl = m ? renderSize(r, m) : null;
                return (
                  <div key={r.key} className="rounded-[var(--r-md)] border border-border p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">{m ? m.name : 'Mahsulot'}</p>
                        <p className="mt-0.5 font-mono text-2xs text-muted">{m?.sku ?? r.variant_id.slice(0, 8)}</p>
                      </div>
                      <div className="text-right">
                        <p className="tnum text-sm font-semibold text-accent-ink">{formatMoney(rowTotal)}</p>
                        <p className="tnum text-2xs text-muted">{formatMoney(m?.unitPrice ?? 0)} × {r.quantity}</p>
                      </div>
                    </div>

                    {editable && (
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <div className="w-32">
                          <NumberInput
                            label="Miqdor"
                            size="sm"
                            value={r.quantity}
                            onChange={(v) => setQty(r.key, v)}
                            min={1}
                            suffix="dona"
                            error={r.qtyError}
                          />
                        </div>
                        {sizeEl && <div className="min-w-[8rem] flex-1">{sizeEl}</div>}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted hover:text-danger"
                          disabled={rows.length === 1}
                          title={rows.length === 1 ? "Oxirgi mahsulotni o'chirib bo'lmaydi" : undefined}
                          onClick={() => setConfirmRemove({ key: r.key, name: m ? m.name : 'Mahsulot' })}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} /> O'chirish
                        </Button>
                      </div>
                    )}

                    {!editable && r.ring_size && (
                      <p className="mt-2 text-2xs text-muted">O'lcham: <span className="tnum text-text">{r.ring_size}</span></p>
                    )}
                    {editable && m && !m.requiresRingSize && r.qtyError && (
                      <p className="mt-1 text-2xs text-danger">{r.qtyError}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {editable && (
              <Combobox
                label="Mahsulot qo'shish"
                placeholder="Mahsulot yoki to'plamni tanlang"
                options={addOptions}
                value={addValue}
                onChange={addItem}
              />
            )}

            {pageError && (
              <p className="rounded-[var(--r-sm)] border border-danger-soft bg-danger-soft px-4 py-2.5 text-sm text-danger">{pageError}</p>
            )}
          </Card>

          {/* Status + operator + notes */}
          <Card className="space-y-5">
            <Select
              label="Holat"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => { setLocalStatus(v as OrderStatus); setStatusError(null); }}
              error={statusError ?? undefined}
            />
            <Select
              label="Operator"
              options={operatorOptions}
              value={operatorId}
              onChange={setOperatorId}
              searchable
              disabled={staff.isPending}
            />
            <Textarea label="Izoh" placeholder="Ichki izoh" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Card>

          <div className="flex items-center justify-end gap-3">
            {noItems && <span className="mr-auto text-2xs text-danger">Kamida bitta mahsulot kerak</span>}
            <Button variant="ghost" onClick={() => navigate(`/orders/${orderId}`)}>Bekor qilish</Button>
            <Button onClick={save} loading={saving} disabled={!dirty || noItems}>Saqlash</Button>
          </div>
        </div>

        {/* Totals — authoritative from the last saved OrderOut */}
        <Card className="h-fit lg:sticky lg:top-6">
          <h2 className="mb-4 text-md font-semibold text-text">Summa</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Mahsulotlar</dt>
              <dd className="tnum text-text"><Money value={Number(orig.items_total)} /></dd>
            </div>
            {Number(orig.delivery_fee) > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Yetkazish</dt>
                <dd className="tnum text-text"><Money value={Number(orig.delivery_fee)} /></dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <dt className="text-muted">Jami (saqlangan)</dt>
              <dd className="text-md tnum text-accent-ink"><Money value={Number(orig.grand_total)} /></dd>
            </div>
          </dl>

          {itemsChanged && (
            <div className="mt-4 flex gap-2.5 rounded-[var(--r-sm)] border border-accent/30 bg-accent-soft/40 p-3 text-xs">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="flex justify-between gap-3 font-medium text-text">
                  <span>Taxminiy yangi jami</span>
                  <span className="tnum"><Money value={estGrandTotal} /></span>
                </p>
                <p className="mt-1 text-muted">Aniq summani server saqlangandan keyin hisoblaydi.</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        heading="Mahsulotni o'chirish"
        description={`«${confirmRemove?.name}» buyurtmadan olib tashlansinmi?`}
        confirmLabel="O'chirish"
        onConfirm={() => {
          if (confirmRemove) removeRow(confirmRemove.key);
          setConfirmRemove(null);
        }}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        heading="Saqlanmagan o'zgarishlar"
        description="O'zgarishlar saqlanmadi. Sahifadan chiqasizmi?"
        confirmLabel="Chiqish"
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}
