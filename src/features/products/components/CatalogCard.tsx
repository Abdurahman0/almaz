import type { ReactNode } from 'react';
import { AlertTriangle, PackageOpen } from 'lucide-react';
import { Badge, DropdownMenu, Money, Tooltip, type MenuItem } from '@/shared/ui';

export interface CatalogCardProps {
  /** Primary image; when absent a neutral placeholder of identical size is shown. */
  imageUrl?: string | null;
  /** Placeholder icon (Gem for products, Package for boxes). */
  placeholderIcon: ReactNode;
  /** Optional tint for the placeholder block (box color). */
  tintHex?: string | null;
  /** Small leading node on the name line (e.g. a box colour dot). */
  leading?: ReactNode;
  name: string;
  price: number | string;
  /** Struck-through original price — rendered ONLY when present. */
  oldPrice?: number | string | null;
  /** Render "Bepul" instead of a price (free gift box). */
  free?: boolean;
  /** Muted dot-separated facts. Callers pass only fields the API actually returns. */
  meta?: string[];
  available: number;
  lowStock?: boolean;
  /** Shown only for non-normal states (draft/archived/inactive); null = nothing. */
  statusBadge?: { label: string; tone: 'muted' | 'danger' | 'success' } | null;
  menuItems: MenuItem[];
  /** Optional box-specific quick control (e.g. stock stepper). */
  footer?: ReactNode;
  onClick?: () => void;
}

/**
 * One presentational card shared by products and gift boxes — data-first, image
 * capped at 120px so the card reads as an inventory row, not a lookbook tile.
 */
export function CatalogCard({
  imageUrl, placeholderIcon, tintHex, leading, name, price, oldPrice, free,
  meta = [], available, lowStock, statusBadge, menuItems, footer, onClick,
}: CatalogCardProps) {
  const soldOut = available <= 0;
  const facts = meta.filter(Boolean);

  const menu = (
    <DropdownMenu
      items={menuItems}
      trigger={
        <button
          aria-label="Amallar"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface/85 text-muted backdrop-blur transition-colors hover:text-text"
        >
          <span className="text-base leading-none">⋯</span>
        </button>
      }
    />
  );

  return (
    <div
      onClick={onClick}
      className={`group relative flex min-h-[240px] cursor-pointer flex-col rounded-[var(--r-md)] border border-border bg-surface p-3 transition-all duration-200 ${
        soldOut ? 'opacity-70 hover:opacity-100' : 'hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      {/* image — inside the padding, capped height, rounded to --r-sm */}
      <div className="relative h-[120px] w-full shrink-0 overflow-hidden rounded-[var(--r-sm)] bg-surface-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={tintHex ? { background: `color-mix(in srgb, ${tintHex} 22%, var(--surface-2))` } : undefined}
          >
            {placeholderIcon}
          </div>
        )}

        {/* stock chip — top-left, 11px, warning treatment only when low */}
        {soldOut ? (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-surface/85 px-2 py-0.5 text-2xs font-semibold text-muted backdrop-blur">
            <PackageOpen className="h-3 w-3" strokeWidth={1.75} /> Tugagan
          </span>
        ) : (
          <span
            className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold backdrop-blur ${
              lowStock ? 'bg-danger-soft text-danger' : 'bg-surface/85 text-text'
            }`}
          >
            {lowStock && <AlertTriangle className="h-3 w-3" strokeWidth={2} />}
            {available} dona
          </span>
        )}

        {/* actions — top-right */}
        <span className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
          {soldOut ? <Tooltip content="Qayta buyurtma berasizmi?"><span>{menu}</span></Tooltip> : menu}
        </span>
      </div>

      {/* data — the focus */}
      <div className="mt-3 flex min-w-0 flex-1 flex-col">
        {/* line 1: name + price */}
        <div className="flex items-baseline gap-2">
          {leading}
          <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${soldOut ? 'text-muted' : 'text-text'}`}>
            {name}
          </p>
          <span className={`tnum shrink-0 text-sm font-semibold ${soldOut ? 'text-muted' : 'text-accent-ink'}`}>
            {free ? 'Bepul' : <Money short value={price} />}
            {oldPrice != null && (
              <span className="ml-1 text-2xs font-normal text-muted line-through"><Money short value={oldPrice} /></span>
            )}
          </span>
        </div>

        {/* line 2: jeweler facts — omit entirely when nothing to show */}
        {facts.length > 0 && (
          <p className="mt-1 truncate text-2xs text-muted">{facts.join(' · ')}</p>
        )}

        {statusBadge && (
          <div className="mt-2">
            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
          </div>
        )}

        {footer && <div className="mt-auto pt-3" onClick={(e) => e.stopPropagation()}>{footer}</div>}
      </div>
    </div>
  );
}
