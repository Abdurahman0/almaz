import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { CalendarClock, Clapperboard, ExternalLink, Eye, Gem, Grid3x3, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  ErrorCard,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  toast,
  type MenuItem,
  type SelectOption,
} from '@/shared/ui';
import { pickName } from '@/shared/lib/localize';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { useUiStore } from '@/shared/stores/ui';
import type { ContentStatus } from '@/shared/api/types';
import { useProducts } from '@/features/products/hooks';
import { useContentItem, useDeleteSocial, useSocialFeed } from '../hooks';
import { StoryViewer, type StoryGroup } from '../components/StoryViewer';
import { ContentForm } from '../components/ContentForm';
import { ContentEditForm } from '../components/ContentEditForm';
import { EngagementRow } from '../components/Engagement';
import { contentStatusLabel, enrichMedia, kindLabel, statusChip, type SocialItem } from '../api';

type Tab = 'feed' | 'reels';
type SortMode = 'new' | 'views';

const statusFilterOptions: SelectOption[] = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'published', label: contentStatusLabel.published },
  { value: 'scheduled', label: contentStatusLabel.scheduled },
  { value: 'draft', label: contentStatusLabel.draft },
];
const sortOptions: SelectOption[] = [
  { value: 'new', label: 'Yangi' },
  { value: 'views', label: "Eng ko'p ko'rilgan" },
];

function ActionMenu({ items, className }: { items: MenuItem[]; className?: string }) {
  return (
    <span className={className} onClick={(e) => e.stopPropagation()}>
      <DropdownMenu
        items={items}
        trigger={
          <button aria-label="Amallar" className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/70">
            <span className="text-base leading-none">⋯</span>
          </button>
        }
      />
    </span>
  );
}

function StoryRing({ group, onOpen, menu }: { group: StoryGroup; onOpen: () => void; menu: MenuItem[] }) {
  const lang = useUiStore((s) => s.lang);
  const cover = group.stories.find((s) => s.image_url)?.image_url ?? null;
  return (
    <div className="group relative flex w-[76px] shrink-0 flex-col items-center gap-1.5">
      <button onClick={onOpen} className="story-ring flex h-[68px] w-[68px] items-center justify-center rounded-full p-[2.5px]">
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface-2">
          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <Gem className="h-6 w-6 text-muted/60" strokeWidth={1.25} />}
        </span>
      </button>
      <ActionMenu items={menu} className="absolute right-0 top-0 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="w-full truncate text-center text-2xs text-muted">{pickName(group.product, lang)}</span>
    </div>
  );
}

/** A feed/reel grid tile with a status chip + (when measured) engagement. */
function Tile({ item, reel, highlighted, onOpen, menu }: { item: SocialItem; reel: boolean; highlighted: boolean; onOpen: () => void; menu: MenuItem[] }) {
  const lang = useUiStore((s) => s.lang);
  const chip = statusChip(item);
  const scheduled = item.status === 'scheduled' && item.scheduled_at;
  return (
    <div
      id={`content-tile-${item.id}`}
      onClick={onOpen}
      className={`group relative cursor-pointer overflow-hidden rounded-[var(--r-sm)] bg-surface-2 ${reel ? 'aspect-[9/16]' : 'aspect-square'} ${highlighted ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
    >
      {item.image_url ? (
        <img src={item.image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
      ) : (
        <div className="flex h-full w-full items-center justify-center"><Gem className="h-8 w-8 text-muted/45" strokeWidth={1.25} /></div>
      )}

      {item.kind === 'reel' && <Clapperboard className="absolute right-2 top-2 h-4 w-4 text-white drop-shadow" strokeWidth={2} />}
      {item.status !== 'published' && (
        <span className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold backdrop-blur ${chip.tone === 'gold' ? 'bg-amber-500/80 text-white' : 'bg-black/55 text-white'}`}>
          {scheduled && <CalendarClock className="h-3 w-3" strokeWidth={2} />} {chip.label}
        </span>
      )}

      <ActionMenu items={menu} className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100" />

      <span className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-black/75 via-black/10 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="truncate text-left text-2xs font-semibold text-white">{pickName(item.product, lang)}</span>
        <EngagementRow item={item} className="!text-white/85" />
      </span>
    </div>
  );
}

export default function SocialPage() {
  const lang = useUiStore((s) => s.lang);
  const navigate = useNavigate();
  const { contentId } = useParams();
  const products = useProducts();
  const del = useDeleteSocial();

  const [tab, setTab] = useState<Tab>('feed');
  const [productFilter, setProductFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('new');
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<SocialItem | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SocialItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  // Server-side filters (product_id + status) — no client-side N+1 filtering.
  const feed = useSocialFeed({
    product_id: productFilter || undefined,
    status: (statusFilter as ContentStatus) || undefined,
  });
  // Deep link fetches the item directly by id (no feed scan); 404 → not-found state.
  const contentQuery = useContentItem(contentId);

  const items = useMemo(() => feed.data ?? [], [feed.data]);
  const productMap = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.id, { id: p.id, name_uz: p.name_uz, name_ru: p.name_ru }] as const)),
    [products.data],
  );

  const stories = useMemo(() => items.filter((i) => i.kind === 'story' && !i.is_expired), [items]);
  const scheduled = useMemo(
    () => items.filter((i) => i.status === 'scheduled').sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? '')),
    [items],
  );
  const byViews = (a: SocialItem, b: SocialItem) => (b.view_count ?? -1) - (a.view_count ?? -1);
  const feedItems = useMemo(() => {
    const arr = items.filter((i) => i.kind !== 'story');
    return sortMode === 'views' ? [...arr].sort(byViews) : arr;
  }, [items, sortMode]);
  const reels = useMemo(() => {
    const arr = items.filter((i) => i.kind === 'reel');
    return sortMode === 'views' ? [...arr].sort(byViews) : arr;
  }, [items, sortMode]);

  const storyGroups: StoryGroup[] = useMemo(() => {
    const map = new Map<string, StoryGroup>();
    for (const s of stories) {
      const g = map.get(s.product.id) ?? { product: s.product, stories: [] };
      g.stories.push(s);
      map.set(s.product.id, g);
    }
    return [...map.values()];
  }, [stories]);

  // Product filter lists every product (not just those with content in the current view).
  const productOptions: SelectOption[] = useMemo(
    () => [{ value: '', label: 'Barcha mahsulotlar' }, ...(products.data ?? []).map((p) => ({ value: p.id, label: pickName(p, lang) }))],
    [products.data, lang],
  );

  const grid = tab === 'reels' ? reels : feedItems;
  const productThumb = (id: string) => products.data?.find((p) => p.id === id)?.media?.[0]?.image_url ?? null;
  const goToProduct = (id: string) => navigate(`/products?product=${id}`);

  // Deep link — open the by-id item (post/reel → lightbox, story → viewer) + highlight.
  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!contentId || !contentQuery.isSuccess || openedRef.current === contentId) return;
    openedRef.current = contentId;
    const item = enrichMedia(contentQuery.data, productMap);
    if (item.kind === 'story') {
      const gi = storyGroups.findIndex((g) => g.stories.some((s) => s.id === item.id));
      if (gi >= 0) setViewerStart(gi);
      else setLightbox(item); // expired/not in feed — show the still
    } else {
      setTab(item.kind === 'reel' ? 'reels' : 'feed');
      setLightbox(item);
    }
    setHighlightId(item.id);
    requestAnimationFrame(() => document.getElementById(`content-tile-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    const t = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(t);
  }, [contentId, contentQuery.isSuccess, contentQuery.data, productMap, storyGroups]);

  const clearDeepLink = () => { if (contentId) navigate('/social', { replace: true }); };
  const closeLightbox = () => { setLightbox(null); clearDeepLink(); };
  const closeViewer = () => { setViewerStart(null); clearDeepLink(); };
  const notFound = Boolean(contentId) && contentQuery.isError;

  // Open edit / confirm-delete for a single item from ANY surface (tile, scheduled
  // card, lightbox, story viewer). Closes whatever overlay is open first so only one
  // modal is ever up.
  const requestEdit = (item: SocialItem) => { setLightbox(null); setViewerStart(null); clearDeepLink(); setEditing(item); };
  const requestDelete = (item: SocialItem) => {
    setLightbox(null); setViewerStart(null); clearDeepLink();
    setDeleteTarget({ ids: [item.id], label: `${kindLabel[item.kind]} — ${pickName(item.product, lang)}` });
  };

  const tileMenu = (item: SocialItem): MenuItem[] => [
    { label: "Ko'rish", icon: <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => setLightbox(item) },
    { label: 'Tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => requestEdit(item) },
    { label: "O'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, destructive: true, separatorBefore: true, onSelect: () => requestDelete(item) },
  ];
  const ringMenu = (g: StoryGroup, i: number): MenuItem[] => [
    { label: "Ko'rish", icon: <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => setViewerStart(i) },
    { label: "Barchasini o'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, destructive: true, separatorBefore: true, onSelect: () => setDeleteTarget({ ids: g.stories.map((s) => s.id), label: `${pickName(g.product, lang)} — story (${g.stories.length} ta)` }) },
  ];

  return (
    <div>
      <PageHeader
        heading="Instagram"
        subheading="Do'kon kontenti — postlar, reels va stories"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" strokeWidth={2} /> Kontent qo'shish</Button>}
      />

      {feed.isPending && (
        <div className="space-y-6">
          <div className="flex gap-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[68px] w-[68px] rounded-full" />)}</div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-[var(--r-sm)]" />)}</div>
        </div>
      )}

      {feed.isError && <ErrorCard error={feed.error} onRetry={() => feed.refetch()} />}

      {feed.isSuccess && (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex gap-8">
              {([{ key: 'feed', label: 'Lenta', Icon: Grid3x3 }, { key: 'reels', label: 'Reels', Icon: Clapperboard }] as const).map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${tab === key ? 'text-text' : 'text-muted hover:text-text'}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} /> {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-40"><Select size="sm" options={productOptions} value={productFilter} onChange={setProductFilter} placeholder="Barcha mahsulotlar" searchable /></div>
              <div className="w-40"><Select size="sm" options={statusFilterOptions} value={statusFilter} onChange={setStatusFilter} placeholder="Barcha holatlar" /></div>
              <div className="w-40"><Select size="sm" options={sortOptions} value={sortMode} onChange={(v) => setSortMode(v as SortMode)} /></div>
            </div>
          </div>

          {items.length === 0 ? (
            <Card>
              <EmptyState
                heading={productFilter || statusFilter ? 'Filtrga mos kontent yo\'q' : "Hali Instagram kontenti yo'q"}
                hint={productFilter || statusFilter ? 'Filtrlarni o\'zgartiring' : "«Kontent qo'shish» orqali post, reel yoki story havolasini qo'shing"}
                action={<Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>Kontent qo'shish</Button>}
              />
            </Card>
          ) : (
            <>
              {/* Scheduled queue */}
              {scheduled.length > 0 && !statusFilter && (
                <div className="mb-6">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text"><CalendarClock className="h-4 w-4 text-accent-ink" strokeWidth={1.75} /> Rejalashtirilgan · {scheduled.length}</p>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {scheduled.map((item) => (
                      <div key={item.id} className="group relative w-40 shrink-0 overflow-hidden rounded-[var(--r-sm)] border border-border transition-colors hover:border-strong">
                        <button type="button" onClick={() => setLightbox(item)} className="block w-full text-left">
                          <div className="aspect-square bg-surface-2">
                            {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Gem className="h-6 w-6 text-muted/45" strokeWidth={1.25} /></div>}
                          </div>
                          <div className="p-2">
                            <p className="tnum flex items-center gap-1 text-2xs text-accent-ink"><CalendarClock className="h-3 w-3" strokeWidth={1.75} /> {item.scheduled_at ? formatDateTime(item.scheduled_at) : '—'}</p>
                            {item.caption && <p className="mt-0.5 line-clamp-1 text-2xs text-muted">{item.caption}</p>}
                          </div>
                        </button>
                        <ActionMenu items={tileMenu(item)} className="absolute right-1.5 top-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stories */}
              {storyGroups.length > 0 && (
                <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
                  {storyGroups.map((g, i) => <StoryRing key={g.product.id} group={g} onOpen={() => setViewerStart(i)} menu={ringMenu(g, i)} />)}
                </div>
              )}

              {/* Grid */}
              {grid.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">{tab === 'reels' ? "Reels yo'q" : "Kontent yo'q"}</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {grid.map((item) => <Tile key={item.id} item={item} reel={tab === 'reels'} highlighted={highlightId === item.id} onOpen={() => setLightbox(item)} menu={tileMenu(item)} />)}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Story viewer */}
      <AnimatePresence>
        {viewerStart != null && <StoryViewer groups={storyGroups} start={viewerStart} onClose={closeViewer} onEdit={requestEdit} onDelete={requestDelete} />}
      </AnimatePresence>

      {/* Post/Reel lightbox */}
      <Modal open={Boolean(lightbox)} onClose={closeLightbox} heading={lightbox ? pickName(lightbox.product, lang) : ''}>
        {lightbox && (
          <div className="space-y-4">
            <div className={`relative mx-auto overflow-hidden rounded-[var(--r-md)] bg-surface-2 ${lightbox.kind === 'reel' ? 'aspect-[9/16] max-h-[60vh]' : 'aspect-square'}`}>
              {lightbox.image_url ? <img src={lightbox.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Gem className="h-12 w-12 text-muted/45" strokeWidth={1} /></div>}
              {lightbox.kind === 'reel' && (
                <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 backdrop-blur"><Play className="h-6 w-6 fill-white text-white" /></span></span>
              )}
            </div>

            <button type="button" onClick={() => goToProduct(lightbox.product.id)} className="flex w-full items-center gap-2.5 rounded-[var(--r-sm)] border border-border p-2 text-left transition-colors hover:border-strong">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] bg-surface-2">
                {productThumb(lightbox.product.id) ? <img src={productThumb(lightbox.product.id)!} alt="" className="h-full w-full object-cover" /> : <Gem className="h-4 w-4 text-muted/50" strokeWidth={1.25} />}
              </span>
              <span className="min-w-0 flex-1"><span className="block text-2xs text-muted">Mahsulot</span><span className="block truncate text-sm font-medium text-text">{pickName(lightbox.product, lang)}</span></span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
            </button>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-text">{kindLabel[lightbox.kind]}</span>
                <Badge tone={statusChip(lightbox).tone}>{statusChip(lightbox).label}</Badge>
              </span>
              <span className="tnum flex items-center gap-1 text-muted">
                {lightbox.status === 'scheduled' && lightbox.scheduled_at ? <><CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} /> {formatDateTime(lightbox.scheduled_at)}</> : formatDate(lightbox.created_at)}
              </span>
            </div>

            <EngagementRow item={lightbox} className="justify-center border-y border-border py-2 !text-sm" />

            {lightbox.caption && <p className="whitespace-pre-wrap text-sm text-text">{lightbox.caption}</p>}

            {/* edit / delete — available on every item (post, reel, story still, planned) */}
            <div className="flex gap-2 border-t border-border pt-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => requestEdit(lightbox)}>
                <Pencil className="h-4 w-4" strokeWidth={1.5} /> Tahrirlash
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 !text-danger hover:!bg-danger-soft" onClick={() => requestDelete(lightbox)}>
                <Trash2 className="h-4 w-4" strokeWidth={1.5} /> O'chirish
              </Button>
            </div>

            {lightbox.permalink && (
              <a href={lightbox.permalink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-[var(--r-sm)] bg-accent-btn py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-btn-hover">
                <ExternalLink className="h-4 w-4" strokeWidth={2} /> Instagramda ochish
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Deep-link not found */}
      <Modal open={notFound} onClose={() => navigate('/social', { replace: true })} heading="Kontent topilmadi" size="md">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted">Bu kontent o'chirilgan yoki mavjud emas.</p>
          <Button variant="secondary" onClick={() => navigate('/social', { replace: true })}>Lentaga qaytish</Button>
        </div>
      </Modal>

      {/* Create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} heading="Instagram kontent qo'shish">
        <ContentForm onSaved={() => setCreateOpen(false)} onCancel={() => setCreateOpen(false)} />
      </Modal>

      {/* Edit */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} heading="Kontentni tahrirlash">
        {editing && <ContentEditForm item={editing} onDone={() => setEditing(null)} />}
      </Modal>

      {/* Delete */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        heading="Instagram media o'chirish"
        description={`«${deleteTarget?.label ?? ''}» o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await Promise.all(deleteTarget.ids.map((id) => del.mutateAsync(id)));
          toast.success("O'chirildi");
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
