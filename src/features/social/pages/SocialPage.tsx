import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Clapperboard, ExternalLink, Gem, Grid3x3, Play } from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorCard,
  Modal,
  PageHeader,
  Skeleton,
} from '@/shared/ui';
import { pickName } from '@/shared/lib/localize';
import { formatDate } from '@/shared/lib/format';
import { useUiStore } from '@/shared/stores/ui';
import { useSocialFeed } from '../hooks';
import { StoryViewer, type StoryGroup } from '../components/StoryViewer';
import type { SocialItem } from '../api';

type Tab = 'feed' | 'reels';

const kindLabel: Record<string, string> = { post: 'Post', reel: 'Reel', story: 'Story' };

/** One story avatar with the Instagram gradient ring. */
function StoryRing({ group, onOpen }: { group: StoryGroup; onOpen: () => void }) {
  const lang = useUiStore((s) => s.lang);
  const cover = group.stories.find((s) => s.image_url)?.image_url ?? null;
  return (
    <button onClick={onOpen} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5">
      <span className="story-ring flex h-[68px] w-[68px] items-center justify-center rounded-full p-[2.5px]">
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface-2">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <Gem className="h-6 w-6 text-muted/60" strokeWidth={1.25} />
          )}
        </span>
      </span>
      <span className="w-full truncate text-center text-2xs text-muted">{pickName(group.product, lang)}</span>
    </button>
  );
}

/** A feed/reel grid tile. */
function Tile({ item, reel, onOpen }: { item: SocialItem; reel: boolean; onOpen: () => void }) {
  const lang = useUiStore((s) => s.lang);
  return (
    <button
      onClick={onOpen}
      className={`group relative overflow-hidden rounded-[var(--r-sm)] bg-surface-2 ${reel ? 'aspect-[9/16]' : 'aspect-square'}`}
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

      {/* reel indicator (top-right), Instagram-style */}
      {item.media_type === 'reel' && (
        <Clapperboard className="absolute right-2 top-2 h-4 w-4 text-white drop-shadow" strokeWidth={2} />
      )}

      {/* hover overlay: product name + open hint (no fake engagement counts) */}
      <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/10 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="truncate text-left text-2xs font-semibold text-white">{pickName(item.product, lang)}</span>
      </span>
    </button>
  );
}

export default function SocialPage() {
  const lang = useUiStore((s) => s.lang);
  const feed = useSocialFeed();
  const [tab, setTab] = useState<Tab>('feed');
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<SocialItem | null>(null);

  const items = feed.data ?? [];
  const stories = useMemo(() => items.filter((i) => i.media_type === 'story' && !i.is_expired), [items]);
  const feedItems = useMemo(() => items.filter((i) => i.media_type !== 'story'), [items]);
  const reels = useMemo(() => items.filter((i) => i.media_type === 'reel'), [items]);

  // group stories by product for the ring carousel + viewer
  const storyGroups: StoryGroup[] = useMemo(() => {
    const map = new Map<string, StoryGroup>();
    for (const s of stories) {
      const g = map.get(s.product.id) ?? { product: s.product, stories: [] };
      g.stories.push(s);
      map.set(s.product.id, g);
    }
    return [...map.values()];
  }, [stories]);

  const grid = tab === 'reels' ? reels : feedItems;

  return (
    <div>
      <PageHeader heading="Instagram" subheading="Do'kon kontenti — postlar, reels va stories" />

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
            hint="Mahsulot tahrirlashda Instagram post/reel/story havolasini qo'shing — bu yerda ko'rinadi"
          />
        </Card>
      )}

      {feed.isSuccess && items.length > 0 && (
        <>
          {/* Stories row */}
          {storyGroups.length > 0 && (
            <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
              {storyGroups.map((g, i) => (
                <StoryRing key={g.product.id} group={g} onOpen={() => setViewerStart(i)} />
              ))}
            </div>
          )}

          {/* Instagram-profile-style tab bar */}
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
            <p className="py-10 text-center text-sm text-muted">
              {tab === 'reels' ? "Reels yo'q" : "Post yo'q"}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {grid.map((item) => (
                <Tile key={item.id} item={item} reel={tab === 'reels'} onOpen={() => setLightbox(item)} />
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
            <div className={`relative overflow-hidden rounded-[var(--r-md)] bg-surface-2 ${lightbox.media_type === 'reel' ? 'aspect-[9/16] max-h-[60vh]' : 'aspect-square'} mx-auto`}>
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
    </div>
  );
}
