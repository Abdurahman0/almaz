import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Phone, Search, Trash2, X } from 'lucide-react';
import {
  Card,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  ErrorCard,
  HallmarkBadge,
  OrderStatusBadge,
  PageHeader,
  SkeletonRows,
  Money,
  toast,
  tierForTotal,
} from '@/shared/ui';
import { formatDate } from '@/shared/lib/format';
import type { ApiError } from '@/shared/api/client';
import { useClients, useDeleteClient, type ClientRow } from '../hooks';
import { ClientEditModal } from '../components/ClientEditModal';

const channelLabels: Record<string, string> = {
  telegram: 'Telegram',
  instagram: 'Instagram',
};

function ClientDrawer({
  client,
  onClose,
  onEdit,
  onDelete,
}: {
  client: ClientRow;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="glass-1 fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto p-8"
      role="dialog"
      aria-label={client.name}
    >
      <div className="mb-6 flex items-start justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-text">{client.name}</h2>
          {client.username && <p className="mt-1 text-sm text-muted">@{client.username}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onEdit}
            aria-label="Tahrirlash"
            className="rounded-[var(--r-sm)] p-2 text-muted transition-colors hover:bg-accent-soft hover:text-accent-ink"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={onDelete}
            aria-label="O'chirish"
            className="rounded-[var(--r-sm)] p-2 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button onClick={onClose} aria-label="Yopish" className="rounded-[var(--r-sm)] p-2 text-muted hover:text-text">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <HallmarkBadge tier={tierForTotal(client.total)} />
        <div>
          <p className="text-xs text-muted">Jami xaridlar</p>
          <p className="text-lg tnum text-accent-ink">
            <Money short value={client.total} />
          </p>
        </div>
      </div>

      <dl className="mb-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Telefon</dt>
          <dd>
            {client.phone ? (
              <a href={`tel:${client.phone}`} className="tnum flex items-center gap-1.5 text-accent-ink hover:underline">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} /> {client.phone}
              </a>
            ) : (
              <span className="text-muted">—</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Kanal</dt>
          <dd className="font-semibold text-text">
            {client.channel ? channelLabels[client.channel] : '—'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Til</dt>
          <dd className="text-text">{client.language?.toUpperCase() ?? '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Buyurtmalar</dt>
          <dd className="tnum text-text">{client.ordersCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">So'nggi buyurtma</dt>
          <dd className="text-text">{client.lastOrderAt ? formatDate(client.lastOrderAt) : '—'}</dd>
        </div>
      </dl>

      <h3 className="mb-3 text-md font-semibold text-text">Buyurtmalar tarixi</h3>
      <div className="space-y-2">
        {client.orders.map((o) => (
          <Link
            key={o.id}
            to={`/orders/${o.id}`}
            className="flex items-center justify-between rounded-[var(--r-sm)] border border-border p-3 text-sm transition-colors hover:border-strong"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-text">
                <span className="font-semibold">{o.order_no}</span>
                <OrderStatusBadge status={o.status} />
              </p>
              <p className="mt-0.5 text-xs text-muted">{formatDate(o.created_at)}</p>
            </div>
            <span className="font-semibold text-accent-ink">
              <Money short value={Number(o.grand_total)} />
            </span>
          </Link>
        ))}
        {client.orders.length === 0 && <p className="text-sm text-muted">Buyurtmalar hali yo'q</p>}
      </div>
    </motion.aside>
  );
}

export default function ClientsPage() {
  const clients = useClients();
  const deleteClient = useDeleteClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState<ClientRow | null>(null);
  // Drawer is URL-addressable (?client=<id>) so other pages (e.g. the order
  // detail) can deep-link straight to a client.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('client');
  const openClient = (id: string) =>
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('client', id); return n; });
  const closeClient = () =>
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('client'); return n; });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (clients.data ?? []).filter(
      (c) => !q || c.name.toLowerCase().includes(q) || (c.username ?? '').toLowerCase().includes(q),
    );
  }, [clients.data, search]);
  const selected = clients.data?.find((c) => c.id === selectedId);

  return (
    <div>
      <PageHeader heading="Mijozlar" subheading="Suhbatlar va buyurtmalardan jonli maʼlumot" />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            aria-label="Mijoz qidirish"
            className="w-full rounded-[var(--r-md)] border border-border bg-surface-2 py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-accent"
          />
        </div>
      </div>

      {clients.isPending && <SkeletonRows rows={8} />}
      {clients.isError && <ErrorCard error={clients.error} onRetry={() => clients.refetch()} />}
      {clients.isSuccess && filtered.length === 0 && (
        <Card>
          <EmptyState
            heading="Mijozlar topilmadi"
            hint="Mijozlar suhbatlar va buyurtmalar orqali avtomatik paydo bo'ladi"
          />
        </Card>
      )}

      {clients.isSuccess && filtered.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Mijoz</th>
                <th>Kanal</th>
                <th className="!text-right">Buyurtmalar</th>
                <th className="!text-right">Jami</th>
                <th>Daraja</th>
                <th className="w-10" aria-label="Amallar" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => openClient(c.id)}>
                  <td>
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink">
                        {c.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-text">{c.name}</span>
                        {c.username && <span className="block truncate text-2xs text-muted">@{c.username}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="text-muted">{c.channel ? channelLabels[c.channel] : 'Buyurtmadan'}</td>
                  <td className="tnum text-right text-muted">{c.ordersCount} ta</td>
                  <td className="text-right font-semibold text-accent-ink"><Money short value={c.total} /></td>
                  <td>{tierForTotal(c.total) !== '375' && <HallmarkBadge tier={tierForTotal(c.total)} size="sm" />}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu
                      ariaLabel={`${c.name} amallari`}
                      items={[
                        {
                          label: 'Tahrirlash',
                          icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />,
                          onSelect: () => setEditing(c),
                        },
                        {
                          label: "O'chirish",
                          icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />,
                          destructive: true,
                          separatorBefore: true,
                          onSelect: () => setDeleting(c),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <AnimatePresence>
        {selected && (
          <ClientDrawer
            client={selected}
            onClose={closeClient}
            onEdit={() => setEditing(selected)}
            onDelete={() => setDeleting(selected)}
          />
        )}
      </AnimatePresence>

      <ClientEditModal client={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        heading="Mijozni o'chirish"
        description={`«${deleting?.name ?? ''}» suhbati, xabarlari va lokatsiyasi bilan butunlay o'chiriladi. Buyurtmalari bor mijozni server rad etadi.`}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteClient.mutateAsync(deleting.id);
          } catch (e) {
            // ApiError is a plain object — rethrow as Error so the dialog shows the server's message inline
            throw new Error((e as ApiError).message ?? "O'chirib bo'lmadi");
          }
          toast.success("Mijoz o'chirildi");
          if (selectedId === deleting.id) closeClient();
          setDeleting(null);
        }}
      />
    </div>
  );
}
