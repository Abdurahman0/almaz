import { listInstagramMedia, listProducts } from '@/features/products/api';
import type { ContentStatus, InstagramMediaListParams, InstagramMediaOut, ProductOut } from '@/shared/api/types';

export type SocialKind = 'post' | 'reel' | 'story';

export interface SocialItem extends InstagramMediaOut {
  /** The product this Instagram media is attached to (for label + navigation). */
  product: Pick<ProductOut, 'id' | 'name_uz' | 'name_ru'>;
  /**
   * Real content type derived from the permalink. The backend mis-labels reels
   * as `post`, so we don't trust `media_type` for categorisation — the URL is
   * the source of truth.
   */
  kind: SocialKind;
}

export const kindLabel: Record<SocialKind, string> = { post: 'Post', reel: 'Reel', story: 'Story' };

export const contentStatusLabel: Record<ContentStatus, string> = {
  draft: 'Qoralama',
  scheduled: 'Rejalashtirilgan',
  published: "E'lon qilingan",
};

/** Status chip label + tone from the real `status` enum (expired stories keep their
 *  own treatment). */
export function statusChip(item: Pick<InstagramMediaOut, 'status' | 'is_expired' | 'media_type'>): {
  label: string;
  tone: 'success' | 'gold' | 'muted' | 'danger';
} {
  if (item.media_type === 'story' && item.is_expired) return { label: "Muddati o'tgan", tone: 'danger' };
  if (item.status === 'published') return { label: contentStatusLabel.published, tone: 'success' };
  if (item.status === 'scheduled') return { label: contentStatusLabel.scheduled, tone: 'gold' };
  return { label: contentStatusLabel.draft, tone: 'muted' };
}

/** Engagement is measured only once IG syncs — null means "not measured" (hide the
 *  block); a number (incl. 0) is real and shown. */
export function hasEngagement(item: Pick<InstagramMediaOut, 'like_count' | 'view_count' | 'comment_count'>): boolean {
  return item.like_count != null || item.view_count != null || item.comment_count != null;
}

/** Post / reel / story from an Instagram URL (or a bare shortcode/ref). */
export function deriveKind(link: string | null | undefined, fallback?: string | null): SocialKind {
  const p = (link ?? '').toLowerCase();
  if (/\/reels?\//.test(p) || /\/reel/.test(p)) return 'reel';
  if (/\/stories?\//.test(p) || /\/story/.test(p)) return 'story';
  if (/\/p\//.test(p)) return 'post';
  if (fallback === 'reel' || fallback === 'story' || fallback === 'post') return fallback;
  return 'post';
}

/** Attach the product (name) + derived kind to a raw media item. */
export function enrichMedia(m: InstagramMediaOut, products: Map<string, Pick<ProductOut, 'id' | 'name_uz' | 'name_ru'>>): SocialItem {
  return {
    ...m,
    product: products.get(m.product_id) ?? { id: m.product_id, name_uz: "Noma'lum mahsulot", name_ru: null },
    kind: deriveKind(m.permalink, m.media_type),
  };
}

/**
 * Feed via the global `GET /catalog/instagram-media` (one call) joined with the
 * product list for names — no more N+1. `params` (product_id / status / media_type)
 * filter server-side. Newest first.
 */
export async function fetchSocialFeed(params: InstagramMediaListParams = {}): Promise<SocialItem[]> {
  const [media, productPage] = await Promise.all([
    listInstagramMedia(params),
    listProducts({ limit: 200 }),
  ]);
  const pmap = new Map(productPage.items.map((p) => [p.id, p] as const));
  return media
    .map((m) => enrichMedia(m, pmap))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
