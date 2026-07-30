import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, Combobox, ErrorCard, Input, Money, NumberInput, PageHeader, Select, SkeletonRows } from '@/shared/ui';
import { formatMoney } from '@/shared/lib/format';
import { useCreateOrder } from '../hooks';
import { RingSizeCone, RING_SIZES } from '../components/RingSizeCone';
import { useCustomers } from '@/features/inbox/hooks';
import { useBoxes, useCombos, useProducts } from '@/features/products/hooks';
import { useBoxesEnabled, useEngravingMaxChars, useEngravingPrice } from '@/features/settings/hooks';
import { resolveEngravingMax, resolveEngravingPrice } from '@/features/products/lib/engraving';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import type { ApiError } from '@/shared/api/client';

const baseSchema = z.object({
  customer_id: z.string().uuid('Mijozni tanlang'),
  variant_id: z.string().uuid('Mahsulot variantini tanlang'),
  quantity: z.number({ invalid_type_error: 'Miqdor kiritilishi shart' }).int().min(1, 'Kamida 1 dona'),
  ring_size: z.number().min(15).max(22),
  box_id: z.string().optional(),
  engraving_text: z.string().optional(),
});
type FormValues = z.infer<typeof baseSchema>;

const steps = ['Mijoz', 'Mahsulot', "O'lcham", 'Tasdiqlash'] as const;

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const lang = useUiStore((s) => s.lang);
  const customers = useCustomers();
  const products = useProducts();
  const combos = useCombos({ status: 'active', limit: 100 });
  const createOrder = useCreateOrder();
  const globalEngravingMax = useEngravingMaxChars();
  const globalEngravingPrice = useEngravingPrice();

  // The engraving limit depends on the chosen product, so validate against a live
  // ref (product value → global → 20); read at validation time. 0 = unlimited.
  const limitRef = useRef(20);
  const schema = useMemo(
    () =>
      baseSchema.superRefine((v, ctx) => {
        const lim = limitRef.current;
        if (v.engraving_text && lim > 0 && v.engraving_text.length > lim) {
          ctx.addIssue({
            path: ['engraving_text'],
            code: z.ZodIssueCode.custom,
            message: `Eng ko'pi ${lim} ta belgi (${v.engraving_text.length} ta kiritildi)`,
          });
        }
      }),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, ring_size: 17, box_id: '', engraving_text: '' },
    mode: 'onChange',
  });
  const values = form.watch();

  const selectedProductEarly = products.data?.find((p) =>
    p.variants.some((vr) => vr.id === values.variant_id),
  );
  // A combo is ordered by its own variant_id (no ring size, no gift box).
  const selectedCombo = (combos.data?.items ?? []).find((c) => c.variant_id === values.variant_id) ?? null;
  const isCombo = Boolean(selectedCombo);
  // Engraving is per-product; combos never engrave. Resolve the limit live so the
  // input/counter/validation all use product → global → 20 (0 = unlimited).
  const engravingSupported = !isCombo && Boolean(selectedProductEarly?.engraving_available);
  const resolvedMax =
    engravingSupported && selectedProductEarly
      ? resolveEngravingMax(selectedProductEarly, globalEngravingMax)
      : 20;
  limitRef.current = resolvedMax;
  const categoryId = selectedProductEarly?.category_id ?? null;
  const boxesEnabled = useBoxesEnabled();
  const boxes = useBoxes(boxesEnabled ? categoryId : null, true);
  const availableBoxes = (boxes.data ?? []).filter((b) => b.is_active && b.available > 0);
  // Reset the box + engraving text whenever the product (hence category) changes.
  useEffect(() => {
    form.setValue('box_id', '');
    form.setValue('engraving_text', '');
  }, [values.variant_id, form]);

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
    // Send the text verbatim (spaces + & count) — only null when truly empty.
    const et = v.engraving_text ?? '';
    createOrder.mutate(
      {
        customer_id: v.customer_id,
        items: [
          isCombo
            ? { variant_id: v.variant_id, quantity: v.quantity }
            : {
                variant_id: v.variant_id,
                quantity: v.quantity,
                ring_size: v.ring_size.toFixed(1),
                box_id: boxesEnabled && v.box_id ? v.box_id : null,
                engraving_text: engravingSupported && et.trim() ? et : null,
              },
        ],
      },
      {
        onSuccess: (order) => navigate(`/orders/${order.id}`),
        onError: (e) => {
          // Backend validates the limit at creation — surface it on the field.
          const msg = (e as unknown as ApiError).message ?? '';
          if (engravingSupported && /belgi|sig'?adi/i.test(msg)) {
            form.setError('engraving_text', { message: msg });
            setStep(1);
          }
        },
      },
    );
  });

  const selectedProduct = selectedProductEarly;
  const selectedCustomer = customers.data?.find((c) => c.id === values.customer_id);
  const selectedBox = availableBoxes.find((b) => b.id === values.box_id) ?? null;
  const boxPrice = selectedBox ? Number(selectedBox.price) : 0;
  const engravingText = (values.engraving_text ?? '').trim();
  const engravingUnit =
    engravingSupported && engravingText && selectedProductEarly
      ? resolveEngravingPrice(selectedProductEarly, globalEngravingPrice)
      : 0;

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
                    label="Mahsulot yoki to'plam"
                    placeholder="Variantni tanlang"
                    options={[
                      ...products.data.flatMap((p) =>
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
                    ]}
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
              {engravingSupported && (
                <Controller
                  control={form.control}
                  name="engraving_text"
                  render={({ field, fieldState }) => {
                    const len = (field.value ?? '').length;
                    const hot = resolvedMax > 0 && len >= resolvedMax - 2;
                    return (
                      <div>
                        <Input
                          label={`Gravyurka matni — eng ko'pi ${resolvedMax === 0 ? 'cheksiz' : `${resolvedMax} belgi`}`}
                          placeholder="Masalan: Ali & Vali"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          maxLength={resolvedMax > 0 ? resolvedMax : undefined}
                          error={fieldState.error?.message}
                        />
                        <div className="mt-1 flex justify-end">
                          <span className={`tnum text-2xs ${hot ? 'text-danger' : 'text-muted'}`}>
                            {resolvedMax > 0 ? `${len} / ${resolvedMax}` : `${len} · cheksiz`}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
              )}
              {boxesEnabled && values.variant_id && availableBoxes.length > 0 && (
                <Controller
                  control={form.control}
                  name="box_id"
                  render={({ field }) => (
                    <Select
                      label="Sovg'a qutisi (ixtiyoriy)"
                      placeholder="Qutisiz"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={[
                        { value: '', label: 'Qutisiz' },
                        ...availableBoxes.map((b) => ({
                          value: b.id,
                          label: `${pickName(b, lang)} · ${b.is_free ? 'Tekin' : formatMoney(Number(b.price))}`,
                          description: `${b.available} dona mavjud`,
                          icon: (
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-strong"
                              style={{ background: b.color_hex }}
                            />
                          ),
                        })),
                      ]}
                    />
                  )}
                />
              )}
            </div>
          ))}

        {step === 2 &&
          (isCombo ? (
            <div className="rounded-xl border border-border bg-surface-2/40 px-4 py-6 text-center text-sm text-muted">
              To'plam uchun uzuk o'lchami talab qilinmaydi — «Keyingi»ni bosing.
            </div>
          ) : (
            <RingSizeCone
              value={RING_SIZES.includes(values.ring_size) ? values.ring_size : 17}
              onChange={(size) => form.setValue('ring_size', size, { shouldValidate: true })}
            />
          ))}

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
            <dt className="text-muted">{isCombo ? "To'plam" : 'Mahsulot'}</dt>
            <dd className="text-right text-text">
              {isCombo ? pickName(selectedCombo, lang) : selectedProduct ? pickName(selectedProduct, lang) : '—'}
            </dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted">Miqdor</dt>
            <dd className="text-text">{values.quantity || 1} dona</dd>
          </div>
          {!isCombo && (
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">O'lcham</dt>
              <dd className="text-text">{values.ring_size.toFixed(1)}</dd>
            </div>
          )}
          {selectedBox && (
            <div className="flex items-center justify-between border-b border-border pb-2">
              <dt className="flex items-center gap-1.5 text-muted">
                <span
                  className="h-3 w-3 rounded-full border border-strong"
                  style={{ background: selectedBox.color_hex }}
                />
                Quti
              </dt>
              <dd className="text-right text-text">
                {pickName(selectedBox, lang)} · {selectedBox.is_free ? 'Tekin' : <Money short value={boxPrice} />}
              </dd>
            </div>
          )}
          {engravingUnit > 0 && (
            <div className="flex items-center justify-between border-b border-border pb-2">
              <dt className="text-muted">Gravyurka</dt>
              <dd className="text-right text-text">
                «{values.engraving_text}» · <Money short value={engravingUnit} />
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="text-muted">Taxminiy summa</dt>
            <dd className="text-md tnum text-accent-ink">
              {isCombo ? (
                <Money value={Number(selectedCombo!.price) * (values.quantity || 1)} />
              ) : selectedProduct ? (
                <Money value={(Number(selectedProduct.effective_price) + boxPrice + engravingUnit) * (values.quantity || 1)} />
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
