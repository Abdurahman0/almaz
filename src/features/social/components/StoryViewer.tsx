import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, Gem, Pencil, Trash2, X } from 'lucide-react';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import type { SocialItem } from '../api';

export interface StoryGroup {
  product: SocialItem['product'];
  stories: SocialItem[];
}

const STORY_MS = 5000;

/** Full-screen Instagram-style story viewer: segmented progress, tap to move. */
export function StoryViewer({
  groups,
  start,
  onClose,
  onEdit,
  onDelete,
}: {
  groups: StoryGroup[];
  start: number;
  onClose: () => void;
  /** Edit/delete the story currently on screen (the caller closes the viewer). */
  onEdit?: (story: SocialItem) => void;
  onDelete?: (story: SocialItem) => void;
}) {
  const lang = useUiStore((s) => s.lang);
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);

  const group = groups[gi];
  const story = group?.stories[si];

  const advance = useCallback(() => {
    setSi((s) => {
      if (group && s + 1 < group.stories.length) return s + 1;
      setGi((g) => {
        if (g + 1 < groups.length) return g + 1;
        onClose();
        return g;
      });
      return 0;
    });
  }, [group, groups.length, onClose]);

  const back = useCallback(() => {
    setSi((s) => {
      if (s > 0) return s - 1;
      setGi((g) => Math.max(0, g - 1));
      return 0;
    });
  }, []);

  // auto-advance timer (restarts on every story) — paced regardless of motion prefs
  useEffect(() => {
    if (!story) return;
    const t = window.setTimeout(advance, STORY_MS);
    return () => window.clearTimeout(t);
  }, [gi, si, story, advance]);

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') advance();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, back, onClose]);

  if (!group || !story) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* prev group arrow (desktop) */}
      {gi > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setGi((g) => g - 1); setSi(0); }}
          className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:block"
          aria-label="Oldingi"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </button>
      )}

      <div
        className="relative flex aspect-[9/16] max-h-[92vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[var(--r-lg)] bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* segmented progress bars */}
        <div className="absolute inset-x-2 top-2 z-20 flex gap-1">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              {i < si && <div className="h-full w-full bg-white" />}
              {i === si && (
                <motion.div
                  key={`${gi}-${si}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: STORY_MS / 1000, ease: 'linear' }}
                  className="h-full bg-white"
                />
              )}
            </div>
          ))}
        </div>

        {/* header: product avatar + name + close */}
        <div className="absolute inset-x-0 top-5 z-20 flex items-center gap-2.5 px-3">
          <span className="story-ring flex h-9 w-9 items-center justify-center rounded-full">
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-neutral-900 bg-neutral-800">
              {story.image_url ? (
                <img src={story.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Gem className="h-4 w-4 text-white/70" strokeWidth={1.5} />
              )}
            </span>
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
            {pickName(story.product, lang)}
          </span>
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(story); }} aria-label="Tahrirlash" className="rounded-full p-1 text-white/90 hover:bg-white/15">
              <Pencil className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          )}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(story); }} aria-label="O'chirish" className="rounded-full p-1 text-white/90 hover:bg-white/15">
              <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          )}
          <button onClick={onClose} aria-label="Yopish" className="rounded-full p-1 text-white/90 hover:bg-white/15">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* media */}
        {story.image_url ? (
          <img src={story.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/40">
            <Gem className="h-16 w-16" strokeWidth={1} />
          </div>
        )}

        {/* tap zones */}
        <button className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-default" aria-label="Orqaga" onClick={back} />
        <button className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-default" aria-label="Keyingi" onClick={advance} />

        {/* open on instagram */}
        {story.permalink && (
          <a
            href={story.permalink}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent py-4 text-sm font-semibold text-white"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2} /> Instagramda ochish
          </a>
        )}
      </div>

      {/* next group arrow (desktop) */}
      {gi < groups.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setGi((g) => g + 1); setSi(0); }}
          className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:block"
          aria-label="Keyingi"
        >
          <ChevronRight className="h-6 w-6" strokeWidth={2} />
        </button>
      )}
    </motion.div>,
    document.body,
  );
}
