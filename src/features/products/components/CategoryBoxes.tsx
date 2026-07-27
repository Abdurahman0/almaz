import { useEffect, useState } from 'react';
import { Check, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  Money,
  NumberInput,
  Select,
  SkeletonRows,
  toast,
} from '@/shared/ui';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import {
  useBoxes,
  useCategories,
  useCreateBox,
  useDeleteBox,
  useSetBoxStock,
  useUpdateBox,
} from '../hooks';
import type { BoxOut } from '@/shared/api/types';

const PRESETS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB', '#1E88E5',
  '#00897B', '#43A047', '#C0CA33', '#FDD835', '#FB8C00', '#6D4C41',
  '#546E7A', '#000000', '#FFFFFF', '#F5F5F5',
];

/** Handmade hex color field: swatch preview + text input + preset grid. */
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-caps text-muted">Rang</p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="h-9 w-9 shrink-0 rounded-lg border border-strong"
          style={{ background: /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : 'transparent' }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#E53935"
          aria-label="Rang hex kodi"
          className="tnum w-28 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent"
        />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => onChange(c)}
              className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
                value.toUpperCase() === c ? 'border-accent ring-2 ring-accent/50' : 'border-border'
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface BoxDraft {
  name_uz: string;
  name_ru: string;
  color_hex: string;
  price: number | '';
  stock_qty: number | '';
  is_active: boolean;
  sort_order: number | '';
}
const emptyBox: BoxDraft = {
  name_uz: '',
  name_ru: '',
  color_hex: '#E53935',
  price: 0,
  stock_qty: 0,
  is_active: true,
  sort_order: '',
};

function BoxEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  withStock,
}: {
  draft: BoxDraft;
  setDraft: (d: BoxDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  /** stock_qty only editable on create (edit uses the ± stepper). */
  withStock: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Nomi (uz)"
          value={draft.name_uz}
          onChange={(e) => setDraft({ ...draft, name_uz: e.target.value })}
        />
        <Input
          label="Nomi (ru)"
          value={draft.name_ru}
          onChange={(e) => setDraft({ ...draft, name_ru: e.target.value })}
        />
      </div>
      <ColorField value={draft.color_hex} onChange={(v) => setDraft({ ...draft, color_hex: v })} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <NumberInput
          label="Narx (0 = tekin)"
          suffix="so'm"
          thousands
          step={1000}
          min={0}
          value={draft.price}
          onChange={(v) => setDraft({ ...draft, price: v })}
        />
        {withStock && (
          <NumberInput
            label="Zaxira"
            suffix="dona"
            step={1}
            min={0}
            value={draft.stock_qty}
            onChange={(v) => setDraft({ ...draft, stock_qty: v })}
          />
        )}
        <NumberInput
          label="Tartib"
          size="sm"
          min={0}
          value={draft.sort_order}
          onChange={(v) => setDraft({ ...draft, sort_order: v })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Checkbox
          checked={draft.is_active}
          onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
          label="Faol"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button size="sm" onClick={onSave} loading={saving} disabled={draft.name_uz.trim().length < 1}>
            <Check className="h-4 w-4" strokeWidth={2} /> Saqlash
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Standalone gift-box manager: pick a category, then manage its colored boxes
 * like any other product line (price, stock, colors). Boxes are category-scoped
 * on the backend, so the category selector is the entry point.
 */
export function BoxManager() {
  const lang = useUiStore((s) => s.lang);
  const categories = useCategories();
  const [catId, setCatId] = useState('');

  useEffect(() => {
    if (!catId && categories.data && categories.data.length > 0) setCatId(categories.data[0].id);
  }, [categories.data, catId]);

  const options = (categories.data ?? []).map((c) => ({ value: c.id, label: pickName(c, lang) }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Sovg'a qutilari kategoriyaga biriktiriladi. Kategoriyani tanlab, ranglarni, narx va zaxirani
        boshqaring.
      </p>
      {categories.isPending && <SkeletonRows rows={2} />}
      {categories.isSuccess && categories.data.length === 0 && (
        <EmptyState heading="Kategoriya yo'q" hint="Avval katalog sozlamalarida kategoriya qo'shing" />
      )}
      {categories.isSuccess && categories.data.length > 0 && (
        <>
          <div className="max-w-xs">
            <Select
              label="Kategoriya"
              placeholder="Kategoriyani tanlang"
              options={options}
              value={catId}
              onChange={setCatId}
            />
          </div>
          {catId && <CategoryBoxes categoryId={catId} />}
        </>
      )}
    </div>
  );
}

/** Colored-box manager for a single category (add / edit / delete + stock ±). */
export function CategoryBoxes({ categoryId }: { categoryId: string }) {
  const lang = useUiStore((s) => s.lang);
  const boxes = useBoxes(categoryId, false);
  const create = useCreateBox(categoryId);
  const update = useUpdateBox(categoryId);
  const remove = useDeleteBox(categoryId);
  const stock = useSetBoxStock(categoryId);

  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<BoxDraft>(emptyBox);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<BoxDraft>(emptyBox);
  const [deleting, setDeleting] = useState<BoxOut | null>(null);

  const createBody = (d: BoxDraft) => ({
    name_uz: d.name_uz.trim(),
    name_ru: d.name_ru.trim() || null,
    color_hex: d.color_hex.trim() || undefined,
    price: d.price === '' ? 0 : d.price,
    stock_qty: d.stock_qty === '' ? 0 : d.stock_qty,
    is_active: d.is_active,
    sort_order: d.sort_order === '' ? 0 : d.sort_order,
  });
  const updateBody = (d: BoxDraft) => ({
    name_uz: d.name_uz.trim(),
    name_ru: d.name_ru.trim() || null,
    color_hex: d.color_hex.trim() || undefined,
    price: d.price === '' ? 0 : d.price,
    is_active: d.is_active,
    sort_order: d.sort_order === '' ? 0 : d.sort_order,
  });

  const startEdit = (b: BoxOut) => {
    setAdding(false);
    setEditId(b.id);
    setEditDraft({
      name_uz: b.name_uz,
      name_ru: b.name_ru ?? '',
      color_hex: b.color_hex,
      price: Number(b.price),
      stock_qty: b.stock_qty,
      is_active: b.is_active,
      sort_order: b.sort_order,
    });
  };

  const bump = (b: BoxOut, delta: number) => {
    if (b.stock_qty + delta < 0) return;
    stock.mutate(
      { id: b.id, body: { delta } },
      { onError: () => toast.error('Zaxirani yangilashда xatolik') },
    );
  };

  return (
    <div className="space-y-3 border-t border-border pt-3">
      {boxes.isPending && <SkeletonRows rows={2} />}

      <div className="space-y-2">
        {boxes.data?.map((b) =>
          editId === b.id ? (
            <BoxEditor
              key={b.id}
              draft={editDraft}
              setDraft={setEditDraft}
              saving={update.isPending}
              withStock={false}
              onCancel={() => setEditId(null)}
              onSave={() =>
                update.mutate(
                  { id: b.id, body: updateBody(editDraft) },
                  {
                    onSuccess: () => { setEditId(null); toast.success('Saqlandi'); },
                    onError: () => toast.error('Xatolik'),
                  },
                )
              }
            />
          ) : (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span
                className="h-6 w-6 shrink-0 rounded-md border border-strong"
                style={{ background: b.color_hex }}
                title={b.color_hex}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{pickName(b, lang)}</p>
                <p className="text-2xs text-muted">
                  {b.is_free ? (
                    <span className="text-success">Tekin</span>
                  ) : (
                    <Money short value={Number(b.price)} />
                  )}
                </p>
              </div>

              {/* stock stepper */}
              <div className="flex items-center gap-1.5">
                <button
                  aria-label="Kamaytirish"
                  onClick={() => bump(b, -1)}
                  disabled={b.stock_qty <= 0}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-text disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <span className="tnum w-14 text-center text-xs text-text" title="Mavjud / zaxira">
                  {b.available}/{b.stock_qty}
                </span>
                <button
                  aria-label="Ko'paytirish"
                  onClick={() => bump(b, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-text"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>

              {!b.is_active && <Badge tone="muted">Nofaol</Badge>}
              <div className="flex items-center gap-1">
                <button
                  aria-label="Tahrirlash"
                  onClick={() => startEdit(b)}
                  className="rounded p-1.5 text-muted hover:text-accent-ink"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button
                  aria-label="O'chirish"
                  onClick={() => setDeleting(b)}
                  className="rounded p-1.5 text-muted hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ),
        )}
        {boxes.isSuccess && boxes.data.length === 0 && !adding && (
          <p className="text-xs text-muted">Ranglar qo'shilmagan.</p>
        )}
      </div>

      {adding ? (
        <BoxEditor
          draft={addDraft}
          setDraft={setAddDraft}
          saving={create.isPending}
          withStock
          onCancel={() => { setAdding(false); setAddDraft(emptyBox); }}
          onSave={() =>
            create.mutate(createBody(addDraft), {
              onSuccess: () => { setAdding(false); setAddDraft(emptyBox); toast.success("Rang qo'shildi"); },
              onError: () => toast.error('Xatolik'),
            })
          }
        />
      ) : (
        <Button size="sm" variant="secondary" onClick={() => { setEditId(null); setAdding(true); }}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Rang qo'shish
        </Button>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        heading="Rangni o'chirish"
        description={`«${deleting ? pickName(deleting, lang) : ''}» rangi o'chiriladi.`}
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => { setDeleting(null); toast.success("O'chirildi"); },
            onError: () => toast.error("O'chirishda xatolik"),
          })
        }
      />
    </div>
  );
}
