import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Clapperboard, ExternalLink, Eye, Gem, Grid3x3, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  ErrorCard,
  Input,
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
import type { ApiError } from '@/shared/api/client';
import { useProducts } from '@/features/products/hooks';
import { useAddSocial, useDeleteSocial, useSocialFeed, useUpdateSocial } from '../hooks';
import { StoryViewer, type StoryGroup } from '../components/StoryViewer';
import type { SocialItem } from '../api';

type Tab = 'feed' | 'reels';

const kindLabel: Record<string, string> = { post: 'Post', reel: 'Reel', story: 'Story' };

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

/** A feed/reel grid tile. */
function Tile({ item, reel, onOpen, menu }: { item: SocialItem; reel: boolean; onOpen: () => void; menu: MenuItem[] }) {
  const lang = useUiStore((s) => s.lang);
  return (
    <div
      onClick={onOpen}
      className={`group relative cursor-pointer overflow-hidden rounded-[var(--r-sm)] bg-surface-2 ${reel ? 'aspect-[9/16]' : 'aspect-square'}`}
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

      {item.media_type === 'reel' && (
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

const emptyDraft = { productId: '', link: '', imageUrl: '' };

export default function SocialPage() {
  const lang = useUiStore((s) => s.lang);
  const feed = useSocialFeed();
  const products = useProducts();
  const add = useAddSocial();
  const update = useUpdateSocial();
  const del = useDeleteSocial();

  const [tab, setTab] = useState<Tab>('feed');
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<SocialItem | null>(null);

  // create / edit / delete state
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState<SocialItem | null>(null);
  const [editActive, setEditActive] = useState(true);
  const [editImg, setEditImg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  const items = feed.data ?? [];
  const stories = useMemo(() => items.filter((i) => i.media_type === 'story' && !i.is_expired), [items]);
  const feedItems = useMemo(() => items.filter((i) => i.media_type !== 'story'), [items]);
  const reels = useMemo(() => items.filter((i) => i.media_type === 'reel'), [items]);

  const storyGroups: StoryGroup[] = useMemo(() => {
    const map = new Map<string, StoryGroup>();
    for (const s of stories) {
      const g = map.get(s.product.id) ?? { product: s.product, stories: [] };
      g.stories.push(s);
      map.set(s.product.id, g);
    }
    return [...map.values()];
  }, [stories]);

  const productOptions: SelectOption[] = (products.data ?? []).map((p) => ({ value: p.id, label: pickName(p, lang) }));
  const grid = tab === 'reels' ? reels : feedItems;

  const openEdit = (item: SocialItem) => {
    setEditing(item);
    setEditActive(item.is_active);
    setEditImg(item.image_url ?? '');
  };

  const openCreate = () => {
    setDraft(emptyDraft);
    setCreateOpen(true);
  };
  const submitCreate = () => {
    add.mutate(
      { productId: draft.productId, body: { link: draft.link.trim(), image_url: draft.imageUrl.trim() || null } },
      {
        onSuccess: () => { setCreateOpen(false); toast.success("Instagram havolasi qo'shildi"); },
        onError: (e) => toast.error((e as unknown as ApiError).message || "Havola noto'g'ri"),
      },
    );
  };

  const tileMenu = (item: SocialItem): MenuItem[] => [
    { label: "Ko'rish", icon: <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => setLightbox(item) },
    { label: 'Tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: () => openEdit(item) },
    {
      label: "O'chirish",
      icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />,
      destructive: true,
      separatorBefore: true,
      onSelect: () => setDeleteTarget({ ids: [item.id], label: `${kindLabel[item.media_type] ?? ''} — ${pickName(item.product, lang)}` }),
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
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Post qo'shish
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
            hint="«Post qo'shish» tugmasi orqali Instagram post/reel/story havolasini qo'shing"
            action={<Button variant="secondary" size="sm" onClick={openCreate}>Post qo'shish</Button>}
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

          <div className="mb-4 flex justify-center gap-12 border-t border-border">
            {([
              { key: 'feed', label: 'Lenta', Icon: Grid3x3 },
              { key: 'reels', label: 'Reels', Icon: Clapperboard },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`-mt-px flex items-center gap-1.5 border-t-2 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  tab === key ? 'border-text text-text' : 'border-transparent text-muted hover:text-text'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} /> {label}
              </button>
            ))}
          </div>

          {grid.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{tab === 'reels' ? "Reels yo'q" : "Post yo'q"}</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {grid.map((item) => (
                <Tile key={item.id} item={item} reel={tab === 'reels'} onOpen={() => setLightbox(item)} menu={tileMenu(item)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Story viewer */}
      <AnimatePresence>
        {viewerStart != null && (
          <StoryViewer groups={storyGroups} start={viewerStart} onClose={() => setViewerStart(null)} />
        )}
      </AnimatePresence>

      {/* Post/Reel lightbox */}
      <Modal open={Boolean(lightbox)} onClose={() => setLightbox(null)} heading={lightbox ? pickName(lightbox.product, lang) : ''}>
        {lightbox && (
          <div className="space-y-4">
            <div className={`relative mx-auto overflow-hidden rounded-[var(--r-md)] bg-surface-2 ${lightbox.media_type === 'reel' ? 'aspect-[9/16] max-h-[60vh]' : 'aspect-square'}`}>
              {lightbox.image_url ? (
                <img src={lightbox.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gem className="h-12 w-12 text-muted/45" strokeWidth={1} />
                </div>
              )}
              {lightbox.media_type === 'reel' && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 backdrop-blur">
                    <Play className="h-6 w-6 fill-white text-white" />
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-text">
                {kindLabel[lightbox.media_type] ?? lightbox.media_type}
              </span>
              <span className="tnum">{formatDate(lightbox.created_at)}</span>
            </div>
            {lightbox.permalink && (
              <a
                href={lightbox.permalink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-accent-btn py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-btn-hover"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2} /> Instagramda ochish
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} heading="Instagram post qo'shish">
        <div className="space-y-4">
          <Select
            label="Mahsulot"
            placeholder="Mahsulotni tanlang"
            options={productOptions}
            value={draft.productId}
            onChange={(v) => setDraft((d) => ({ ...d, productId: v }))}
            searchable
          />
          <Input
            label="Instagram havolasi"
            placeholder="https://www.instagram.com/p/... , /reel/... yoki /stories/.../"
            value={draft.link}
            onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
          />
          <Input
            label="Rasm havolasi (ixtiyoriy)"
            placeholder="https://.../thumbnail.jpg"
            value={draft.imageUrl}
            onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
          />
          <p className="text-2xs text-muted">Tur (post / reel / story) havoladan avtomatik aniqlanadi.</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Bekor qilish</Button>
            <Button onClick={submitCreate} loading={add.isPending} disabled={!draft.productId || !draft.link.trim()}>
              Qo'shish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} heading="Instagram media tahrirlash">
        {editing && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {kindLabel[editing.media_type] ?? editing.media_type} · {pickName(editing.product, lang)}
            </p>
            <Input
              label="Rasm havolasi"
              placeholder="https://.../thumbnail.jpg"
              value={editImg}
              onChange={(e) => setEditImg(e.target.value)}
            />
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
