import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Gift, ImagePlus, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  NumberInput,
  Select,
  SkeletonRows,
  toast,
} from '@/shared/ui';
import { uploadFile, UPLOAD_ACCEPT } from '@/shared/api/files';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import {
  useAddBoxMedia,
  useBoxes,
  useCategories,
  useCreateBox,
  useDeleteBox,
  useDeleteBoxMedia,
  useSetBoxStock,
  useUpdateBox,
} from '../hooks';
import { CatalogCard } from './CatalogCard';
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
      <p className="mb-1.5 text-xs font-semibold text-muted">Rang</p>
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
  media,
}: {
  draft: BoxDraft;
  setDraft: (d: BoxDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  /** stock_qty only editable on create (edit uses the ± stepper). */
  withStock: boolean;
  /** Photo gallery manager, shown when editing an existing box. */
  media?: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-[var(--r-md)] border border-border bg-surface-2/40 p-3">
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
      {media && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">Rasmlar</p>
          {media}
        </div>
      )}
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

/** Per-box photo gallery: thumbnails + upload (files -> URL -> box media). */
function BoxMediaStrip({ box, categoryId }: { box: BoxOut; categoryId: string }) {
  const add = useAddBoxMedia(categoryId);
  const remove = useDeleteBoxMedia(categoryId);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const up = await uploadFile(file);
        await add.mutateAsync({ id: box.id, image_url: up.url });
      }
    } catch {
      toast.error('Rasm yuklashda xatolik');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const media = [...box.media].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {media.map((m) => (
        <span key={m.id} className="group relative h-11 w-11 overflow-hidden rounded-lg border border-border">
          <img src={m.image_url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="Rasmni o'chirish"
            onClick={() =>
              remove.mutate(m.id, { onError: () => toast.error("Rasmni o'chirishда xatolik") })
            }
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4 text-white" strokeWidth={1.5} />
          </button>
        </span>
      ))}
      <button
        type="button"
        aria-label="Rasm qo'shish"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-border text-muted transition-colors hover:border-accent hover:text-accent-ink disabled:opacity-50"
      >
        <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => onUpload(e.target.files)}
      />
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

  const editingBox = boxes.data?.find((b) => b.id === editId) ?? null;

  const stepper = (b: BoxOut) => (
    <div className="flex items-center justify-between">
      <span className="text-2xs text-muted">Zaxira</span>
      <div className="flex items-center gap-1.5">
        <button
          aria-label="Kamaytirish"
          onClick={() => bump(b, -1)}
          disabled={b.stock_qty <= 0}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--r-xs)] border border-border text-muted transition-colors hover:text-text disabled:opacity-40"
        >
          <Minus className="h-3 w-3" strokeWidth={2} />
        </button>
        <span className="tnum w-12 text-center text-2xs text-text" title="Mavjud / zaxira">
          {b.available}/{b.stock_qty}
        </span>
        <button
          aria-label="Ko'paytirish"
          onClick={() => bump(b, 1)}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--r-xs)] border border-border text-muted transition-colors hover:text-text"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 border-t border-border pt-4">
      {boxes.isPending && <SkeletonRows rows={2} />}

      {/* add / edit panel */}
      {adding && (
        <BoxEditor
          draft={addDraft}
          setDraft={setAddDraft}
          saving={create.isPending}
          withStock
          onCancel={() => { setAdding(false); setAddDraft(emptyBox); }}
          onSave={() =>
            create.mutate(createBody(addDraft), {
              onSuccess: () => { setAdding(false); setAddDraft(emptyBox); toast.success("Sovg'a qutisi qo'shildi"); },
              onError: () => toast.error('Xatolik'),
            })
          }
        />
      )}
      {editingBox && (
        <BoxEditor
          draft={editDraft}
          setDraft={setEditDraft}
          saving={update.isPending}
          withStock={false}
          media={<BoxMediaStrip box={editingBox} categoryId={categoryId} />}
          onCancel={() => setEditId(null)}
          onSave={() =>
            update.mutate(
              { id: editingBox.id, body: updateBody(editDraft) },
              {
                onSuccess: () => { setEditId(null); toast.success('Saqlandi'); },
                onError: () => toast.error('Xatolik'),
              },
            )
          }
        />
      )}

      {/* card grid — same presentation as products */}
      {boxes.isSuccess && boxes.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boxes.data.map((b) => (
            <CatalogCard
              key={b.id}
              imageUrl={b.media[0]?.image_url}
              placeholderIcon={<Gift className="h-8 w-8 text-muted/45" strokeWidth={1.25} />}
              tintHex={b.color_hex}
              leading={
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-strong"
                  style={{ background: b.color_hex }}
                  title={b.color_hex}
                />
              }
              name={pickName(b, lang)}
              price={Number(b.price)}
              free={b.is_free}
              available={b.available}
              statusBadge={!b.is_active ? { label: 'Nofaol', tone: 'muted' } : null}
              menuItems={[
                { label: 'Tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => startEdit(b) },
                { label: "O'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => setDeleting(b), destructive: true, separatorBefore: true },
              ]}
              footer={stepper(b)}
              onClick={() => startEdit(b)}
            />
          ))}
        </div>
      )}
      {boxes.isSuccess && boxes.data.length === 0 && !adding && (
        <EmptyState heading="Sovg'a qutisi yo'q" hint="Birinchi qutini qo'shing — rang, narx va zaxira bilan" />
      )}

      {!adding && !editId && (
        <Button size="sm" variant="secondary" onClick={() => { setEditId(null); setAdding(true); }}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Sovg'a qutisi qo'shish
        </Button>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        heading="Sovg'a qutisini o'chirish"
        description={`«${deleting ? pickName(deleting, lang) : ''}» butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          toast.success("O'chirildi");
          setDeleting(null);
        }}
      />
    </div>
  );
}
