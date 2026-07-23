import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Search, ShoppingBag, X } from 'lucide-react';
import {
  Badge,
  Card,
  EmptyState,
  ErrorCard,
  HallmarkBadge,
  HoverCard,
  OrderStatusBadge,
  PageHeader,
  SkeletonCards,
  Money,
  tierForTotal,
} from '@/shared/ui';
import { formatDate } from '@/shared/lib/format';
import { useClients, type ClientRow } from '../hooks';

const channelLabels: Record<string, string> = {
  telegram: 'Telegram',
  instagram: 'Instagram',
};

function ClientDrawer({ client, onClose }: { client: ClientRow; onClose: () => void }) {
  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-surface p-8 shadow-card"
      role="dialog"
      aria-label={client.name}
    >
      <div className="mb-6 flex items-start justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-text">{client.name}</h2>
          {client.username && <p className="mt-1 text-sm text-muted">@{client.username}</p>}
        </div>
        <button onClick={onClose} aria-label="Yopish" className="rounded-lg p-2 text-muted hover:text-text">
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <HallmarkBadge tier={tierForTotal(client.total)} />
        <div>
          <p className="text-xs uppercase tracking-caps text-muted">Jami xaridlar</p>
          <p className="text-lg tnum text-accent-ink">
            <Money short value={client.total} />
          </p>
        </div>
      </div>

      <dl className="mb-6 space-y-3 text-sm">
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
            className="flex items-center justify-between rounded-lg border border-border p-3 text-sm transition-colors hover:border-strong"
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
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
            className="w-full rounded-lg border border-border bg-bg py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-accent"
          />
        </div>
      </div>

      {clients.isPending && <SkeletonCards count={6} />}
      {clients.isError && <ErrorCard error={clients.error} onRetry={() => clients.refetch()} />}
      {clients.isSuccess && filtered.length === 0 && (
        <Card>
          <EmptyState
            heading="Mijozlar topilmadi"
            hint="Mijozlar suhbatlar va buyurtmalar orqali avtomatik paydo bo'ladi"
          />
        </Card>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <HoverCard key={c.id} onClick={() => setSelectedId(c.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-md font-semibold text-text">{c.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                  <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {c.channel ? channelLabels[c.channel] : 'Buyurtmadan'}
                  {c.username ? ` · @${c.username}` : ''}
                </p>
              </div>
              <HallmarkBadge tier={tierForTotal(c.total)} size="sm" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-semibold text-accent-ink">
                <Money short value={c.total} />
              </span>
              <Badge tone="muted">
                <ShoppingBag className="mr-1 h-3 w-3" strokeWidth={1.5} />
                {c.ordersCount}
              </Badge>
            </div>
          </HoverCard>
        ))}
      </div>

      <AnimatePresence>
        {selected && <ClientDrawer client={selected} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>
    </div>
  );
}
