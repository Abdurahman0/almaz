import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bot, Check, MoreVertical, Pencil, Phone, Trash2, UserX, X } from 'lucide-react';
import { Button, ConfirmDialog, DropdownMenu, Input, toast, type MenuItem } from '@/shared/ui';
import type { ApiError } from '@/shared/api/client';
import type { ConversationOut } from '@/shared/api/types';
import { useDeleteConversation, useDeleteCustomer, useUpdateCustomer } from '../hooks';
import { formatPhone, telHref } from '../phone';
import { AiControl } from './AiControl';

const schema = z.object({
  full_name: z.string().max(120, 'Juda uzun').optional(),
  phone: z
    .string()
    .max(20, 'Juda uzun')
    .optional()
    .refine((v) => !v || /^[\d+()\s-]{7,20}$/.test(v), "Telefon raqami noto'g'ri"),
});
type FormValues = z.infer<typeof schema>;

/** Conversation header: click-to-edit customer name + phone, AI control, and a
 *  ⋯ menu for deleting the conversation or the whole customer. */
export function ConversationHeader({
  conv,
  aiStateLabel,
  onDeleted,
}: {
  conv: ConversationOut;
  aiStateLabel: string;
  onDeleted: () => void;
}) {
  const cust = conv.customer;
  const update = useUpdateCustomer();
  const delConv = useDeleteConversation();
  const delCust = useDeleteCustomer();

  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<null | 'conversation' | 'customer'>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' });

  const name = cust?.full_name ?? cust?.username ?? 'Mijoz';

  const startEdit = () => {
    if (!cust) return;
    form.reset({ full_name: cust.full_name ?? '', phone: cust.phone ?? '' });
    setEditing(true);
  };

  const submit = form.handleSubmit((v) => {
    if (!cust) return;
    update.mutate(
      { customerId: cust.id, body: { full_name: v.full_name?.trim() || null, phone: v.phone?.trim() || null } },
      {
        onSuccess: () => { setEditing(false); toast.success('Saqlandi'); },
        onError: () => toast.error('Saqlashda xatolik'),
      },
    );
  });

  const menu: MenuItem[] = [
    ...(cust ? [{ label: 'Mijozni tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: startEdit }] : []),
    { label: "Suhbatni o'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => setConfirm('conversation'), separatorBefore: true },
    ...(cust ? [{ label: "Mijozni o'chirish", icon: <UserX className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => setConfirm('customer'), destructive: true }] : []),
  ];

  if (editing) {
    return (
      <form onSubmit={submit} className="flex flex-wrap items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-[9rem] flex-1">
          <Input placeholder="Toʻliq ism" aria-label="Toʻliq ism" error={form.formState.errors.full_name?.message} {...form.register('full_name')} />
        </div>
        <div className="min-w-[9rem] flex-1">
          <Input
            type="tel"
            inputMode="tel"
            placeholder="+998 90 123 45 67"
            aria-label="Telefon"
            error={form.formState.errors.phone?.message}
            {...form.register('phone')}
          />
        </div>
        <div className="flex gap-1.5">
          <Button type="submit" size="sm" loading={update.isPending}>
            <Check className="h-4 w-4" strokeWidth={2} /> Saqlash
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <button type="button" onClick={startEdit} disabled={!cust} className="group flex max-w-full items-center gap-1.5 text-left">
            <span className="truncate text-sm font-semibold text-text">{name}</span>
            {cust && <Pencil className="h-3 w-3 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.75} />}
          </button>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Bot className="h-3.5 w-3.5" strokeWidth={1.5} /> {aiStateLabel}
            </span>
            {cust?.phone && (
              <a href={`tel:${telHref(cust.phone)}`} className="flex items-center gap-1 text-accent-ink hover:underline">
                <Phone className="h-3 w-3" strokeWidth={1.75} /> {formatPhone(cust.phone)}
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <AiControl conv={conv} />
          <DropdownMenu
            items={menu}
            trigger={
              <button aria-label="Amallar" className="rounded-[var(--r-sm)] p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text">
                <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
              </button>
            }
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'conversation'}
        onClose={() => setConfirm(null)}
        heading="Suhbatni o'chirish"
        description="Suhbat va xabarlar o'chiriladi. Mijoz saqlanadi."
        confirmLabel="O'chirish"
        onConfirm={async () => {
          await delConv.mutateAsync(conv.id);
          toast.success("Suhbat o'chirildi");
          setConfirm(null);
          onDeleted();
        }}
      />

      <ConfirmDialog
        open={confirm === 'customer'}
        onClose={() => setConfirm(null)}
        heading={`«${name}» — mijozni o'chirish`}
        description="Mijoz, suhbat, xabarlar va lokatsiya butunlay o'chiriladi."
        confirmLabel="Butunlay o'chirish"
        onConfirm={async () => {
          if (!cust) return;
          try {
            await delCust.mutateAsync(cust.id);
          } catch (e) {
            const err = e as unknown as ApiError;
            // 400 = customer has orders. The server returns a helpful Uzbek message
            // ("…N ta buyurtmasi bor…") — surface it; fall back to our own copy.
            if (err?.status === 400) {
              throw new Error(err.message || 'Bu mijozda buyurtmalar bor — avval ularni bekor qiling yoki mijozni saqlab qoling.');
            }
            throw new Error(err?.message || "O'chirishda xatolik");
          }
          toast.success("Mijoz o'chirildi");
          setConfirm(null);
          onDeleted();
        }}
      />
    </>
  );
}
