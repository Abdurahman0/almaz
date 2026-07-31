import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  addProductInstagram,
  deleteInstagramMedia,
  getInstagramMedia,
  updateInstagramMedia,
} from '@/features/products/api';
import type {
  InstagramMediaCreate,
  InstagramMediaListParams,
  InstagramMediaOut,
  InstagramMediaUpdate,
} from '@/shared/api/types';
import { fetchSocialFeed, type SocialItem } from './api';

export const socialKeys = {
  feed: (params: InstagramMediaListParams = {}) => ['social', 'feed', params] as const,
  content: (id: string) => ['social', 'content', id] as const,
};

/** Content lives in three caches (feed variants, per-product lists, by-id). Every
 *  mutation invalidates all three so both directions stay consistent. */
function invalidateAll(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['social', 'feed'] });
  void qc.invalidateQueries({ queryKey: ['social', 'content'] });
  void qc.invalidateQueries({ queryKey: ['catalog', 'instagram'] });
}

/** Aggregated feed via the global list endpoint. `params` (product_id / status /
 *  media_type) filter server-side. */
export function useSocialFeed(params: InstagramMediaListParams = {}) {
  return useQuery({
    queryKey: socialKeys.feed(params),
    queryFn: () => fetchSocialFeed(params),
    staleTime: 60_000,
  });
}

/** A single content item by id (deep link). Does not retry a 404. */
export function useContentItem(id: string | null | undefined) {
  return useQuery({
    queryKey: socialKeys.content(id ?? ''),
    queryFn: () => getInstagramMedia(id as string),
    enabled: Boolean(id),
    retry: false,
    staleTime: 60_000,
  });
}

/** Attach an Instagram link to a product (link + optional caption/status/scheduled_at/image). */
export function useAddSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, body }: { productId: string; body: InstagramMediaCreate }) =>
      addProductInstagram(productId, body),
    onSuccess: () => invalidateAll(qc),
  });
}

/** Edit a content item (caption / status / scheduled_at / is_active / image_url).
 *  Optimistically patches every feed cache + the by-id cache, rolls back on error. */
export function useUpdateSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InstagramMediaUpdate }) => updateInstagramMedia(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ['social'] });
      const feeds = qc.getQueriesData<SocialItem[]>({ queryKey: ['social', 'feed'] });
      const item = qc.getQueryData<InstagramMediaOut>(socialKeys.content(id));
      qc.setQueriesData<SocialItem[]>({ queryKey: ['social', 'feed'] }, (old) =>
        old?.map((m) => (m.id === id ? ({ ...m, ...body } as SocialItem) : m)),
      );
      if (item) qc.setQueryData<InstagramMediaOut>(socialKeys.content(id), { ...item, ...body } as InstagramMediaOut);
      return { feeds, item };
    },
    onError: (_e, { id }, ctx) => {
      ctx?.feeds?.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.item) qc.setQueryData(socialKeys.content(id), ctx.item);
    },
    onSettled: () => invalidateAll(qc),
  });
}

/** Delete a content item. */
export function useDeleteSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInstagramMedia(id),
    onSuccess: () => invalidateAll(qc),
  });
}
