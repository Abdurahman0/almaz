import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { addProductInstagram, deleteInstagramMedia, updateInstagramMedia } from '@/features/products/api';
import type { InstagramMediaCreate, InstagramMediaUpdate } from '@/shared/api/types';
import { fetchSocialFeed } from './api';

const feedKey = ['social', 'feed'] as const;

/** The content ↔ product relationship lives in two caches: the aggregated feed
 *  (`['social','feed']`) and each product's own media list (`['catalog','instagram',id]`,
 *  used by the product-detail Kontentlar section). Every content mutation must
 *  invalidate BOTH so the relationship stays consistent in both directions. */
function invalidateBothSides(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: feedKey });
  void qc.invalidateQueries({ queryKey: ['catalog', 'instagram'] });
}

/** Aggregated Instagram feed (posts + reels + stories) across all products. */
export function useSocialFeed() {
  return useQuery({
    queryKey: feedKey,
    queryFn: fetchSocialFeed,
    staleTime: 60_000,
  });
}

/** Attach an Instagram link to a product. Backend parses type/ref from the URL. */
export function useAddSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, body }: { productId: string; body: InstagramMediaCreate }) =>
      addProductInstagram(productId, body),
    onSuccess: () => invalidateBothSides(qc),
  });
}

/** Edit an Instagram media item (is_active / image_url). */
export function useUpdateSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InstagramMediaUpdate }) => updateInstagramMedia(id, body),
    onSuccess: () => invalidateBothSides(qc),
  });
}

/** Delete an Instagram media item. */
export function useDeleteSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInstagramMedia(id),
    onSuccess: () => invalidateBothSides(qc),
  });
}
