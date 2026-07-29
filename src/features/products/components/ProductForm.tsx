import { useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Trash2, ImagePlus, Loader2 } from 'lucide-react';
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
import { uploadFile, uploadFiles, UPLOAD_ACCEPT } from '@/shared/api/files';
import { useUiStore } from '@/shared/stores/ui';
import { InstagramSection } from './InstagramSection';
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
    price: numField,
    discount_price: numField,
    stock_qty: numField,
    low_stock_threshold: numField,
    engraving_price: numField,
    status: z.enum(['draft', 'active', 'archived']),
    engraving_available: z.boolean(),
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
  const adjustStock = useAdjustStock();
  const addVariant = useAddVariant();
  const addMedia = useAddProductMedia();
  const deleteMedia = useDeleteMedia();

  // The app keeps one stocked variant per product; that's what the qty edits.
  const stockedVariant =
    product?.variants.find((vr) => vr.fulfillment_type === 'stocked') ?? product?.variants[0];
  const initialStock = stockedVariant?.stock_qty ?? '';

  // Create-mode image URL collector (submitted inline as image_urls).
  const [newUrls, setNewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          price: '',
          discount_price: '',
          stock_qty: 1,
          low_stock_threshold: '',
          engraving_price: '',
          status: 'active',
          engraving_available: false,
        },
  });

  const engravingOn = form.watch('engraving_available');
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
      price: v.price === '' ? 0 : v.price, // guarded required by zod
      discount_price: toNum(v.discount_price),
      low_stock_threshold: toNum(v.low_stock_threshold),
      engraving_available: v.engraving_available || false,
      engraving_price: v.engraving_available ? toNum(v.engraving_price) : null,
      status: v.status,
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
          variants: [
            { fulfillment_type: 'stocked', stock_qty: v.stock_qty === '' ? 0 : v.stock_qty, is_active: true },
          ],
        },
        { onSuccess: done },
      );
    }
  });

  const attachUrl = (url: string) => {
    if (product) {
      addMedia.mutate(
        { productId: product.id, body: { image_url: url } },
        { onError: () => toast.error("Rasm qo'shishda xatolik") },
      );
    } else {
      setNewUrls((s) => [...s, url]);
      setImgError(false);
    }
  };

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = files.length === 1 ? [await uploadFile(files[0])] : await uploadFiles(Array.from(files));
      uploaded.forEach((u) => attachUrl(u.url));
    } catch {
      toast.error('Yuklashda xatolik');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

      {/* Prices: base (required) + discount */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="price"
          render={({ field, fieldState }) => (
            <NumberInput
              label="Asosiy narx *"
              value={field.value}
              onChange={field.onChange}
              min={0}
              step={100_000}
              suffix="so'm"
              thousands
              placeholder="400 000"
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

      {/* Stock on hand + low-stock alert threshold */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="stock_qty"
          render={({ field, fieldState }) => (
            <NumberInput
              label="Ombordagi miqdor (dona)"
              value={field.value}
              onChange={field.onChange}
              min={0}
              step={1}
              suffix="dona"
              placeholder="0"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="low_stock_threshold"
          render={({ field, fieldState }) => (
            <NumberInput
              label="Kam qolgan chegarasi (bo'sh — global)"
              value={field.value}
              onChange={field.onChange}
              min={0}
              step={1}
              suffix="dona"
              placeholder="Global"
              error={fieldState.error?.message}
            />
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

      {/* Images (≥1 required on create) */}
      <div className="space-y-2">
        <span className={`text-xs font-medium ${imgError ? 'text-danger' : 'text-muted'}`}>
          Rasmlar {!product && <span className="text-danger">*</span>}
        </span>
        {imgError && <p className="text-2xs text-danger">Kamida bitta rasm yuklang</p>}
        {/* Single upload zone — drop a file or click to browse the computer */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); onUpload(e.dataTransfer.files); }}
          disabled={uploading}
          className={`flex w-full flex-col items-center gap-2 rounded-[var(--r-md)] border border-dashed p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-wait ${
            dragOver ? 'border-accent bg-accent-soft' : 'border-strong hover:border-accent'
          } ${uploading ? 'opacity-60' : ''}`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted" strokeWidth={1.5} />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted" strokeWidth={1.5} />
          )}
          <span className="text-sm text-muted">
            {uploading ? 'Yuklanmoqda…' : 'Rasm tashlang yoki tanlash uchun bosing'}
          </span>
          <span className="text-2xs text-muted">JPG · PNG · WEBP</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
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
                label="Gravirovka (ism yozish) mavjud"
              />
            </div>
          )}
        />
      </div>
      {engravingOn && (
        <Controller
          control={form.control}
          name="engraving_price"
          render={({ field, fieldState }) => (
            <NumberInput
              label="Gravirovka narxi (bo'sh — global sozlama)"
              value={field.value}
              onChange={field.onChange}
              min={0}
              step={10_000}
              suffix="so'm"
              thousands
              placeholder="Global (50 000)"
              error={fieldState.error?.message}
            />
          )}
        />
      )}

      {/* Instagram links attach to an existing product (need its id). */}
      {product && <InstagramSection productId={product.id} />}

      {mutation.isError && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {(mutation.error as unknown as ApiError).message}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" loading={mutation.isPending || adjustStock.isPending || addVariant.isPending}>
          Saqlash
        </Button>
      </div>
    </form>
  );
}
