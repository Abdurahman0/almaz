import { useEffect, useRef } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Info } from 'lucide-react';
import { Button, Card, ConfirmDialog, ErrorCard, PageHeader, Select, Skeleton, Textarea, orderStatusLabels } from '@/shared/ui';
import { FEATURES } from '@/shared/config/flags';
import type { ApiError } from '@/shared/api/client';
import type { OrderStatus } from '@/shared/api/types';
import { useOrder, useSetOrderStatus, useUpdateOrder } from '../hooks';

const STATUS_OPTIONS = (Object.keys(orderStatusLabels) as OrderStatus[]).map((s) => ({ value: s, label: orderStatusLabels[s] }));
// Cancellation/return releases stock — handled by /orders/{id}/cancel, never here.
const CANCEL_LIKE = new Set<OrderStatus>(['cancelled', 'refunded', 'returned']);

const schema = z.object({
  status: z.string().min(1, 'Holatni tanlang'),
  notes: z.string().max(2000, 'Izoh juda uzun').optional(),
});
type FormValues = z.infer<typeof schema>;

/*
 * Order editing (FEATURES.orderEditing). PATCH /orders/{id} is live but only
 * applies `notes` — `status` and `items` are ignored by the server. So notes go
 * through PATCH and status through POST /orders/{id}/status (which writes an
 * order_status_history entry). Cancellation is never done here (see /cancel).
 */
export default function OrderEditPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const order = useOrder(orderId);
  const update = useUpdateOrder(orderId);
  const setStatus = useSetOrderStatus();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { status: '', notes: '' }, mode: 'onChange' });
  const seeded = useRef(false);
  useEffect(() => {
    if (order.data && !seeded.current) {
      form.reset({ status: order.data.status, notes: order.data.notes ?? '' });
      seeded.current = true;
    }
  }, [order.data, form]);

  const dirty = form.formState.isDirty;
  const saving = update.isPending || setStatus.isPending;
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
  if (order.isError) return <ErrorCard error={order.error} onRetry={() => order.refetch()} />;

  const orig = order.data;

  const submit = form.handleSubmit(async (v) => {
    const statusChanged = v.status !== orig.status;
    const notesChanged = (v.notes ?? '').trim() !== (orig.notes ?? '');
    // Cancellation/return must go through the cancel action (stock release).
    if (statusChanged && CANCEL_LIKE.has(v.status as OrderStatus)) {
      form.setError('status', { message: "Bekor/qaytarish — buyurtma sahifasidagi «Bekor qilish» orqali" });
      return;
    }
    try {
      const jobs: Array<Promise<unknown>> = [];
      if (notesChanged) jobs.push(update.mutateAsync({ notes: v.notes?.trim() || null }));
      if (statusChanged) jobs.push(setStatus.mutateAsync({ id: orderId, status: v.status as OrderStatus }));
      await Promise.all(jobs);
      navigate(`/orders/${orderId}`);
    } catch (e) {
      // Field-level: invalid transition / size-related rejections surface inline.
      const msg = (e as unknown as ApiError)?.message ?? '';
      if (/holat|o'?tish|status/i.test(msg)) form.setError('status', { message: msg });
      else if (/o'?lcham/i.test(msg)) form.setError('notes', { message: msg });
      // hooks already toast on error; keep the user on the page.
    }
  });

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
      <Card className="max-w-xl space-y-5">
        <div className="flex gap-3 rounded-[var(--r-md)] border border-accent/30 bg-accent-soft/50 p-3.5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" strokeWidth={1.75} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-text">Faqat holat va izohни tahrirlash mumkin</p>
            <p className="mt-1 text-muted">
              Mahsulot yoki o'lchamni o'zgartirish uchun bu buyurtmани <span className="font-medium text-text">bekor qiling</span> va
              <span className="font-medium text-text"> yangisini yarating</span> — ular buyurtma yaratilgandan so'ng o'zgartirilmaydi.
              Holat o'zgarishi buyurtma tarixида saqlanadi.
            </p>
          </div>
        </div>
        <Controller
          control={form.control}
          name="status"
          render={({ field, fieldState }) => (
            <Select label="Holat" options={STATUS_OPTIONS} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Textarea label="Izoh" placeholder="Ichki izoh" error={form.formState.errors.notes?.message} {...form.register('notes')} />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate(`/orders/${orderId}`)}>Bekor qilish</Button>
          <Button onClick={submit} loading={saving} disabled={!dirty}>Saqlash</Button>
        </div>
      </Card>

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
