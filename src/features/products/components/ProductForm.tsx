import { useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wand2 } from 'lucide-react';
import { Button, Input, NumberInput, Select, Textarea, toast } from '@/shared/ui';
import { formatMoney } from '@/shared/lib/format';
import { useGoldRates } from '@/features/settings/hooks';
import { useCategories, useCreateProduct, useUpdateProduct } from '../hooks';
import type { ProductOut } from '@/shared/api/types';
import type { ApiError } from '@/shared/api/client';

const schema = z.object({
  name: z.string().min(2, 'Nomi kamida 2 ta belgi'),
  category_id: z.string().optional(),
  gender: z.enum(['erkak', 'ayol', 'uniseks']),
  material: z.string().min(1, 'Majburiy maydon'),
  stone: z.string(),
  price: z.number({ invalid_type_error: 'Narx kiritilishi shart' }).positive("Narx musbat bo'lishi kerak"),
  status: z.enum(['draft', 'active', 'archived']),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const genderOptions = [
  { value: 'ayol', label: 'Ayol' },
  { value: 'erkak', label: 'Erkak' },
  { value: 'uniseks', label: 'Uniseks' },
];
const materialOptions = [
  { value: 'Oltin 585', label: 'Oltin 585', group: 'Oltin' },
  { value: 'Oltin 750', label: 'Oltin 750', group: 'Oltin' },
  { value: 'Kumush 925', label: 'Kumush 925', group: 'Boshqa' },
  { value: 'Platina 950', label: 'Platina 950', group: 'Boshqa' },
];
const statusOptions = [
  { value: 'active', label: 'Faol' },
  { value: 'draft', label: 'Qoralama' },
  { value: 'archived', label: 'Arxiv' },
];

interface ProductFormProps {
  product?: ProductOut;
  onDone: () => void;
}

export function ProductForm({ product, onDone }: ProductFormProps) {
  const categories = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { rate585, rate750 } = useGoldRates();
  const [weight, setWeight] = useState<number | ''>('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name: product.name,
          category_id: product.category_id ?? '',
          gender: product.gender,
          material: product.material,
          stone: product.stone,
          price: Number(product.price),
          status: product.status,
          description: product.description ?? '',
        }
      : { gender: 'ayol', material: 'Oltin 585', stone: '', status: 'active' },
  });

  const material = form.watch('material');
  const rate = material.includes('750') ? rate750 : rate585;
  const hint = typeof weight === 'number' && weight > 0 ? Math.round(weight * rate) : null;

  const mutation = product ? updateProduct : createProduct;

  const submit = form.handleSubmit((v) => {
    const body = {
      name: v.name,
      category_id: v.category_id || null,
      gender: v.gender,
      material: v.material,
      stone: v.stone,
      price: v.price,
      status: v.status,
      description: v.description || null,
    };
    const done = () => {
      toast.success(product ? 'Mahsulot yangilandi' : "Mahsulot qo'shildi");
      onDone();
    };
    if (product) {
      updateProduct.mutate({ id: product.id, body }, { onSuccess: done });
    } else {
      createProduct.mutate(
        { ...body, variants: [{ fulfillment_type: 'stocked', stock_qty: 1, is_active: true }] },
        { onSuccess: done },
      );
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label="Nomi" error={form.formState.errors.name?.message} {...form.register('name')} />
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <Select
              label="Kategoriya"
              placeholder="—"
              options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="gender"
          render={({ field }) => (
            <Select label="Kim uchun" options={genderOptions} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="material"
          render={({ field }) => (
            <Select
              label="Material (proba)"
              options={materialOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Input
          label="Tosh turi"
          placeholder="Brilliant, feruza..."
          error={form.formState.errors.stone?.message}
          {...form.register('stone')}
        />
      </div>

      {/* Auto price hint: weight x gold rate from Settings (weight is a local helper, not sent to API) */}
      <div className="rounded-lg border border-border bg-accent-soft p-4">
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <NumberInput
            label="Og'irligi (g) — narx kalkulyatori"
            value={weight}
            onChange={setWeight}
            step={0.1}
            min={0}
            suffix="g"
            placeholder="3.85"
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={hint === null}
            onClick={() => hint !== null && form.setValue('price', hint, { shouldValidate: true })}
          >
            <Wand2 className="h-4 w-4" strokeWidth={1.5} /> Qo'llash
          </Button>
        </div>
        {hint !== null && (
          <p className="mt-2 text-xs text-muted">
            Tavsiya narx: <span className="tnum font-semibold text-accent-ink">{formatMoney(hint)}</span>{' '}
            ({formatMoney(rate)}/g)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="price"
          render={({ field, fieldState }) => (
            <NumberInput
              label="Narx"
              value={field.value ?? ''}
              onChange={field.onChange}
              min={0}
              step={100_000}
              suffix="so'm"
              thousands
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select label="Holat" options={statusOptions} value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
      <Textarea label="Tavsif" {...form.register('description')} />

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
