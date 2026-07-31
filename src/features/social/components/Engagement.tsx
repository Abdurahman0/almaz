import { Eye, Heart, MessageCircle } from 'lucide-react';
import type { InstagramMediaOut } from '@/shared/api/types';
import { hasEngagement } from '../api';

const compact = (n: number | null): string => {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

/** Likes / views / comments — rendered only when at least one is measured (null =
 *  "not measured yet", so the whole block hides rather than printing fake zeros). */
export function EngagementRow({
  item,
  className = '',
}: {
  item: Pick<InstagramMediaOut, 'like_count' | 'view_count' | 'comment_count'>;
  className?: string;
}) {
  if (!hasEngagement(item)) return null;
  return (
    <div className={`flex items-center gap-3 tnum text-2xs text-muted ${className}`}>
      <span className="flex items-center gap-1"><Heart className="h-3 w-3" strokeWidth={1.75} /> {compact(item.like_count)}</span>
      <span className="flex items-center gap-1"><Eye className="h-3 w-3" strokeWidth={1.75} /> {compact(item.view_count)}</span>
      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" strokeWidth={1.75} /> {compact(item.comment_count)}</span>
    </div>
  );
}
