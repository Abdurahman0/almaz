import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Clapperboard, ExternalLink, Eye, Gem, Grid3x3, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  ErrorCard,
  ImageUpload,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  toast,
  type MenuItem,
  type SelectOption,
} from '@/shared/ui';
import { pickName } from '@/shared/lib/localize';
import { formatDate } from '@/shared/lib/format';
import { useUiStore } from '@/shared/stores/ui';
import { useProducts } from '@/features/products/hooks';
import { useDeleteSocial, useSocialFeed, useUpdateSocial } from '../hooks';
import { StoryViewer, type StoryGroup } from '../components/StoryViewer';
import { ContentForm } from '../components/ContentForm';
import { contentStatus, kindLabel, type SocialItem } from '../api';

type Tab = 'feed' | 'reels';

/** ⋯ actions button used on tiles and story rings. */
function ActionMenu({ items, className }: { items: MenuItem[]; className?: string }) {
  return (
    <span className={className} onClick={(e) => e.stopPropagation()}>
      <DropdownMenu
        items={items}
        trigger={
          <button
            aria-label="Amallar"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            <span className="text-base leading-none">⋯</span>
          </button>
        }
      />
    </span>
  );
}

/** One story avatar with the Instagram gradient ring. */
function StoryRing({ group, onOpen, menu }: { group: StoryGroup; onOpen: () => void; menu: MenuItem[] }) {
  const lang = useUiStore((s) => s.lang);
  const cover = group.stories.find((s) => s.image_url)?.image_url ?? null;
  return (
    <div className="group relative flex w-[76px] shrink-0 flex-col items-center gap-1.5">
      <button onClick={onOpen} className="story-ring flex h-[68px] w-[68px] items-center justify-center rounded-full p-[2.5px]">
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface-2">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <Gem className="h-6 w-6 text-muted/60" strokeWidth={1.25} />
          )}
        </span>
      </button>
      <ActionMenu items={menu} className="absolute right-0 top-0 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="w-full truncate text-center text-2xs text-muted">{pickName(group.product, lang)}</span>
    </div>
  );
}

/** A feed/reel grid tile. Deep links briefly highlight it. */
function Tile({ item, reel, highlighted, onOpen, menu }: { item: SocialItem; reel: boolean; highlighted: boolean; onOpen: () => void; menu: MenuItem[] }) {
  const lang = useUiStore((s) => s.lang);
  return (
    <div
      id={`content-tile-${item.id}`}
      onClick={onOpen}
      className={`group relative cursor-pointer overflow-hidden rounded-[var(--r-sm)] bg-surface-2 ${reel ? 'aspect-[9/16]' : 'aspect-square'} ${
        highlighted ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''
      }`}
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Gem className="h-8 w-8 text-muted/45" strokeWidth={1.25} />
        </div>
      )}

      {item.kind === 'reel' && (
        <Clapperboard className="absolute right-2 top-2 h-4 w-4 text-white drop-shadow" strokeWidth={2} />
      )}
      {!item.is_active && (
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-2xs font-semibold text-white backdrop-blur">
          Nofaol
        </span>
      )}

      <ActionMenu items={menu} className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100" />

      <span className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/10 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="truncate text-left text-2xs font-semibold text-white">{pickName(item.product, lang)}</span>
      </span>
    </div>
  );
}

export default function SocialPage() {
  const lang = useUiStore((s) => s.lang);
  const navigate = useNavigate();
  const { contentId } = useParams();
  const feed = useSocialFeed();
  const products = useProducts();
  const update = useUpdateSocial();
  const del = useDeleteSocial();

  const [tab, setTab] = useState<Tab>('feed');
  const [productFilter, setProductFilter] = useState('');
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<SocialItem | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // create / edit / delete state
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SocialItem | null>(null);
  const [editActive, setEditActive] = useState(true);
  const [editImg, setEditImg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  const items = useMemo(() => feed.data ?? [], [feed.data]);
  const stories = useMemo(() => items.filter((i) => i.kind === 'story' && !i.is_expired), [items]);
  const feedItems = useMemo(() => items.filter((i) => i.kind !== 'story'), [items]);
  const reels = useMemo(() => items.filter((i) => i.kind === 'reel'), [items]);

  const storyGroups: StoryGroup[] = useMemo(() => {
    const map = new Map<string, StoryGroup>();
    for (const s of stories) {
      const g = map.get(s.product.id) ?? { product: s.product, stories: [] };
      g.stories.push(s);
      map.set(s.product.id, g);
    }
    return [...map.values()];
  }, [stories]);

  // Products that actually have content — the client-side product filter (there is
  // no global content list with a ?product_id param; media is per-product only).
  const filterOptions: SelectOption[] = useMemo(() => {
    const seen = new Map<string, string>();
    for (const i of items) if (!seen.has(i.product.id)) seen.set(i.product.id, pickName(i.product, lang));
    return [{ value: '', label: 'Barcha mahsulotlar' }, ...[...seen].map(([value, label]) => ({ value, label }))];
  }, [items, lang]);

  const grid = tab === 'reels' ? reels : feedItems;
  const visibleGrid = productFilter ? grid.filter((i) => i.product.id === productFilter) : grid;

  const productThumb = (id: string) => products.data?.find((p) => p.id === id)?.media?.[0]?.image_url ?? null;
  const goToProduct = (id: string) => navigate(`/products?product=${id}`);

  // Deep link (/social/content/:id) → open that exact item + scroll/highlight it.
  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!contentId || !feed.isSuccess || openedRef.current === contentId) return;
    openedRef.current = contentId;
    const item = items.find((i) => i.id === contentId);
    if (!item) return; // deleted/unknown — stay on the feed
    if (item.kind === 'story') {
      const gi = storyGroups.findIndex((g) => g.stories.some((s) => s.id === item.id));
      if (gi >= 0) setViewerStart(gi);
    } else {
      setTab(item.kind === 'reel' ? 'reels' : 'feed');
      setProductFilter('');
      setLightbox(item);
    }
    setHighlightId(item.id);
    requestAnimationFrame(() =>
      document.getElementById(`content-tile-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
    const t = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(t);
  }, [contentId, feed.isSuccess, items, storyGroups]);

  // Closing a deep-linked item cleans the URL back to the feed (so browser-back works).
  const clearDeepLink = () => { if (contentId) navigate('/social', { replace: true }); };
  const closeLightbox = () => { setLightbox(null); clearDeepLink(); };
  const closeViewer = () => { setViewerStart(null); clearDeepLink(); };

  const openEdit = (item: SocialItem) => {
    setEditing(item);
    setEditActive(item.is_active);
    setEditImg(item.image_url ?? '');
  };

  const tileMenu = (item: SocialItem): MenuItem[] => [
    { label: "Ko'rish", icon: <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => setLightbox(item) },
    { label: 'Tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => openEdit(item) },
    {
      label: "O'chirish",
      icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />,
      destructive: true,
      separatorBefore: true,
      onSelect: () => setDeleteTarget({ ids: [item.id], label: `${kindLabel[item.kind]} — ${pickName(item.product, lang)}` }),
    },
  ];
  const ringMenu = (g: StoryGroup, i: number): MenuItem[] => [
    { label: "Ko'rish", icon: <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => setViewerStart(i) },
    {
      label: "O'chirish",
      icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />,
      destructive: true,
      separatorBefore: true,
      onSelect: () => setDeleteTarget({ ids: g.stories.map((s) => s.id), label: `${pickName(g.product, lang)} — story (${g.stories.length} ta)` }),
    },
  ];

  return (
    <div>
      <PageHeader
        heading="Instagram"
        subheading="Do'kon kontenti — postlar, reels va stories"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Kontent qo'shish
          </Button>
        }
      />

      {feed.isPending && (
        <div className="space-y-6">
          <div className="flex gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[68px] w-[68px] rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-[var(--r-sm)]" />
            ))}
          </div>
        </div>
      )}

      {feed.isError && <ErrorCard error={feed.error} onRetry={() => feed.refetch()} />}

      {feed.isSuccess && items.length === 0 && (
        <Card>
          <EmptyState
            heading="Hali Instagram kontenti yo'q"
            hint="«Kontent qo'shish» orqali Instagram post, reel yoki story havolasini qo'shing"
            action={<Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>Kontent qo'shish</Button>}
          />
        </Card>
      )}

      {feed.isSuccess && items.length > 0 && (
        <>
          {storyGroups.length > 0 && (
            <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
              {storyGroups.map((g, i) => (
                <StoryRing key={g.product.id} group={g} onOpen={() => setViewerStart(i)} menu={ringMenu(g, i)} />
              ))}
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <div className="flex gap-8">
              {([
                { key: 'feed', label: 'Lenta', Icon: Grid3x3 },
                { key: 'reels', label: 'Reels', Icon: Clapperboard },
              ] as const).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`-mt-px flex items-center gap-1.5 border-t-2 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    tab === key ? 'border-text text-text' : 'border-transparent text-muted hover:text-text'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} /> {label}
                </button>
              ))}
            </div>
            <div className="w-52">
              <Select size="sm" options={filterOptions} value={productFilter} onChange={setProductFilter} placeholder="Barcha mahsulotlar" searchable />
            </div>
          </div>

          {visibleGrid.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              {productFilter ? 'Bu mahsulot uchun kontent yo\'q' : tab === 'reels' ? "Reels yo'q" : "Kontent yo'q"}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {visibleGrid.map((item) => (
                <Tile
                  key={item.id}
                  item={item}
                  reel={tab === 'reels'}
                  highlighted={highlightId === item.id}
                  onOpen={() => setLightbox(item)}
                  menu={tileMenu(item)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Story viewer */}
      <AnimatePresence>
        {viewerStart != null && (
          <StoryViewer groups={storyGroups} start={viewerStart} onClose={closeViewer} />
        )}
      </AnimatePresence>

      {/* Post/Reel lightbox */}
      <Modal open={Boolean(lightbox)} onClose={closeLightbox} heading={lightbox ? pickName(lightbox.product, lang) : ''}>
        {lightbox && (
          <div className="space-y-4">
            <div className={`relative mx-auto overflow-hidden rounded-[var(--r-md)] bg-surface-2 ${lightbox.kind === 'reel' ? 'aspect-[9/16] max-h-[60vh]' : 'aspect-square'}`}>
              {lightbox.image_url ? (
                <img src={lightbox.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gem className="h-12 w-12 text-muted/45" strokeWidth={1} />
                </div>
              )}
              {lightbox.kind === 'reel' && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 backdrop-blur">
                    <Play className="h-6 w-6 fill-white text-white" />
                  </span>
                </span>
              )}
            </div>

            {/* Product chip → deep-links back to the product detail */}
            <button
              type="button"
              onClick={() => goToProduct(lightbox.product.id)}
              className="flex w-full items-center gap-2.5 rounded-[var(--r-sm)] border border-border p-2 text-left transition-colors hover:border-strong"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] bg-surface-2">
                {productThumb(lightbox.product.id) ? (
                  <img src={productThumb(lightbox.product.id)!} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Gem className="h-4 w-4 text-muted/50" strokeWidth={1.25} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xs text-muted">Mahsulot</span>
                <span className="block truncate text-sm font-medium text-text">{pickName(lightbox.product, lang)}</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
            </button>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-text">{kindLabel[lightbox.kind]}</span>
                <Badge tone={contentStatus(lightbox).tone}>{contentStatus(lightbox).label}</Badge>
              </span>
              <span className="tnum text-muted">{formatDate(lightbox.created_at)}</span>
            </div>
            {lightbox.permalink && (
              <a
                href={lightbox.permalink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-[var(--r-sm)] bg-accent-btn py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-btn-hover"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2} /> Instagramda ochish
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} heading="Instagram kontent qo'shish">
        <ContentForm onDone={() => setCreateOpen(false)} />
      </Modal>

      {/* Edit */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} heading="Instagram media tahrirlash">
        {editing && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {kindLabel[editing.kind]} · {pickName(editing.product, lang)}
            </p>
            <ImageUpload label="Rasm" value={editImg || null} onChange={(url) => setEditImg(url ?? '')} />
            <Checkbox checked={editActive} onCheckedChange={setEditActive} label="Faol (lentada ko'rsatiladi)" />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditing(null)}>Bekor qilish</Button>
              <Button
                loading={update.isPending}
                onClick={() =>
                  update.mutate(
                    { id: editing.id, body: { is_active: editActive, image_url: editImg.trim() || null } },
                    {
                      onSuccess: () => { setEditing(null); toast.success('Saqlandi'); },
                      onError: () => toast.error('Xatolik'),
                    },
                  )
                }
              >
                Saqlash
              </Button>
            </div>
          </div>
        )}
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
