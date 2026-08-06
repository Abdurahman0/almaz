import { Link } from 'react-router-dom';
import { Gem, Gift, PenLine } from 'lucide-react';
import { Card, Money, Skeleton } from '@/shared/ui';
import type { OrderOut } from '@/shared/api/types';
import type { ResolvedVariant } from './useDetailData';
import type { BoxOut } from '@/shared/api/types';

function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-medium text-text">
      {icon}
      {children}
    </span>
  );
}

interface ItemsCardProps {
  order: OrderOut;
  variantMap: Map<string, ResolvedVariant>;
  boxMap: Map<string, BoxOut>;
  productsPending: boolean;
  zoneLabel: string | null;
}

/** The centerpiece: rich line items with photo, specifics chips and row totals. */
export function ItemsCard({ order, variantMap, boxMap, productsPending, zoneLabel }: ItemsCardProps) {
  return (
    <Card className="print-block">
      <h2 className="mb-4 text-md font-semibold text-text">Mahsulotlar</h2>
      <div className="divide-y divide-[var(--border)]">
        {order.items.map((item) => {
          const rv = variantMap.get(item.variant_id);
          const boxImage = item.box_id ? boxMap.get(item.box_id)?.media[0]?.image_url ?? null : null;
          const rowTotal =
            (Number(item.unit_price) + Number(item.engraving_price || 0) + Number(item.box_price || 0)) *
            item.quantity;
          return (
            <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              {/* photo */}
              {productsPending && !rv ? (
                <Skeleton className="h-20 w-20 shrink-0 rounded-[var(--r-sm)]" />
              ) : rv?.image ? (
                <Link to={`/products/${rv.product.id}`} className="shrink-0" aria-label={rv.name}>
                  <img
                    src={rv.image}
                    alt={rv.name}
                    className="h-20 w-20 rounded-[var(--r-sm)] border border-border bg-surface-2 object-contain"
                  />
                </Link>
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-border bg-surface-2 text-muted">
                  <Gem className="h-7 w-7" strokeWidth={1.25} />
                </span>
              )}

              {/* name + meta + chips */}
              <div className="min-w-0 flex-1">
                {rv ? (
                  <Link
                    to={`/products/${rv.product.id}`}
                    className="block truncate text-sm font-semibold text-text hover:text-accent-ink"
                  >
                    {rv.name}
                  </Link>
                ) : (
                  <p className="truncate font-mono text-xs font-medium text-text">
                    Variant {item.variant_id.slice(0, 8)}
                  </p>
                )}
                {rv?.meta && <p className="mt-0.5 truncate text-xs text-muted">{rv.meta}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {item.ring_size && <Chip>⌀ {item.ring_size}</Chip>}
                  {item.engraving_text && (
                    <Chip icon={<PenLine className="h-3 w-3" strokeWidth={1.75} />}>
                      Gravyurka: «{item.engraving_text}»
                      {Number(item.engraving_price) > 0 && (
                        <span className="text-muted">
                          +<Money short value={item.engraving_price} />
                        </span>
                      )}
                    </Chip>
                  )}
                  {item.box_label && (
                    <Chip icon={<Gift className="h-3 w-3" strokeWidth={1.75} />}>
                      {boxImage && (
                        <img
                          src={boxImage}
                          alt=""
                          className="h-4 w-4 rounded-[var(--r-xs)] border border-border object-cover"
                        />
                      )}
                      Quti: {item.box_label}
                      {item.box_price && Number(item.box_price) > 0 && (
                        <span className="text-muted">
                          +<Money short value={item.box_price} />
                        </span>
                      )}
                    </Chip>
                  )}
                </div>
              </div>

              {/* qty × price, row total */}
              <div className="shrink-0 text-right">
                <p className="tnum text-xs text-muted">
                  {item.quantity} × <Money value={item.unit_price} />
                </p>
                <p className="tnum mt-1 text-sm font-semibold text-text">
                  <Money value={rowTotal} />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* totals — server values only */}
      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-muted">
          <dt>Mahsulotlar</dt>
          <dd><Money value={order.items_total} /></dd>
        </div>
        <div className="flex justify-between text-muted">
          <dt>Yetkazish{zoneLabel ? ` (${zoneLabel})` : ''}</dt>
          <dd><Money value={order.delivery_fee} /></dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-2 font-bold text-text">
          <dt>Jami</dt>
          <dd className="text-md text-accent-ink"><Money value={order.grand_total} /></dd>
        </div>
      </dl>
    </Card>
  );
}
