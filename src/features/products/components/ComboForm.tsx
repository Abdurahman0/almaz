import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Layers, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Combobox,
  Input,
  Money,
  NumberInput,
  Select,
  SkeletonRows,
  Textarea,
  toast,
} from '@/shared/ui';
import { uploadFile, UPLOAD_ACCEPT } from '@/shared/api/files';
import { formatMoney } from '@/shared/lib/format';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import type { ApiError } from '@/shared/api/client';
import type { ComboOut, ProductOut, ProductStatus } from '@/shared/api/types';
import {
  useAddComboImage,
  useAddComboItem,
  useCombo,
  useCreateCombo,
  useDeleteComboItem,
  useProducts,
  useUpdateCombo,
} from '../hooks';

const statusOptions = [
  { value: 'draft', label: 'Qoralama' },
  { value: 'active', label: 'Faol' },
  { value: 'archived', label: 'Arxiv' },
];

interface VariantInfo {
  name: string;
  sku: string;
  price: string;
  available: number;
  image: string | null;
}

/** Flat variant options + a variant->info lookup, from the product catalog. */
function useVariantCatalog(products: ProductOut[] | undefined) {
  const lang = useUiStore((s) => s.lang);
  return useMemo(() => {
    const info = new Map<string, VariantInfo>();
    const options: Array<{ value: string; label: string; description: string; disabled?: boolean }> = [];
    (products ?? []).forEach((p) => {
      p.variants
        .filter((v) => v.is_active)
        .forEach((v) => {
          info.set(v.id, {
            name: pickName(p, lang),
            sku: v.sku,
            price: p.effective_price,
            available: v.available,
            image: p.media[0]?.image_url ?? null,
          });
          options.push({
            value: v.id,
            label: `${pickName(p, lang)} · ${v.sku}`,
            description: `${formatMoney(Number(p.effective_price))} — ${v.available} dona`,
            disabled: v.available <= 0,
          });
        });
    });
    return { info, options };
  }, [products, lang]);
}

/** Small preview row for one chosen component (image + name + qty). */
function ComponentRow({
  image,
  name,
  sub,
  quantity,
  onQty,
  onRemove,
}: {
  image: string | null;
  name: string;
  sub: string;
  quantity: number;
  onQty?: (q: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Layers className="h-4 w-4 text-muted" strokeWidth={1.5} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{name}</p>
        <p className="truncate text-2xs text-muted">{sub}</p>
      </div>
      {onQty ? (
        <div className="w-24">
          <NumberInput size="sm" min={1} value={quantity} onChange={(v) => onQty(v === '' ? 1 : v)} suffix="×" />
        </div>
      ) : (
        <span className="tnum text-xs text-muted">{quantity}×</span>
      )}
      <button type="button" aria-label="O'chirish" onClick={onRemove} className="rounded p-1.5 text-muted hover:text-danger">
        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** Variant picker + "add" — shared by create (staged) and edit (live) flows. */
function AddComponent({
  options,
  onAdd,
  loading,
}: {
  options: Array<{ value: string; label: string; description: string; disabled?: boolean }>;
  onAdd: (variantId: string) => void;
  loading?: boolean;
}) {
  const [pick, setPick] = useState('');
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Combobox
          label="Mahsulot varianti qo'shish"
          placeholder="Variant tanlang (turli kategoriyalardan)"
          options={options}
          value={pick}
          onChange={setPick}
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        loading={loading}
        disabled={!pick}
        onClick={() => {
          if (!pick) return;
          onAdd(pick);
          setPick('');
        }}
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} /> Qo'shish
      </Button>
    </div>
  );
}

/** Combo image gallery: thumbnails + upload. (Combo images have no id in the
 *  API response, so they are add-only here.) */
function ComboImages({
  images,
  uploading,
  onUpload,
}: {
  images: string[];
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">Combo rasmlari</p>
      <div className="flex flex-wrap items-center gap-2">
        {images.map((src, i) => (
          <span key={src + i} className="h-14 w-14 overflow-hidden rounded-lg border border-border">
            <img src={src} alt="" className="h-full w-full object-cover" />
          </span>
        ))}
        <button
          type="button"
          aria-label="Rasm qo'shish yoki tashlang"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); onUpload(e.dataTransfer.files); }}
          disabled={uploading}
          className={`flex h-14 w-14 items-center justify-center rounded-lg border border-dashed transition-colors disabled:opacity-50 ${
            over ? 'border-accent bg-accent-soft text-accent-ink' : 'border-border text-muted hover:border-accent hover:text-accent-ink'
          }`}
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <input ref={inputRef} type="file" accept={UPLOAD_ACCEPT} multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
      </div>
    </div>
  );
}

interface Scalars {
  name_uz: string;
  name_ru: string;
  description_uz: string;
  base: number | '';
  disc: number | '';
  status: ProductStatus;
}

function ScalarFields({ v, set }: { v: Scalars; set: (p: Partial<Scalars>) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nomi (uz)" value={v.name_uz} onChange={(e) => set({ name_uz: e.target.value })} />
        <Input label="Nomi (ru)" placeholder="Название" value={v.name_ru} onChange={(e) => set({ name_ru: e.target.value })} />
      </div>
      <Textarea label="Tavsif (uz)" value={v.description_uz} onChange={(e) => set({ description_uz: e.target.value })} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <NumberInput label="Narx *" suffix="so'm" thousands step={50_000} min={0} value={v.base} onChange={(base) => set({ base })} />
        <NumberInput label="Chegirma narxi" suffix="so'm" thousands step={50_000} min={0} value={v.disc} onChange={(disc) => set({ disc })} placeholder="—" />
        <Select label="Holat" options={statusOptions} value={v.status} onChange={(s) => set({ status: s as ProductStatus })} />
      </div>
    </>
  );
}

/** Edit an existing combo — scalar patch + live item/image mutations. */
function EditCombo({ comboId, onDone }: { comboId: string; onDone: () => void }) {
  const query = useCombo(comboId);
  const products = useProducts();
  const { options } = useVariantCatalog(products.data);
  const update = useUpdateCombo();
  const addItem = useAddComboItem();
  const delItem = useDeleteComboItem();
  const addImage = useAddComboImage();
  const [uploading, setUploading] = useState(false);

  const combo = query.data;
  const [v, setV] = useState<Scalars | null>(null);
  // seed the scalar draft once the combo loads
  const seeded = useRef(false);
  if (combo && !seeded.current) {
    seeded.current = true;
    setV({
      name_uz: combo.name_uz,
      name_ru: combo.name_ru ?? '',
      description_uz: combo.description_uz ?? '',
      base: combo.old_price ? Number(combo.old_price) : Number(combo.price),
      disc: combo.old_price ? Number(combo.price) : '',
      status: combo.status,
    });
  }

  if (query.isPending || !combo || !v) return <SkeletonRows rows={4} />;

  const save = () =>
    update.mutate(
      {
        id: comboId,
        body: {
          name_uz: v.name_uz.trim(),
          name_ru: v.name_ru.trim() || null,
          description_uz: v.description_uz.trim() || null,
          price: v.base === '' ? 0 : v.base,
          discount_price: v.disc === '' ? null : v.disc,
          status: v.status,
        },
      },
      {
        onSuccess: () => { toast.success('Saqlandi'); onDone(); },
        onError: (e) => toast.error((e as unknown as ApiError).message || 'Xatolik'),
      },
    );

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const up = await uploadFile(file);
        await addImage.mutateAsync({ id: comboId, image_url: up.url });
      }
    } catch {
      toast.error('Rasm yuklashda xatolik');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <ScalarFields v={v} set={(p) => setV({ ...v, ...p })} />

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Tarkibi ({combo.items.length})</p>
        {combo.items.map((it) => (
          <ComponentRow
            key={it.combo_item_id}
            image={it.image_url}
            name={it.name_uz}
            sub={`${formatMoney(Number(it.price))} · ${it.available} dona mavjud`}
            quantity={it.quantity}
            onRemove={() => delItem.mutate(it.combo_item_id, { onError: () => toast.error("O'chirishda xatolik") })}
          />
        ))}
        <AddComponent
          options={options}
          loading={addItem.isPending}
          onAdd={(variant_id) =>
            addItem.mutate(
              { id: comboId, body: { variant_id, quantity: 1 } },
              { onError: (e) => toast.error((e as unknown as ApiError).message || "Qo'shishda xatolik") },
            )
          }
        />
      </div>

      <ComboImages images={combo.images} uploading={uploading} onUpload={onUpload} />

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onDone}>Bekor qilish</Button>
        <Button onClick={save} loading={update.isPending} disabled={v.name_uz.trim().length < 1}>Saqlash</Button>
      </div>
    </div>
  );
}

/** Create a new combo — everything staged, then one create (+ image upload). */
function CreateCombo({ onDone }: { onDone: () => void }) {
  const products = useProducts();
  const { info, options } = useVariantCatalog(products.data);
  const create = useCreateCombo();
  const addImage = useAddComboImage();
  const [busy, setBusy] = useState(false);

  const [v, setV] = useState<Scalars>({ name_uz: '', name_ru: '', description_uz: '', base: '', disc: '', status: 'active' });
  const [items, setItems] = useState<Array<{ variant_id: string; quantity: number }>>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const up = await uploadFile(file);
        setImages((s) => [...s, up.url]);
      }
    } catch {
      toast.error('Rasm yuklashda xatolik');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const combo = await create.mutateAsync({
        name_uz: v.name_uz.trim(),
        name_ru: v.name_ru.trim() || null,
        description_uz: v.description_uz.trim() || null,
        price: v.base === '' ? 0 : v.base,
        discount_price: v.disc === '' ? null : v.disc,
        status: v.status,
        items: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
      });
      for (const src of images) await addImage.mutateAsync({ id: combo.id, image_url: src });
      toast.success("To'plam yaratildi");
      onDone();
    } catch (e) {
      toast.error((e as unknown as ApiError).message || 'Yaratishda xatolik');
    } finally {
      setBusy(false);
    }
  };

  const canSave = v.name_uz.trim().length > 0 && v.base !== '' && items.length > 0;

  return (
    <div className="space-y-4">
      <ScalarFields v={v} set={(p) => setV({ ...v, ...p })} />

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Tarkibi ({items.length})</p>
        {items.map((it, idx) => {
          const meta = info.get(it.variant_id);
          return (
            <ComponentRow
              key={it.variant_id + idx}
              image={meta?.image ?? null}
              name={meta?.name ?? it.variant_id}
              sub={meta ? `${formatMoney(Number(meta.price))} · ${meta.available} dona mavjud` : ''}
              quantity={it.quantity}
              onQty={(q) => setItems((s) => s.map((x, i) => (i === idx ? { ...x, quantity: q } : x)))}
              onRemove={() => setItems((s) => s.filter((_, i) => i !== idx))}
            />
          );
        })}
        {items.length === 0 && <p className="text-xs text-muted">Kamida bitta mahsulot qo'shing.</p>}
        <AddComponent
          options={options.filter((o) => !items.some((i) => i.variant_id === o.value))}
          onAdd={(variant_id) => setItems((s) => [...s, { variant_id, quantity: 1 }])}
        />
      </div>

      <ComboImages images={images} uploading={uploading} onUpload={onUpload} />

      {items.length > 0 && v.base !== '' && (
        <p className="text-sm text-muted">
          To'plam narxi:{' '}
          <span className="tnum font-semibold text-accent-ink">
            <Money value={v.disc === '' ? v.base : v.disc} />
          </span>
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onDone}>Bekor qilish</Button>
        <Button onClick={submit} loading={busy || create.isPending} disabled={!canSave}>To'plam yaratish</Button>
      </div>
    </div>
  );
}

export function ComboForm({ combo, onDone }: { combo?: ComboOut; onDone: () => void }) {
  return combo ? <EditCombo comboId={combo.id} onDone={onDone} /> : <CreateCombo onDone={onDone} />;
}
