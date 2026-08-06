import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useProducts } from '@/features/products/hooks';
import { useRefs } from '@/features/products/hooks';
import { listBoxes } from '@/features/products/api';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import type { BoxOut, OrderOut, ProductOut, VariantOut } from '@/shared/api/types';

export interface ResolvedVariant {
  product: ProductOut;
  variant: VariantOut;
  name: string;
  image: string | null;
  /** "Oltin 585 · Brilliant" style meta line (only the parts that resolve). */
  meta: string;
}

/**
 * Resolves everything the order items reference by id — product (name, photo,
 * material/stone), and gift boxes (label/photo). One cached products query +
 * two tiny reference-list queries + one boxes query per unique category that
 * actually has a box on the order. No per-item requests.
 */
export function useOrderDetailData(order: OrderOut | undefined) {
  const lang = useUiStore((s) => s.lang);
  const products = useProducts();
  const materials = useRefs('materials');
  const stones = useRefs('stones');

  const variantMap = useMemo(() => {
    const m = new Map<string, ResolvedVariant>();
    if (!products.data) return m;
    const matName = new Map(materials.data?.map((r) => [r.id, pickName(r, lang)]) ?? []);
    const stoneName = new Map(stones.data?.map((r) => [r.id, pickName(r, lang)]) ?? []);
    for (const p of products.data) {
      for (const v of p.variants) {
        const meta = [
          v.sku,
          p.material_id ? matName.get(p.material_id) : null,
          p.stone_id ? stoneName.get(p.stone_id) : null,
        ]
          .filter(Boolean)
          .join(' · ');
        m.set(v.id, {
          product: p,
          variant: v,
          name: pickName(p, lang),
          image: p.media.find((md) => md.image_url)?.image_url ?? null,
          meta,
        });
      }
    }
    return m;
  }, [products.data, materials.data, stones.data, lang]);

  // Boxes: only the categories that actually carry a boxed item on this order.
  const boxCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of order?.items ?? []) {
      if (!item.box_id) continue;
      const catId = variantMap.get(item.variant_id)?.product.category_id;
      if (catId) ids.add(catId);
    }
    return [...ids];
  }, [order?.items, variantMap]);

  const boxQueries = useQueries({
    queries: boxCategoryIds.map((catId) => ({
      queryKey: ['boxes', 'byCategory', catId] as const,
      queryFn: () => listBoxes(catId),
      staleTime: 5 * 60_000,
    })),
  });

  const boxMap = useMemo(() => {
    const m = new Map<string, BoxOut>();
    for (const q of boxQueries) for (const b of q.data ?? []) m.set(b.id, b);
    return m;
  }, [boxQueries]);

  return {
    variantMap,
    boxMap,
    productsPending: products.isPending,
    productsError: products.isError,
  };
}
