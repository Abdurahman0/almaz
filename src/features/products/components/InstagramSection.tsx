import { useState, type ReactNode } from 'react';
import { AlertTriangle, ExternalLink, Film, Image as ImageIcon, Instagram, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Checkbox, Input, Select, SkeletonRows, toast, type SelectOption } from '@/shared/ui';
import type { ApiError } from '@/shared/api/client';
import type { InstagramMediaOut, InstagramMediaType } from '@/shared/api/types';
import {
  useAddProductInstagram,
  useDeleteInstagramMedia,
  useProductInstagram,
  useUpdateInstagramMedia,
} from '../hooks';

const typeLabels: Record<string, string> = { post: 'Post', reel: 'Reel', story: 'Story' };

/** Per-type hint: placeholder + the URL segment the backend parses the type from.
 *  The backend derives the stored type from the link (a sent media_type is ignored),
 *  so the dropdown validates the pasted link matches the chosen kind before submit. */
const TYPE_HINTS: Record<InstagramMediaType, { placeholder: string; needle: string; hint: string }> = {
  post: { placeholder: 'https://www.instagram.com/p/...', needle: '/p/', hint: '/p/... havolasi' },
  reel: { placeholder: 'https://www.instagram.com/reel/...', needle: '/reel/', hint: '/reel/... havolasi' },
  story: { placeholder: 'https://www.instagram.com/stories/.../', needle: '/stories/', hint: '/stories/... havolasi' },
};

function TypeIcon({ t }: { t: string }) {
  if (t === 'reel') return <Film className="h-3.5 w-3.5" strokeWidth={1.75} />;
  if (t === 'story') return <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />;
  return <Instagram className="h-3.5 w-3.5" strokeWidth={1.75} />;
}

/** Backend stores /reel/ links as media_type "post" — recover the real kind from the
 *  permalink so a reel is shown as a reel, not a post. */
function displayType(m: InstagramMediaOut): string {
  if (m.permalink?.toLowerCase().includes('/reel/')) return 'reel';
  return m.media_type;
}

/** A pasted link matches the chosen type when its URL carries the type's path segment.
 *  Bare shortcodes / story_refs (not URLs) pass through for the backend to parse. */
function linkMatchesType(link: string, type: InstagramMediaType): boolean {
  const l = link.toLowerCase();
  if (!l.includes('instagram.com') && !l.startsWith('http')) return true;
  return l.includes(TYPE_HINTS[type].needle);
}

function MediaRow({ m, productId }: { m: InstagramMediaOut; productId: string }) {
  const update = useUpdateInstagramMedia(productId);
  const remove = useDeleteInstagramMedia(productId);
  const ref = m.shortcode ?? m.story_ref ?? '';
  const dt = displayType(m);
  return (
    <div className="flex items-center gap-3 rounded-[var(--r-sm)] border border-border px-3 py-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] border border-border bg-surface-2">
        {m.image_url ? <img src={m.image_url} alt="" className="h-full w-full object-cover" /> : <TypeIcon t={dt} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text">
          {typeLabels[dt] ?? dt}
          {m.media_type === 'story' && m.is_expired && (
            <Badge tone="danger">
              <AlertTriangle className="mr-1 h-3 w-3" strokeWidth={2} /> Muddati o'tgan
            </Badge>
          )}
        </p>
        {m.permalink ? (
          <a
            href={m.permalink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 truncate text-2xs text-accent-ink hover:underline"
          >
            <span className="truncate">{ref || m.permalink}</span>
            <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
          </a>
        ) : (
          <p className="truncate text-2xs text-muted">{ref}</p>
        )}
      </div>
      <Checkbox
        checked={m.is_active}
        onCheckedChange={(v) =>
          update.mutate({ id: m.id, body: { is_active: v } }, { onError: () => toast.error('Xatolik') })
        }
        label="Faol"
      />
      <button
        type="button"
        aria-label="O'chirish"
        onClick={() => remove.mutate(m.id, { onError: () => toast.error("O'chirishda xatolik") })}
        className="rounded p-1.5 text-muted hover:text-danger"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** Admin Instagram section: attach post/reel/story links to a product. The user picks
 *  the kind (which sets the placeholder + validates the link); the backend then parses
 *  the type and ref from the link itself. */
export function InstagramSection({ productId }: { productId: string }) {
  const list = useProductInstagram(productId);
  const add = useAddProductInstagram(productId);
  const [type, setType] = useState<InstagramMediaType>('post');
  const [link, setLink] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const typeOptions: SelectOption[] = (['post', 'reel', 'story'] as InstagramMediaType[]).map((t): SelectOption => ({
    value: t,
    label: typeLabels[t],
    icon: (<TypeIcon t={t} />) as ReactNode,
  }));

  const submit = () => {
    const v = link.trim();
    if (!v) return;
    if (!linkMatchesType(v, type)) {
      setErr(`Havola turi mos emas — ${typeLabels[type]} uchun ${TYPE_HINTS[type].hint} kiriting`);
      return;
    }
    setErr(null);
    add.mutate(
      { link: v },
      {
        onSuccess: () => { setLink(''); toast.success("Instagram havolasi qo'shildi"); },
        onError: (e) => toast.error((e as unknown as ApiError).message || "Havola noto'g'ri"),
      },
    );
  };

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <Instagram className="h-4 w-4 text-muted" strokeWidth={1.75} />
        <span className="text-xs font-semibold text-muted">Instagram post / reel / story</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="w-32 shrink-0">
          <Select
            size="sm"
            options={typeOptions}
            value={type}
            onChange={(v) => { setType(v as InstagramMediaType); setErr(null); }}
          />
        </div>
        <div className="min-w-[12rem] flex-1">
          <Input
            placeholder={TYPE_HINTS[type].placeholder}
            value={link}
            onChange={(e) => { setLink(e.target.value); if (err) setErr(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            error={err ?? undefined}
          />
        </div>
        <Button type="button" variant="secondary" onClick={submit} loading={add.isPending} disabled={!link.trim()}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Qo'shish
        </Button>
      </div>

      {list.isPending && <SkeletonRows rows={1} />}
      {list.isSuccess && list.data.length > 0 && (
        <div className="space-y-2">
          {list.data.map((m) => (
            <MediaRow key={m.id} m={m} productId={productId} />
          ))}
        </div>
      )}
      {list.isSuccess && list.data.length === 0 && (
        <p className="text-2xs text-muted">Post, reel yoki story havolasi qo'shilmagan.</p>
      )}
    </div>
  );
}
