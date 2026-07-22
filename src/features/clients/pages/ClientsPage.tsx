import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Pencil, Phone, Plus, Search, Trash2, X } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorCard,
  HallmarkBadge,
  HoverCard,
  Modal,
  PageHeader,
  SkeletonCards,
  Money,
  ConfirmDialog,
  toast,
  tierForTotal,
} from '@/shared/ui';
import { daysUntilAnniversary, formatDate } from '@/shared/lib/format';
import { useClients, useDeleteClient } from '../hooks';
import { ClientForm } from '../components/ClientForm';
import type { MockClient } from '@/shared/mocks/clients';

function ClientDrawer({ client, onClose, onEdit }: {
  client: MockClient;
  onClose: () => void;
  onEdit: () => void;
}) {
  const annDays = client.anniversary ? daysUntilAnniversary(client.anniversary) : null;
  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-surface p-8 shadow-card"
      role="dialog"
      aria-label={client.fullName}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">{client.fullName}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Phone className="h-4 w-4" strokeWidth={1.5} /> {client.phone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} aria-label="Tahrirlash" className="rounded-lg p-2 text-muted hover:text-accent-ink">
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button onClick={onClose} aria-label="Yopish" className="rounded-lg p-2 text-muted hover:text-text">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <HallmarkBadge tier={tierForTotal(client.totalPurchases)} />
        <div>
          <p className="text-xs uppercase tracking-caps text-muted">Jami xaridlar</p>
          <p className="text-lg tnum text-accent-ink">
            <Money short value={client.totalPurchases} />
          </p>
        </div>
      </div>

      {annDays !== null && annDays <= 30 && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-strong bg-accent-soft p-4">
          <Gift className="h-5 w-5 shrink-0 text-accent-ink" strokeWidth={1.5} />
          <p className="text-sm text-text">
            Nikoh kuni {annDays === 0 ? 'bugun' : `${annDays} kundan keyin`} — tabriklashni unutmang!
          </p>
        </div>
      )}

      <dl className="mb-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Uzuk o'lchami</dt>
          <dd className="font-semibold text-text">{client.ringSize?.toFixed(1) ?? '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Nikoh kuni</dt>
          <dd className="text-text">{client.anniversary ? formatDate(client.anniversary) : '—'}</dd>
        </div>
        {client.notes && (
          <div>
            <dt className="text-muted">Izohlar</dt>
            <dd className="mt-1 rounded-lg border border-border p-3 text-text">{client.notes}</dd>
          </div>
        )}
      </dl>

      <h3 className="mb-3 text-md font-semibold text-text">Xaridlar tarixi</h3>
      <div className="space-y-2">
        {client.purchases.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <div>
              <p className="text-text">{p.productName}</p>
              <p className="text-xs text-muted">{formatDate(p.date)}</p>
            </div>
            <span className="font-semibold text-accent-ink"><Money short value={p.amount} /></span>
          </div>
        ))}
        {client.purchases.length === 0 && <p className="text-sm text-muted">Xaridlar hali yo'q</p>}
      </div>
    </motion.aside>
  );
}

export default function ClientsPage() {
  const clients = useClients();
  const deleteClient = useDeleteClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MockClient | undefined>();
  const [deleting, setDeleting] = useState<MockClient | undefined>();

  const filtered = useMemo(
    () =>
      (clients.data ?? []).filter(
        (c) =>
          c.fullName.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.replace(/\s/g, '').includes(search.replace(/\s/g, '')),
      ),
    [clients.data, search],
  );
  const selected = clients.data?.find((c) => c.id === selectedId);

  return (
    <div>
      <PageHeader
        heading="Mijozlar"
        subheading="Har bir mijoz — o'z probasiga ega"
        actions={
          <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Yangi mijoz
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            aria-label="Mijoz qidirish"
            className="w-full rounded-lg border border-border bg-bg py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-accent"
          />
        </div>
        <Badge tone="muted">Namunaviy maʼlumot — API'da mijozlar bo'limi yo'q</Badge>
      </div>

      {clients.isPending && <SkeletonCards count={6} />}
      {clients.isError && <ErrorCard error={clients.error} onRetry={() => clients.refetch()} />}
      {clients.isSuccess && filtered.length === 0 && (
        <Card>
          <EmptyState heading="Mijozlar topilmadi" hint="Qidiruvni o'zgartiring yoki yangi mijoz qo'shing" />
        </Card>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => {
          const annDays = c.anniversary ? daysUntilAnniversary(c.anniversary) : null;
          return (
            <HoverCard key={c.id} onClick={() => setSelectedId(c.id)} className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-md font-semibold text-text">{c.fullName}</p>
                  <p className="mt-0.5 text-sm text-muted">{c.phone}</p>
                </div>
                <HallmarkBadge tier={tierForTotal(c.totalPurchases)} size="sm" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-semibold text-accent-ink"><Money short value={c.totalPurchases} /></span>
                {annDays !== null && annDays <= 30 && (
                  <span className="flex items-center gap-1 text-xs text-accent-ink">
                    <Gift className="h-3.5 w-3.5" strokeWidth={1.5} /> {annDays} kun
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleting(c); }}
                aria-label="O'chirish"
                className="absolute bottom-3 right-3 rounded-lg p-1.5 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </HoverCard>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <ClientDrawer
            client={selected}
            onClose={() => setSelectedId(null)}
            onEdit={() => { setEditing(selected); setFormOpen(true); }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        heading="Mijozni o'chirish"
        description={`«${deleting?.fullName ?? ''}» va uning xaridlar tarixi butunlay o'chiriladi.`}
        loading={deleteClient.isPending}
        onConfirm={() =>
          deleting &&
          deleteClient.mutate(deleting.id, {
            onSuccess: () => { setDeleting(undefined); toast.success("Mijoz o'chirildi"); },
          })
        }
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        heading={editing ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
      >
        <ClientForm client={editing} onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
