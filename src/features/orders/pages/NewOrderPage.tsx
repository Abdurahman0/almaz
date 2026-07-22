import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, Combobox, ErrorCard, Money, NumberInput, PageHeader, SkeletonRows } from '@/shared/ui';
import { formatMoney } from '@/shared/lib/format';
import { useCreateOrder } from '../hooks';
import { RingSizeCone, RING_SIZES } from '../components/RingSizeCone';
import { useCustomers } from '@/features/inbox/hooks';
import { useProducts } from '@/features/products/hooks';
import type { ApiError } from '@/shared/api/client';

const schema = z.object({
  customer_id: z.string().uuid('Mijozni tanlang'),
  variant_id: z.string().uuid('Mahsulot variantini tanlang'),
  quantity: z.number({ invalid_type_error: 'Miqdor kiritilishi shart' }).int().min(1, 'Kamida 1 dona'),
  ring_size: z.number().min(15).max(22),
});
type FormValues = z.infer<typeof schema>;

const steps = ['Mijoz', 'Mahsulot', "O'lcham", 'Tasdiqlash'] as const;

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const customers = useCustomers();
  const products = useProducts();
  const createOrder = useCreateOrder();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, ring_size: 17 },
    mode: 'onChange',
  });
  const values = form.watch();

  const fieldsPerStep: Array<Array<keyof FormValues>> = [
    ['customer_id'],
    ['variant_id', 'quantity'],
    ['ring_size'],
    [],
  ];

  const next = async () => {
    const ok = await form.trigger(fieldsPerStep[step]);
    if (ok) setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const submit = form.handleSubmit((v) => {
    createOrder.mutate(
      {
        customer_id: v.customer_id,
        items: [{ variant_id: v.variant_id, quantity: v.quantity, ring_size: v.ring_size.toFixed(1) }],
      },
      { onSuccess: (order) => navigate(`/orders/${order.id}`) },
    );
  });

  const selectedProduct = products.data?.find((p) =>
    p.variants.some((vr) => vr.id === values.variant_id),
  );
  const selectedCustomer = customers.data?.find((c) => c.id === values.customer_id);

  return (
    <div>
      <PageHeader
        heading="Yangi buyurtma"
        subheading="To'rt qadamda — eskizdan sovg'agacha"
        actions={
          <Button variant="ghost" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Orqaga
          </Button>
        }
      />

      <ol className="mb-8 flex max-w-xl gap-2" aria-label="Qadamlar">
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${
                i < step
                  ? 'border-accent bg-accent text-on-accent'
                  : i === step
                    ? 'border-accent text-accent-ink'
                    : 'border-border text-muted'
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-xs ${i === step ? 'text-accent-ink' : 'text-muted'}`}>{label}</span>
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        {step === 0 &&
          (customers.isPending ? (
            <SkeletonRows rows={3} />
          ) : customers.isError ? (
            <ErrorCard error={customers.error} onRetry={() => customers.refetch()} />
          ) : (
            <Controller
              control={form.control}
              name="customer_id"
              render={({ field, fieldState }) => (
                <Combobox
                  label="Mijoz"
                  placeholder="Mijozni tanlang"
                  options={customers.data.map((c) => ({
                    value: c.id,
                    label: c.full_name ?? c.username ?? c.external_id,
                    description: c.channel === 'telegram' ? 'Telegram' : 'Instagram',
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          ))}

        {step === 1 &&
          (products.isPending ? (
            <SkeletonRows rows={3} />
          ) : products.isError ? (
            <ErrorCard error={products.error} onRetry={() => products.refetch()} />
          ) : (
            <div className="space-y-4">
              <Controller
                control={form.control}
                name="variant_id"
                render={({ field, fieldState }) => (
                  <Combobox
                    label="Mahsulot varianti"
                    placeholder="Variantni tanlang"
                    options={products.data.flatMap((p) =>
                      p.variants
                        .filter((vr) => vr.is_active)
                        .map((vr) => ({
                          value: vr.id,
                          label: `${p.name} · ${vr.sku}`,
                          description: `${formatMoney(p.price)} — ${vr.available} dona mavjud`,
                          disabled: vr.available <= 0,
                        })),
                    )}
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="quantity"
                render={({ field, fieldState }) => (
                  <NumberInput
                    label="Miqdor"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    min={1}
                    suffix="dona"
                    error={fieldState.error?.message}
                  />
                )}
              />
            </div>
          ))}

        {step === 2 && (
          <RingSizeCone
            value={RING_SIZES.includes(values.ring_size) ? values.ring_size : 17}
            onChange={(size) => form.setValue('ring_size', size, { shouldValidate: true })}
          />
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <p className="text-muted">
              Ma'lumotlarni o'ngdagi xulosada tekshiring va buyurtmani tasdiqlang.
            </p>
            {createOrder.isError && (
              <p className="rounded-lg border border-danger-soft bg-danger-soft px-4 py-2.5 text-danger">
                {(createOrder.error as unknown as ApiError).message}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Orqaga
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={next}>Keyingi</Button>
          ) : (
            <Button loading={createOrder.isPending} onClick={submit}>
              Buyurtma yaratish
            </Button>
          )}
        </div>
      </Card>

      <Card className="h-fit">
        <h2 className="mb-4 text-md font-semibold text-text">Xulosa</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted">Mijoz</dt>
            <dd className="text-right text-text">
              {selectedCustomer?.full_name ?? selectedCustomer?.username ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted">Mahsulot</dt>
            <dd className="text-right text-text">{selectedProduct?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted">Miqdor</dt>
            <dd className="text-text">{values.quantity || 1} dona</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted">O'lcham</dt>
            <dd className="text-text">{values.ring_size.toFixed(1)}</dd>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <dt className="text-muted">Taxminiy summa</dt>
            <dd className="text-md tnum text-accent-ink">
              {selectedProduct ? (
                <Money value={Number(selectedProduct.price) * (values.quantity || 1)} />
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </Card>
      </div>
    </div>
  );
}
