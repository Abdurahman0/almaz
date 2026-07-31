import { listProductInstagram, listProducts } from '@/features/products/api';
import type { InstagramMediaOut, ProductOut } from '@/shared/api/types';

export type SocialKind = 'post' | 'reel' | 'story';

export interface SocialItem extends InstagramMediaOut {
  /** The product this Instagram media is attached to (for label + navigation). */
  product: Pick<ProductOut, 'id' | 'name_uz' | 'name_ru'>;
  /**
   * Real content type derived from the permalink. The backend mis-labels reels
   * as `post`, so we don't trust `media_type` for categorisation — the URL is
   * the source of truth. (Reel links without an image are now accepted; the old
   * 500 is fixed — verified 2026-07-29.)
   */
  kind: SocialKind;
}

export const kindLabel: Record<SocialKind, string> = { post: 'Post', reel: 'Reel', story: 'Story' };

/** Publish status derived from the thin API fields (there is no draft/scheduled/
 *  published enum — only is_active, plus is_expired for stories). */
export function contentStatus(item: Pick<InstagramMediaOut, 'is_active' | 'is_expired' | 'media_type'>): {
  label: string;
  tone: 'success' | 'muted' | 'danger';
} {
  if (item.media_type === 'story' && item.is_expired) return { label: "Muddati o'tgan", tone: 'danger' };
  if (!item.is_active) return { label: 'Qoralama', tone: 'muted' };
  return { label: "E'lon qilingan", tone: 'success' };
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

/**
 * There is NO global Instagram feed endpoint on the API — media is exposed only
 * per product (`GET /catalog/products/{id}/instagram`). So we aggregate: page
 * through every product, fetch each product's Instagram media in parallel, and
 * flatten. This is REAL data (nothing faked); the cost is N+1 requests. A global
 * `GET /catalog/instagram-media` list would collapse it to one call — tracked in
 * docs/API-GAPS.md.
 */
export async function fetchSocialFeed(): Promise<SocialItem[]> {
  // 1. page all products
  const products: ProductOut[] = [];
  let offset = 0;
  for (;;) {
    const page = await listProducts({ limit: 100, offset });
    products.push(...page.items);
    offset += page.items.length;
    if (page.items.length === 0 || offset >= page.total) break;
  }

  // 2. fetch each product's Instagram media in parallel, enrich with the product
  const perProduct = await Promise.all(
    products.map(async (p) => {
      const media = await listProductInstagram(p.id).catch(() => [] as InstagramMediaOut[]);
      return media.map((m) => ({
        ...m,
        product: { id: p.id, name_uz: p.name_uz, name_ru: p.name_ru },
        kind: deriveKind(m.permalink, m.media_type),
      }));
    }),
  );

  // 3. flatten, newest first
  return perProduct.flat().sort((a, b) => b.created_at.localeCompare(a.created_at));
}
