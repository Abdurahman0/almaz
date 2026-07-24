import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wand2, X, Plus, Trash2 } from 'lucide-react';
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
import { formatMoney } from '@/shared/lib/format';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import {
  useAddProductMedia,
  useCategories,
  useCreateProduct,
  useDeleteMedia,
  usePriceCalc,
  useRefs,
  useUpdateProduct,
} from '../hooks';
import type { ProductCreate, ProductOut } from '@/shared/api/types';
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
    weight_grams: numField,
    price: numField,
    discount_price: numField,
    status: z.enum(['draft', 'active', 'archived']),
    engraving_available: z.boolean(),
  })
  .superRefine((v, ctx) => {
    for (const key of ['weight_grams', 'price', 'discount_price'] as const) {
      const x = v[key];
      if (x !== '' && !(x > 0)) {
        ctx.addIssue({ path: [key], code: z.ZodIssueCode.custom, message: "Musbat qiymat bo'lishi kerak" });
      }
    }
    const hasPrice = v.price !== '';
    const canCompute = Boolean(v.category_id) && v.weight_grams !== '';
    if (!hasPrice && !canCompute) {
      ctx.addIssue({
        path: ['price'],
        code: z.ZodIssueCode.custom,
        message: "Narx kiriting yoki kategoriya + og'irlik bering (avtomatik hisoblanadi)",
      });
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

const toOpts = (
  list: Array<{ id: string; name_uz: string; name_ru: string | null }> | undefined,
  lang: 'uz' | 'ru',
): SelectOption[] => (list ?? []).map((r) => ({ value: r.id, label: pickName(r, lang) }));

interface ProductFormProps {
  product?: ProductOut;
  onDone: () => void;
}

export function ProductForm({ product, onDone }: ProductFormProps) {
  const lang = useUiStore((s) => s.lang);
  const categories = useCategories();
  const genders = useRefs('genders', true);
  const materials = useRefs('materials', true);
  const stones = useRefs('stones', true);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const addMedia = useAddProductMedia();
  const deleteMedia = useDeleteMedia();

  // Create-mode image URL collector (submitted inline as image_urls).
  const [newUrls, setNewUrls] = useState<string[]>([]);
  const [urlDraft, setUrlDraft] = useState('');

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
          weight_grams: product.weight_grams != null ? Number(product.weight_grams) : '',
          price: product.price != null ? Number(product.price) : '',
          discount_price: product.discount_price != null ? Number(product.discount_price) : '',
          status: product.status,
          engraving_available: product.engraving_available ?? false,
        }
      : {
          name_uz: '',
          name_ru: '',
          category_id: '',
          gender_id: '',
          material_id: '',
          stone_id: '',
          weight_grams: '',
          price: '',
          discount_price: '',
          status: 'active',
          engraving_available: false,
        },
  });

  const categoryId = form.watch('category_id');
  const weightRaw = form.watch('weight_grams');
  const weight = typeof weightRaw === 'number' ? weightRaw : undefined;
  const priceCalc = usePriceCalc(categoryId || undefined, weight);
  const hint = priceCalc.data ? Math.round(Number(priceCalc.data.price)) : null;

  const mutation = product ? updateProduct : createProduct;

  const submit = form.handleSubmit((v) => {
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
      weight_grams: toNum(v.weight_grams),
      // omit price entirely when blank so the server auto-computes from weight x gram_price
      price: toNum(v.price) ?? undefined,
      discount_price: toNum(v.discount_price),
      status: v.status,
      engraving_available: v.engraving_available || false,
    };
    const done = () => {
      toast.success(product ? 'Mahsulot yangilandi' : "Mahsulot qo'shildi");
      onDone();
    };
    if (product) {
      updateProduct.mutate({ id: product.id, body }, { onSuccess: done });
    } else {
      createProduct.mutate(
        {
          ...body,
          image_urls: newUrls.length ? newUrls : undefined,
          variants: [{ fulfillment_type: 'stocked', stock_qty: 1, is_active: true }],
        },
        { onSuccess: done },
      );
    }
  });

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (product) {
      addMedia.mutate(
        { productId: product.id, body: { image_url: url } },
        { onSuccess: () => setUrlDraft(''), onError: () => toast.error("Rasm qo'shishda xatolik") },
      );
    } else {
      setNewUrls((s) => [...s, url]);
      setUrlDraft('');
    }
  };

  const genderOpts = useMemo(() => toOpts(genders.data, lang), [genders.data, lang]);
  const materialOpts = useMemo(() => toOpts(materials.data, lang), [materials.data, lang]);
  const stoneOpts = useMemo(() => toOpts(stones.data, lang), [stones.data, lang]);
  const categoryOpts = useMemo(() => toOpts(categories.data, lang), [categories.data, lang]);

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* Names — uz + ru */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nomi (uz)" error={form.formState.errors.name_uz?.message} {...form.register('name_uz')} />
        <Input label="Nomi (ru)" placeholder="Название" {...form.register('name_ru')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <Select label="Kategoriya" placeholder="—" options={categoryOpts} value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="gender_id"
          render={({ field }) => (
            <Select label="Kim uchun" placeholder="—" options={genderOpts} value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="material_id"
          render={({ field }) => (
            <Select label="Material" placeholder="—" options={materialOpts} value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="stone_id"
          render={({ field }) => (
            <Select label="Tosh turi" placeholder="—" options={stoneOpts} value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Weight -> price calculator (server-backed preview) */}
      <div className="rounded-lg border border-border bg-accent-soft p-4">
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Controller
            control={form.control}
            name="weight_grams"
            render={({ field }) => (
              <NumberInput
                label="Og'irligi (g)"
                value={field.value}
                onChange={field.onChange}
                step={0.1}
                min={0}
                suffix="g"
                placeholder="3.0"
              />
            )}
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={hint === null}
            onClick={() => hint !== null && form.setValue('price', hint, { shouldValidate: true })}
          >
            <Wand2 className="h-4 w-4" strokeWidth={1.5} /> Narxni qo'llash
          </Button>
        </div>
        {priceCalc.isFetching && <p className="mt-2 text-xs text-muted">Hisoblanmoqda…</p>}
        {hint !== null && (
          <p className="mt-2 text-xs text-muted">
            Hisoblangan narx: <span className="tnum font-semibold text-accent-ink">{formatMoney(hint)}</span>{' '}
            ({formatMoney(Number(priceCalc.data?.gram_price ?? 0))}/g). Narxni bo'sh qoldirsangiz — avtomatik shu narx yoziladi.
          </p>
        )}
      </div>

      {/* Prices: base + discount */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="price"
          render={({ field, fieldState }) => (
            <NumberInput
              label="Asosiy narx"
              value={field.value}
              onChange={field.onChange}
              min={0}
              step={100_000}
              suffix="so'm"
              thousands
              placeholder="Avto"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="discount_price"
          render={({ field, fieldState }) => (
            <NumberInput
              label="Chegirmali narx (mijoz to'laydi)"
              value={field.value}
              onChange={field.onChange}
              min={0}
              step={100_000}
              suffix="so'm"
              thousands
              placeholder="Chegirma yo'q"
              error={fieldState.error?.message}
            />
          )}
        />
      </div>

      {/* Descriptions — uz + ru */}
      <div className="grid grid-cols-2 gap-4">
        <Textarea label="Tavsif (uz)" {...form.register('description_uz')} />
        <Textarea label="Tavsif (ru)" {...form.register('description_ru')} />
      </div>

      {/* Images */}
      <div className="space-y-2">
        <span className="text-2xs font-semibold uppercase tracking-caps text-muted">Rasmlar (URL)</span>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="https://.../uzuk.jpg"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrl();
                }
              }}
            />
          </div>
          <Button type="button" variant="secondary" onClick={addUrl} loading={addMedia.isPending}>
            <Plus className="h-4 w-4" strokeWidth={1.5} /> Qo'shish
          </Button>
        </div>
        {/* create-mode staged URLs */}
        {!product && newUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {newUrls.map((u, i) => (
              <span key={u + i} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted">
                <span className="max-w-[180px] truncate">{u}</span>
                <button type="button" aria-label="O'chirish" onClick={() => setNewUrls((s) => s.filter((_, j) => j !== i))}>
                  <X className="h-3.5 w-3.5 hover:text-danger" strokeWidth={1.5} />
                </button>
              </span>
            ))}
          </div>
        )}
        {/* edit-mode existing media */}
        {product && product.media.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {product.media.map((m) => (
              <span key={m.id} className="flex items-center gap-2 rounded-lg border border-border p-1 pr-2 text-xs">
                {m.image_url && <img src={m.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                <button
                  type="button"
                  aria-label="Rasmni o'chirish"
                  onClick={() => deleteMedia.mutate(m.id, { onError: () => toast.error("O'chirishda xatolik") })}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted hover:text-danger" strokeWidth={1.5} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status + engraving */}
      <div className="grid grid-cols-2 items-end gap-4">
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select label="Holat" options={statusOptions} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="engraving_available"
          render={({ field }) => (
            <div className="pb-2.5">
              <Checkbox
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
                label="Gravirovka mavjud"
              />
            </div>
          )}
        />
      </div>

      {mutation.isError && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {(mutation.error as unknown as ApiError).message}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Saqlash
        </Button>
      </div>
    </form>
  );
}
