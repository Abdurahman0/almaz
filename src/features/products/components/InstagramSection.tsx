import { useState } from 'react';
import { AlertTriangle, ExternalLink, Film, Image as ImageIcon, Instagram, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Checkbox, Input, SkeletonRows, toast } from '@/shared/ui';
import type { ApiError } from '@/shared/api/client';
import type { InstagramMediaOut } from '@/shared/api/types';
import {
  useAddProductInstagram,
  useDeleteInstagramMedia,
  useProductInstagram,
  useUpdateInstagramMedia,
} from '../hooks';

const typeLabels: Record<string, string> = { post: 'Post', reel: 'Reel', story: 'Story' };

function TypeIcon({ t }: { t: string }) {
  if (t === 'reel') return <Film className="h-3.5 w-3.5" strokeWidth={1.75} />;
  if (t === 'story') return <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />;
  return <Instagram className="h-3.5 w-3.5" strokeWidth={1.75} />;
}

function MediaRow({ m, productId }: { m: InstagramMediaOut; productId: string }) {
  const update = useUpdateInstagramMedia(productId);
  const remove = useDeleteInstagramMedia(productId);
  const ref = m.shortcode ?? m.story_ref ?? '';
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
        {m.image_url ? <img src={m.image_url} alt="" className="h-full w-full object-cover" /> : <TypeIcon t={m.media_type} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text">
          {typeLabels[m.media_type] ?? m.media_type}
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
        onClick={() => remove.mutate(m.id, { onError: () => toast.error("O'chirishда xatolik") })}
        className="rounded p-1.5 text-muted hover:text-danger"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** Admin Instagram section: attach post/story links to a product. The backend
 *  parses the type (post/reel/story) and ref from the link automatically. */
export function InstagramSection({ productId }: { productId: string }) {
  const list = useProductInstagram(productId);
  const add = useAddProductInstagram(productId);
  const [link, setLink] = useState('');

  const submit = () => {
    const v = link.trim();
    if (!v) return;
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
        <span className="text-xs font-semibold text-muted">Instagram post / story</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="https://www.instagram.com/p/... yoki /stories/.../"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
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
        <p className="text-2xs text-muted">Post yoki story havolasi qo'shilmagan.</p>
      )}
    </div>
  );
}
