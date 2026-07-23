import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Plus } from 'lucide-react';
import { Badge, Button, Input, Modal, SkeletonRows } from '@/shared/ui';
import { useCards, useCreateCard } from '@/features/payments/hooks';

const cardSchema = z.object({
  holder_name: z.string().min(2, 'Egasining ismi kamida 2 ta belgi'),
  card_number_masked: z
    .string()
    .regex(/^\d{4}\s?\*{4}\s?\*{4}\s?\d{4}$|^\d{16}$/, 'Karta raqami: 16 raqam yoki 8600 **** **** 1234'),
});
type CardValues = z.infer<typeof cardSchema>;

export function CardsSection() {
  const cards = useCards();
  const createCard = useCreateCard();
  const [cardOpen, setCardOpen] = useState(false);
  const cardForm = useForm<CardValues>({ resolver: zodResolver(cardSchema) });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-md font-semibold text-text">Kartalar</h2>
        <Button variant="secondary" size="sm" onClick={() => setCardOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Qo'shish
        </Button>
      </div>
      {cards.isPending && <SkeletonRows rows={2} />}
      {cards.data?.map((c) => (
        <div
          key={c.id}
          className="mb-3 flex items-center justify-between rounded-lg border border-border p-4 last:mb-0"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-accent-ink" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-text">{c.card_number_masked}</p>
              <p className="text-xs text-muted">{c.holder_name}</p>
            </div>
          </div>
          {c.is_primary && <Badge tone="gold">Asosiy</Badge>}
        </div>
      ))}
      {cards.isSuccess && cards.data.length === 0 && (
        <p className="text-sm text-muted">Kartalar qo'shilmagan</p>
      )}

      <Modal open={cardOpen} onClose={() => setCardOpen(false)} heading="Karta qo'shish">
        <form
          onSubmit={cardForm.handleSubmit((v) =>
            createCard.mutate(
              { ...v, is_primary: false, is_active: true },
              { onSuccess: () => { setCardOpen(false); cardForm.reset(); } },
            ),
          )}
          className="space-y-4"
          noValidate
        >
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
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setCardOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" loading={createCard.isPending}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
