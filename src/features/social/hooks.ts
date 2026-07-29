import { useQuery } from '@tanstack/react-query';
import { fetchSocialFeed } from './api';

/** Aggregated Instagram feed (posts + reels + stories) across all products. */
export function useSocialFeed() {
  return useQuery({
    queryKey: ['social', 'feed'],
    queryFn: fetchSocialFeed,
    staleTime: 60_000,
  });
}
