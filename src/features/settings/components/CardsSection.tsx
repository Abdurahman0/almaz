import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Modal,
  SkeletonRows,
  toast,
} from '@/shared/ui';
import { useCards, useCreateCard, useDeleteCard, useUpdateCard } from '@/features/payments/hooks';
import type { PaymentCardOut } from '@/shared/api/types';

const cardSchema = z.object({
  holder_name: z.string().min(2, 'Egasining ismi kamida 2 ta belgi'),
  card_number_masked: z
    .string()
    .regex(/^\d{4}\s?\*{4}\s?\*{4}\s?\d{4}$|^\d{16}$/, 'Karta raqami: 16 raqam yoki 8600 **** **** 1234'),
  is_primary: z.boolean(),
  is_active: z.boolean(),
});
type CardValues = z.infer<typeof cardSchema>;

export function CardsSection() {
  const cards = useCards();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const [cardOpen, setCardOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentCardOut | null>(null);
  const [deleting, setDeleting] = useState<PaymentCardOut | null>(null);

  const cardForm = useForm<CardValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { holder_name: '', card_number_masked: '', is_primary: false, is_active: true },
  });

  const openCreate = () => {
    setEditing(null);
    cardForm.reset({ holder_name: '', card_number_masked: '', is_primary: false, is_active: true });
    setCardOpen(true);
  };
  const openEdit = (c: PaymentCardOut) => {
    setEditing(c);
    cardForm.reset({
      holder_name: c.holder_name,
      card_number_masked: c.card_number_masked,
      is_primary: c.is_primary,
      is_active: c.is_active,
    });
    setCardOpen(true);
  };

  const submit = cardForm.handleSubmit((v) => {
    const done = () => {
      setCardOpen(false);
      toast.success(editing ? 'Karta yangilandi' : "Karta qo'shildi");
    };
    if (editing) {
      updateCard.mutate({ id: editing.id, body: v }, { onSuccess: done, onError: () => toast.error('Xatolik') });
    } else {
      createCard.mutate(v, { onSuccess: done, onError: () => toast.error('Xatolik') });
    }
  });

  const saving = createCard.isPending || updateCard.isPending;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-md font-semibold text-text">Kartalar</h2>
        <Button variant="secondary" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Qo'shish
        </Button>
      </div>
      {cards.isPending && <SkeletonRows rows={2} />}
      {cards.data?.map((c) => (
        <div
          key={c.id}
          className={`group mb-3 flex items-center justify-between rounded-[var(--r-sm)] border border-border p-4 last:mb-0 ${
            c.is_active ? '' : 'opacity-60'
          }`}
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-accent-ink" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-text">{c.card_number_masked}</p>
              <p className="text-xs text-muted">{c.holder_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {c.is_primary && <Badge tone="gold">Asosiy</Badge>}
            {!c.is_active && <Badge tone="muted">Nofaol</Badge>}
            <button aria-label="Tahrirlash" onClick={() => openEdit(c)} className="rounded p-1.5 text-muted transition-colors hover:text-accent-ink">
              <Pencil className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button aria-label="O'chirish" onClick={() => setDeleting(c)} className="rounded p-1.5 text-muted transition-colors hover:text-danger">
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ))}
      {cards.isSuccess && cards.data.length === 0 && (
        <p className="text-sm text-muted">Kartalar qo'shilmagan</p>
      )}

      <Modal open={cardOpen} onClose={() => setCardOpen(false)} heading={editing ? 'Kartani tahrirlash' : "Karta qo'shish"}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input
            label="Egasining ismi"
            error={cardForm.formState.errors.holder_name?.message}
            {...cardForm.register('holder_name')}
          />
          <Input
            label="Karta raqami"
            placeholder="8600 **** **** 1234"
            error={cardForm.formState.errors.card_number_masked?.message}
            {...cardForm.register('card_number_masked')}
          />
          <div className="flex gap-6">
            <Checkbox
              checked={cardForm.watch('is_primary')}
              onCheckedChange={(v) => cardForm.setValue('is_primary', v)}
              label="Asosiy karta"
            />
            <Checkbox
              checked={cardForm.watch('is_active')}
              onCheckedChange={(v) => cardForm.setValue('is_active', v)}
              label="Aktiv"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setCardOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" loading={saving}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        heading="Kartani o'chirish"
        description={`«${deleting?.card_number_masked ?? ''}» butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteCard.mutateAsync(deleting.id);
          toast.success("Karta o'chirildi");
          setDeleting(null);
        }}
      />
    </>
  );
}
