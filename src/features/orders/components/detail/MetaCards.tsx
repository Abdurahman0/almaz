import { useState } from 'react';
import { Card, Select, Skeleton, Textarea, Button, toast } from '@/shared/ui';
import { useUpdateOrder } from '../../hooks';
import type { OrderOut, UserDetailOut } from '@/shared/api/types';

interface OperatorCardProps {
  order: OrderOut;
  staff: UserDetailOut[] | undefined;
  staffPending: boolean;
}

/** Assigned operator with quick reassign (PATCH assigned_operator_id). */
export function OperatorCard({ order, staff, staffPending }: OperatorCardProps) {
  const update = useUpdateOrder(order.id);
  return (
    <Card className="print-block">
      <h2 className="mb-3 text-md font-semibold text-text">Operator</h2>
      {staffPending ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Select
          options={[
            { value: 'none', label: 'Tayinlanmagan' },
            ...(staff ?? []).map((u) => ({ value: u.id, label: u.full_name })),
          ]}
          value={order.assigned_operator_id ?? 'none'}
          onChange={(v) =>
            update.mutate(
              { assigned_operator_id: v === 'none' ? null : v },
              { onSuccess: () => toast.success('Operator yangilandi') },
            )
          }
        />
      )}
    </Card>
  );
}

interface NotesCardProps {
  order: OrderOut;
}

/** Order notes, editable inline (PATCH notes). */
export function NotesCard({ order }: NotesCardProps) {
  const update = useUpdateOrder(order.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const save = () =>
    update.mutate(
      { notes: draft.trim() || null },
      { onSuccess: () => { toast.success('Izoh saqlandi'); setEditing(false); } },
    );

  return (
    <Card className="print-block">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-md font-semibold text-text">Izoh</h2>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDraft(order.notes ?? ''); setEditing(true); }}
          >
            {order.notes ? 'Tahrirlash' : "Qo'shish"}
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Ustaxona uchun eslatma..."
            aria-label="Izoh"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Bekor qilish
            </Button>
            <Button size="sm" loading={update.isPending} onClick={save}>
              Saqlash
            </Button>
          </div>
        </div>
      ) : order.notes ? (
        <p className="max-w-[70ch] whitespace-pre-wrap text-sm text-text">{order.notes}</p>
      ) : (
        <p className="text-sm text-muted">Izoh yo'q</p>
      )}
    </Card>
  );
}
