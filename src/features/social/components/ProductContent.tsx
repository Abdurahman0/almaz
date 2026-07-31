import { useNavigate } from 'react-router-dom';
import { CalendarClock, Clapperboard, Gem, Instagram, Plus } from 'lucide-react';
import { Badge, Button, Skeleton } from '@/shared/ui';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import type { InstagramMediaOut, ProductOut } from '@/shared/api/types';
import { useProductInstagram } from '@/features/products/hooks';
import { deriveKind, kindLabel, statusChip } from '../api';
import { EngagementRow } from './Engagement';

/** One content card in the product-detail Kontentlar grid → deep-links to the item. */
function ContentCard({ item, onOpen }: { item: InstagramMediaOut; onOpen: () => void }) {
  const kind = deriveKind(item.permalink, item.media_type);
  const status = statusChip(item);
  const scheduled = item.status === 'scheduled' && item.scheduled_at;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-[var(--r-md)] border border-border text-left transition-colors hover:border-strong"
    >
      <div className="relative aspect-square bg-surface-2">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Gem className="h-7 w-7 text-muted/45" strokeWidth={1.25} />
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-2xs font-semibold text-white backdrop-blur">
          {kind === 'reel' ? <Clapperboard className="h-3 w-3" strokeWidth={2} /> : <Instagram className="h-3 w-3" strokeWidth={2} />}
          {kindLabel[kind]}
        </span>
      </div>
      <div className="space-y-1.5 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="tnum shrink-0 text-2xs text-muted">
            {scheduled ? (
              <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" strokeWidth={1.75} /> {formatDateTime(item.scheduled_at!)}</span>
            ) : (
              formatDate(item.created_at)
            )}
          </span>
        </div>
        {item.caption && <p className="line-clamp-2 text-2xs text-muted">{item.caption}</p>}
        <EngagementRow item={item} />
      </div>
    </button>
  );
}

/** "Kontentlar" section on the product detail — the product's attached social
 *  content. "Kontent qo'shish" delegates up to the parent (`onAddContent`), which
 *  swaps the create form INTO the same modal (no nested modals). */
export function ProductContent({ product, onAddContent }: { product: ProductOut; onAddContent: () => void }) {
  const navigate = useNavigate();
  const media = useProductInstagram(product.id);
  const items = media.data ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-muted">
          Kontentlar{media.isSuccess && items.length > 0 && <span className="text-text"> · {items.length}</span>}
        </p>
        {media.isSuccess && items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onAddContent}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> Kontent qo'shish
          </Button>
        )}
      </div>

      {media.isPending && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-[var(--r-md)]" />
          ))}
        </div>
      )}

      {media.isError && (
        <div className="flex items-center justify-between rounded-[var(--r-md)] border border-danger-soft bg-danger-soft/40 px-4 py-3 text-sm">
          <span className="text-danger">Kontentni yuklab bo'lmadi</span>
          <Button variant="ghost" size="sm" onClick={() => media.refetch()}>Qayta urinish</Button>
        </div>
      )}

      {media.isSuccess && items.length === 0 && (
        <div className="rounded-[var(--r-md)] border border-dashed border-border bg-surface-2/40 px-5 py-8 text-center">
          <Instagram className="mx-auto mb-2 h-7 w-7 text-muted/50" strokeWidth={1.25} />
          <p className="text-sm text-muted">Bu mahsulot uchun kontent qo'shilmagan</p>
          <Button className="mt-4" size="sm" onClick={onAddContent}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Kontent qo'shish
          </Button>
        </div>
      )}

      {media.isSuccess && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <ContentCard key={m.id} item={m} onOpen={() => navigate(`/social/content/${m.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
