import { listProductInstagram, listProducts } from '@/features/products/api';
import type { InstagramMediaOut, ProductOut } from '@/shared/api/types';

export type SocialKind = 'post' | 'reel' | 'story';

export interface SocialItem extends InstagramMediaOut {
  /** The product this Instagram media is attached to (for label + navigation). */
  product: Pick<ProductOut, 'id' | 'name_uz' | 'name_ru'>;
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
      return media.map((m) => ({ ...m, product: { id: p.id, name_uz: p.name_uz, name_ru: p.name_ru } }));
    }),
  );

  // 3. flatten, newest first
  return perProduct.flat().sort((a, b) => b.created_at.localeCompare(a.created_at));
}
