interface SkeletonProps {
  className?: string;
}

/** Gold-shimmer skeleton block; shape it with width/height utilities. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden className={`skeleton-gold ${className}`} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Yuklanmoqda">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}
