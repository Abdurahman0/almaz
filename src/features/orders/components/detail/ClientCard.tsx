import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, MessageCircle, Pencil, Phone, X } from 'lucide-react';
import { Button, Card, Money, Skeleton, toast } from '@/shared/ui';
import { formatDate } from '@/shared/lib/format';
import { updateCustomer } from '@/features/inbox/api';
import { clientKeys, type ClientRow } from '@/features/clients/hooks';

interface ClientCardProps {
  customerId: string;
  client: ClientRow | undefined;
  clientsPending: boolean;
  currentOrderId: string;
}

/** Who ordered: contact, channel handle, order stats — with inline name edit for
 *  placeholder customers (PATCH /inbox/customers/{id}). */
export function ClientCard({ customerId, client, clientsPending, currentOrderId }: ClientCardProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const rename = useMutation({
    mutationFn: (full_name: string) => updateCustomer(customerId, { full_name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.conversations });
      toast.success('Mijoz nomi saqlandi');
      setEditing(false);
    },
    onError: () => toast.error('Saqlashda xatolik'),
  });

  if (clientsPending && !client) {
    return (
      <Card>
        <h2 className="mb-3 text-md font-semibold text-text">Mijoz</h2>
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  const initials = (client?.name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const isPlaceholder = Boolean(client && /^Mijoz |^@/.test(client.name));
  // "Customer since" is not in the API — the earliest order date is the honest floor.
  const firstOrderAt = client?.orders.length
    ? client.orders[client.orders.length - 1].created_at
    : null;
  const otherOrders = client?.orders.filter((o) => o.id !== currentOrderId) ?? [];

  return (
    <Card className="print-block">
      <h2 className="mb-3 text-md font-semibold text-text">Mijoz</h2>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-ink">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <span className="flex items-center gap-1.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && rename.mutate(name.trim())}
                aria-label="Mijoz ismi"
                autoFocus
                className="w-full rounded-[var(--r-xs)] border border-border bg-bg px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
              />
              <button
                aria-label="Saqlash"
                onClick={() => name.trim() && rename.mutate(name.trim())}
                className="rounded p-1 text-success hover:bg-success-soft"
              >
                <Check className="h-4 w-4" strokeWidth={2} />
              </button>
              <button aria-label="Bekor" onClick={() => setEditing(false)} className="rounded p-1 text-muted hover:text-text">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </span>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-text">
              <Link to={`/clients?client=${customerId}`} className="truncate hover:text-accent-ink">
                {client?.name ?? `Mijoz ${customerId.slice(0, 8)}`}
              </Link>
              {isPlaceholder && (
                <button
                  aria-label="Ismni tahrirlash"
                  onClick={() => { setName(''); setEditing(true); }}
                  className="rounded p-0.5 text-muted hover:text-accent-ink"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              )}
            </p>
          )}

          {client?.phone && (
            <a href={`tel:${client.phone}`} className="mt-1 flex items-center gap-1.5 text-sm text-accent-ink hover:underline">
              <Phone className="h-3.5 w-3.5" strokeWidth={1.5} /> <span className="tnum">{client.phone}</span>
            </a>
          )}
          {client?.username && (
            <p className="mt-0.5 truncate text-xs text-muted">
              @{client.username} · {client.channel === 'telegram' ? 'Telegram' : 'Instagram'}
            </p>
          )}
          {client?.createdAt ? (
            <p className="mt-0.5 text-xs text-muted">
              Mijoz: <span className="tnum">{formatDate(client.createdAt)}</span>dan beri
            </p>
          ) : (
            firstOrderAt && (
              <p className="mt-0.5 text-xs text-muted">
                Birinchi buyurtma: <span className="tnum">{formatDate(firstOrderAt)}</span>
              </p>
            )
          )}
        </div>
      </div>

      <p className="tnum mt-3 border-t border-border pt-3 text-xs text-muted">
        {client?.ordersCount ?? 0} ta buyurtma · jami{' '}
        <Money short value={client?.total ?? 0} className="font-medium text-text" />
        {otherOrders.length > 0 && (
          <>
            {' · '}
            <Link to={`/clients?client=${customerId}`} className="text-accent-ink hover:underline">
              boshqa buyurtmalari
            </Link>
          </>
        )}
      </p>

      {client?.conversationId && (
        <Link to={`/inbox/${client.conversationId}`} className="mt-3 block">
          <Button variant="secondary" size="sm" className="w-full">
            <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Suhbatga o'tish
          </Button>
        </Link>
      )}
    </Card>
  );
}
