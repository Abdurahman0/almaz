import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import {
  Button,
  Checkbox,
  Input,
  NumberInput,
  Select,
  Textarea,
  toast,
  type SelectOption,
} from '@/shared/ui';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import { useEngravingMaxChars, useEngravingPrice } from '@/features/settings/hooks';
import { InstagramSection } from './InstagramSection';
import { ProductImages } from './ProductImages';
import {
  useAddProductMedia,
  useAddVariant,
  useAdjustStock,
  useCategories,
  useCreateProduct,
  useDeleteMedia,
  useRefs,
  useUpdateProduct,
} from '../hooks';
import type { MediaOut, ProductCreate, ProductOut } from '@/shared/api/types';
import type { ApiError } from '@/shared/api/client';

// Numeric fields carry `number | ''` (empty NumberInput) so input === output type.
const numField = z.union([z.number(), z.literal('')]);

const schema = z
  .object({
    name_uz: z.string().min(2, 'Nomi (uz) kamida 2 ta belgi'),
    name_ru: z.string().optional(),
    description_uz: z.string().optional(),
    description_ru: z.string().optional(),
    category_id: z.string().optional(),
    gender_id: z.string().optional(),
    material_id: z.string().optional(),
    stone_id: z.string().optional(),
    price: numField,
    discount_price: numField,
    stock_qty: numField,
    low_stock_threshold: numField,
    engraving_price: numField,
    engraving_max_chars: numField,
    status: z.enum(['draft', 'active', 'archived']),
    engraving_available: z.boolean(),
    ai_keywords: z.array(z.string()),
    // variant fields (create only)
    sku: z.string().optional(),
    barcode: z.string().optional(),
    fulfillment_type: z.enum(['stocked', 'made_to_order', 'unique']),
  })
  .superRefine((v, ctx) => {
    // price is mandatory (server 422s without it)
    if (v.price === '' || !(v.price > 0)) {
      ctx.addIssue({ path: ['price'], code: z.ZodIssueCode.custom, message: 'Narx majburiy' });
    }
    // stock: 0 allowed (out of stock), but must be a whole, non-negative number
    if (v.stock_qty !== '' && (!Number.isInteger(v.stock_qty) || v.stock_qty < 0)) {
      ctx.addIssue({
        path: ['stock_qty'],
        code: z.ZodIssueCode.custom,
        message: "Butun, manfiy bo'lmagan son",
      });
    }
    // engraving limit: product level requires ≥1 (backend rejects 0). "Unlimited"
    // is a GLOBAL concept — leave blank and set the global to 0 in Settings.
    if (v.engraving_max_chars !== '' && (!Number.isInteger(v.engraving_max_chars) || v.engraving_max_chars < 1)) {
      ctx.addIssue({
        path: ['engraving_max_chars'],
        code: z.ZodIssueCode.custom,
        message: 'Kamida 1 (cheksiz — Sozlamalarда global 0)',
      });
    }
    for (const key of ['discount_price', 'low_stock_threshold', 'engraving_price'] as const) {
      const x = v[key];
      if (x !== '' && !(x > 0)) {
        ctx.addIssue({ path: [key], code: z.ZodIssueCode.custom, message: "Musbat qiymat bo'lishi kerak" });
      }
    }
    if (v.price !== '' && v.discount_price !== '' && v.discount_price > v.price) {
      ctx.addIssue({
        path: ['discount_price'],
        code: z.ZodIssueCode.custom,
        message: "Chegirma narxi asosiy narxdan katta bo'lmasin",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const statusOptions: SelectOption[] = [
  { value: 'active', label: 'Faol' },
  { value: 'draft', label: 'Qoralama' },
  { value: 'archived', label: 'Arxiv' },
];

const fulfillmentOptions: SelectOption[] = [
  { value: 'stocked', label: 'Zaxiradan (stocked)' },
  { value: 'made_to_order', label: 'Buyurtmaga (made-to-order)' },
  { value: 'unique', label: 'Yakka (unique)' },
];

const toOpts = (
  list: Array<{ id: string; name_uz: string; name_ru: string | null }> | undefined,
  lang: 'uz' | 'ru',
): SelectOption[] => (list ?? []).map((r) => ({ value: r.id, label: pickName(r, lang) }));

const reorder = <T,>(arr: T[], from: number, to: number): T[] => {
  const a = [...arr];
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
};

/** Optional reference dropdown that shows name_uz, submits the UUID, and can be
 *  cleared back to "no selection". */
function RefField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Select label={label} placeholder="—" options={options} value={value || ''} onChange={onChange} />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="mt-1 text-2xs text-muted underline-offset-2 hover:text-danger hover:underline"
        >
          Tozalash
        </button>
      ) : null}
    </div>
  );
}

/** Free-form keyword tags for AI search (ai_keywords). Enter or comma adds. */
function TagInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim().replace(/,$/, '');
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--r-sm)] border border-border bg-surface-2 p-2">
        {value.map((t, i) => (
          <span key={t + i} className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-text">
            {t}
            <button type="button" aria-label="O'chirish" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <X className="h-3 w-3 text-muted hover:text-danger" strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[140px] flex-1 bg-transparent px-1 text-sm text-text outline-none placeholder:text-muted"
        />
      </div>
    </div>
  );
}

interface ProductFormProps {
  product?: ProductOut;
  onDone: () => void;
}

export function ProductForm({ product, onDone }: ProductFormProps) {
  const lang = useUiStore((s) => s.lang);
  const globalEngravingMax = useEngravingMaxChars();
  const globalEngravingPrice = useEngravingPrice();
  const categories = useCategories();
  const genders = useRefs('genders', true);
  const materials = useRefs('materials', true);
  const stones = useRefs('stones', true);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const adjustStock = useAdjustStock();
  const addVariant = useAddVariant();
  const addMedia = useAddProductMedia();
  const deleteMedia = useDeleteMedia();

  // The app keeps one stocked variant per product; that's what the qty edits.
  const stockedVariant =
    product?.variants.find((vr) => vr.fulfillment_type === 'stocked') ?? product?.variants[0];
  const initialStock = stockedVariant?.stock_qty ?? '';

  // Create: staged image URLs → submitted as image_urls. Edit: live media list
  // (add/remove hit the media endpoints immediately).
  const [newUrls, setNewUrls] = useState<string[]>([]);
  const [mediaList, setMediaList] = useState<MediaOut[]>(product?.media ?? []);
  const [imgError, setImgError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name_uz: product.name_uz,
          name_ru: product.name_ru ?? '',
          description_uz: product.description_uz ?? '',
          description_ru: product.description_ru ?? '',
          category_id: product.category_id ?? '',
          gender_id: product.gender_id ?? '',
          material_id: product.material_id ?? '',
          stone_id: product.stone_id ?? '',
          price: product.price != null ? Number(product.price) : '',
          discount_price: product.discount_price != null ? Number(product.discount_price) : '',
          stock_qty: initialStock,
          low_stock_threshold: product.low_stock_threshold != null ? Number(product.low_stock_threshold) : '',
          engraving_price: product.engraving_price != null ? Number(product.engraving_price) : '',
          engraving_max_chars: product.engraving_max_chars != null ? product.engraving_max_chars : '',
          status: product.status,
          engraving_available: product.engraving_available ?? false,
          ai_keywords: product.ai_keywords ?? [],
          sku: stockedVariant?.sku ?? '',
          barcode: '',
          fulfillment_type: stockedVariant?.fulfillment_type ?? 'stocked',
        }
      : {
          name_uz: '',
          name_ru: '',
          category_id: '',
          gender_id: '',
          material_id: '',
          stone_id: '',
          price: '',
          discount_price: '',
          stock_qty: 1,
          low_stock_threshold: '',
          engraving_price: '',
          engraving_max_chars: '',
          status: 'active',
          engraving_available: false,
          ai_keywords: [],
          sku: '',
          barcode: '',
          fulfillment_type: 'stocked',
        },
  });

  // Reset transient state when the form switches to a different product.
  useEffect(() => {
    setMediaList(product?.media ?? []);
    setNewUrls([]);
    setImgError(false);
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const engravingOn = form.watch('engraving_available');

  // Map an API error onto the form: 422 field array -> field errors, 403/401 ->
  // a permission/session message, semantic 400s -> the right field.
  const handleApiError = (err: ApiError) => {
    if (err.status === 403) {
      setFormError("Ruxsat yo'q — mahsulot yaratish uchun 'products:create' huquqi kerak.");
      return;
    }
    if (err.status === 401) {
      setFormError('Sessiya tugagan — tizimga qaytadan kiring.');
      return;
    }
    const known = new Set([
      'name_uz', 'name_ru', 'price', 'discount_price', 'description_uz', 'description_ru',
      'category_id', 'gender_id', 'material_id', 'stone_id', 'engraving_price',
      'low_stock_threshold', 'status', 'stock_qty',
    ]);
    let mapped = false;
    if (err.fields) {
      for (const [k, msg] of Object.entries(err.fields)) {
        if (known.has(k)) {
          form.setError(k as keyof FormValues, { message: msg });
          mapped = true;
        } else if (k === 'image_urls' || k === 'media') {
          setImgError(true);
          mapped = true;
        }
      }
    }
    // Semantic 400s from the doc's error table.
    if (/rasm/i.test(err.message)) {
      setImgError(true);
      mapped = true;
    }
    if (/chegirma/i.test(err.message)) {
      form.setError('discount_price', { message: err.message });
      mapped = true;
    }
    setFormError(mapped ? null : err.message);
  };

  const submit = form.handleSubmit((v) => {
    setFormError(null);
    const toNum = (x: number | '') => (x === '' ? null : x);
    const body: ProductCreate = {
      name_uz: v.name_uz,
      name_ru: v.name_ru?.trim() ? v.name_ru.trim() : null,
      description_uz: v.description_uz?.trim() ? v.description_uz.trim() : null,
      description_ru: v.description_ru?.trim() ? v.description_ru.trim() : null,
      category_id: v.category_id || null,
      gender_id: v.gender_id || null,
      material_id: v.material_id || null,
      stone_id: v.stone_id || null,
      price: v.price === '' ? 0 : v.price, // guarded required by zod
      discount_price: toNum(v.discount_price),
      low_stock_threshold: toNum(v.low_stock_threshold),
      engraving_available: v.engraving_available || false,
      engraving_price: v.engraving_available ? toNum(v.engraving_price) : null,
      engraving_max_chars: v.engraving_available ? toNum(v.engraving_max_chars) : null,
      status: v.status,
      ai_keywords: v.ai_keywords.length ? v.ai_keywords : null,
    };
    const done = () => {
      toast.success(product ? 'Mahsulot yangilandi' : "Mahsulot qo'shildi");
      onDone();
    };
    if (product) {
      // ProductUpdate can't carry variants; sync stock via the dedicated stock
      // endpoint after the product itself is saved — but only when it changed.
      updateProduct.mutate(
        { id: product.id, body },
        {
          onError: (e) => handleApiError(e as unknown as ApiError),
          onSuccess: () => {
            const target = v.stock_qty === '' ? null : v.stock_qty;
            if (target == null || target === initialStock) return done();
            const onErr = () => toast.error('Miqdorni saqlashda xatolik');
            if (stockedVariant) {
              adjustStock.mutate(
                { variantId: stockedVariant.id, body: { stock_qty: target } },
                { onSuccess: done, onError: onErr },
              );
            } else {
              addVariant.mutate(
                { productId: product.id, body: { fulfillment_type: 'stocked', stock_qty: target, is_active: true } },
                { onSuccess: done, onError: onErr },
              );
            }
          },
        },
      );
    } else {
      // Server requires ≥1 image on create; block early with a clear message.
      if (newUrls.length === 0) {
        setImgError(true);
        toast.error('Mahsulot uchun kamida bitta rasm majburiy');
        return;
      }
      createProduct.mutate(
        {
          ...body,
          image_urls: newUrls,
          // Stock lives on the variant — ALWAYS send one (omitting => 0 stock).
          // Ring size is NOT a variant; this is the single stocked variant.
          variants: [
            {
              fulfillment_type: v.fulfillment_type,
              stock_qty: v.stock_qty === '' ? 0 : v.stock_qty,
              is_active: true,
              ...(v.sku?.trim() ? { sku: v.sku.trim() } : {}),
              ...(v.barcode?.trim() ? { barcode: v.barcode.trim() } : {}),
            },
          ],
        },
        { onSuccess: done, onError: (e) => handleApiError(e as unknown as ApiError) },
      );
    }
  });

  // ---- image handlers (create staged vs edit live) ----
  const createUploaded = (url: string) => {
    setNewUrls((s) => [...s, url]);
    setImgError(false);
  };
  const editUploaded = (url: string) => {
    addMedia.mutate(
      { productId: product!.id, body: { image_url: url } },
      {
        onSuccess: (m) => setMediaList((l) => [...l, m]),
        onError: () => toast.error("Rasm qo'shishda xatolik"),
      },
    );
  };
  const editRemove = (index: number) => {
    const m = mediaList[index];
    if (!m) return;
    setMediaList((l) => l.filter((_, j) => j !== index));
    deleteMedia.mutate(m.id, { onError: () => toast.error("O'chirishda xatolik") });
  };

  const genderOpts = useMemo(() => toOpts(genders.data, lang), [genders.data, lang]);
  const materialOpts = useMemo(() => toOpts(materials.data, lang), [materials.data, lang]);
  const stoneOpts = useMemo(() => toOpts(stones.data, lang), [stones.data, lang]);
  const categoryOpts = useMemo(() => toOpts(categories.data, lang), [categories.data, lang]);

  const busy = createProduct.isPending || updateProduct.isPending || adjustStock.isPending || addVariant.isPending;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* Names — uz + ru */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nomi (uz)" error={form.formState.errors.name_uz?.message} {...form.register('name_uz')} />
        <Input label="Nomi (ru)" placeholder="Название" {...form.register('name_ru')} />
      </div>

      {/* Reference dropdowns — all optional & clearable */}
      <div className="grid grid-cols-2 gap-4">
        <Controller control={form.control} name="category_id" render={({ field }) => (
          <RefField label="Kategoriya" options={categoryOpts} value={field.value ?? ''} onChange={field.onChange} />
        )} />
        <Controller control={form.control} name="gender_id" render={({ field }) => (
          <RefField label="Kim uchun" options={genderOpts} value={field.value ?? ''} onChange={field.onChange} />
        )} />
        <Controller control={form.control} name="material_id" render={({ field }) => (
          <RefField label="Material" options={materialOpts} value={field.value ?? ''} onChange={field.onChange} />
        )} />
        <Controller control={form.control} name="stone_id" render={({ field }) => (
          <RefField label="Tosh turi" options={stoneOpts} value={field.value ?? ''} onChange={field.onChange} />
        )} />
      </div>

      {/* Prices: base (required) + discount */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="price"
          render={({ field, fieldState }) => (
            <NumberInput label="Asosiy narx *" value={field.value} onChange={field.onChange} min={0} step={100_000} suffix="so'm" thousands placeholder="400 000" error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={form.control}
          name="discount_price"
          render={({ field, fieldState }) => (
            <NumberInput label="Chegirmali narx (mijoz to'laydi)" value={field.value} onChange={field.onChange} min={0} step={100_000} suffix="so'm" thousands placeholder="Chegirma yo'q" error={fieldState.error?.message} />
          )}
        />
      </div>

      {/* Stock on hand + low-stock alert threshold */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="stock_qty"
          render={({ field, fieldState }) => (
            <NumberInput label="Ombordagi miqdor (dona)" value={field.value} onChange={field.onChange} min={0} step={1} suffix="dona" placeholder="0" error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={form.control}
          name="low_stock_threshold"
          render={({ field, fieldState }) => (
            <NumberInput label="Kam qolgan chegarasi (bo'sh — global)" value={field.value} onChange={field.onChange} min={0} step={1} suffix="dona" placeholder="Global" error={fieldState.error?.message} />
          )}
        />
      </div>
      {stockedVariant && stockedVariant.reserved_qty > 0 && (
        <p className="-mt-2 text-2xs text-muted">
          {stockedVariant.reserved_qty} dona buyurtmalarda band. Ombordagi miqdor — umumiy son (band bilan birga).
        </p>
      )}

      {/* Descriptions — uz + ru */}
      <div className="grid grid-cols-2 gap-4">
        <Textarea label="Tavsif (uz)" {...form.register('description_uz')} />
        <Textarea label="Tavsif (ru)" {...form.register('description_ru')} />
      </div>

      {/* AI search keywords */}
      <Controller
        control={form.control}
        name="ai_keywords"
        render={({ field }) => (
          <TagInput label="AI kalit so'zlari (qidiruv uchun)" value={field.value} onChange={field.onChange} placeholder="so'z yozing, Enter bosing" />
        )}
      />

      {/* Images — ≥1 required on create; edit adds/removes live via media API */}
      {product ? (
        <ProductImages
          urls={mediaList.map((m) => m.image_url || '')}
          onUploaded={editUploaded}
          onRemove={editRemove}
          error={imgError}
        />
      ) : (
        <ProductImages
          urls={newUrls}
          onUploaded={createUploaded}
          onRemove={(i) => setNewUrls((s) => s.filter((_, j) => j !== i))}
          onReorder={(from, to) => setNewUrls((s) => reorder(s, from, to))}
          error={imgError}
          required
        />
      )}

      {/* Variant details — create only (PATCH can't change variants). */}
      {!product ? (
        <details className="rounded-[var(--r-sm)] border border-border px-4 py-2.5">
          <summary className="cursor-pointer select-none text-xs font-medium text-muted">
            Variant tafsilotlari (ixtiyoriy: SKU, shtrix-kod, tur)
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Input label="SKU (bo'sh — avtomatik)" placeholder="MALIKA-001" {...form.register('sku')} />
            <Input label="Shtrix-kod" placeholder="—" {...form.register('barcode')} />
            <Controller control={form.control} name="fulfillment_type" render={({ field }) => (
              <Select label="Ta'minot turi" options={fulfillmentOptions} value={field.value} onChange={field.onChange} />
            )} />
          </div>
        </details>
      ) : (
        stockedVariant && (
          <p className="text-2xs text-muted">
            SKU: <span className="font-mono text-text">{stockedVariant.sku}</span> — zaxira «Zaxira» oynasidan yoki yuqoridagi maydondan o'zgaradi.
          </p>
        )
      )}

      {/* Status + engraving */}
      <div className="grid grid-cols-2 items-end gap-4">
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select label="Holat (sotuvda ko'rinishi uchun «Faol»)" options={statusOptions} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="engraving_available"
          render={({ field }) => (
            <div className="pb-2.5">
              <Checkbox checked={Boolean(field.value)} onCheckedChange={field.onChange} label="Gravirovka (ism yozish) mavjud" />
            </div>
          )}
        />
      </div>
      {engravingOn && (
        <div className="space-y-2 rounded-[var(--r-sm)] border border-border bg-surface-2/40 p-3">
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="engraving_price"
              render={({ field, fieldState }) => (
                <NumberInput label="Gravirovka narxi (bo'sh — global)" value={field.value} onChange={field.onChange} min={0} step={10_000} suffix="so'm" thousands placeholder={`Global (${globalEngravingPrice.toLocaleString('ru-RU')})`} error={fieldState.error?.message} />
              )}
            />
            <Controller
              control={form.control}
              name="engraving_max_chars"
              render={({ field, fieldState }) => (
                <NumberInput label="Maks. belgi soni" value={field.value} onChange={field.onChange} min={1} step={1} suffix="belgi" placeholder={`Global (${globalEngravingMax})`} error={fieldState.error?.message} />
              )}
            />
          </div>
          <p className="text-2xs text-muted">
            Bu uzukka sig'adigan maksimal belgi soni (kamida 1). Bo'sh qoldirilsa global qiymat ({globalEngravingMax}) ishlatiladi. Cheksiz — Sozlamalarда global qiymatni 0 qiling.
          </p>
        </div>
      )}

      {/* Instagram links attach to an existing product (need its id). */}
      {product && <InstagramSection productId={product.id} />}

      {formError && (
        <p className="rounded-[var(--r-sm)] border border-danger-soft bg-danger-soft px-4 py-2.5 text-sm text-danger">{formError}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" loading={busy}>
          Saqlash
        </Button>
      </div>
    </form>
  );
}
