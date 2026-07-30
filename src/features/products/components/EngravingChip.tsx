import { PenLine } from 'lucide-react';
import { Money } from '@/shared/ui';
import type { ProductOut } from '@/shared/api/types';
import { resolveEngravingMax, resolveEngravingPrice } from '../lib/engraving';

/**
 * At-a-glance engraving capability: "Gravyurka · 3 belgi · +50 000" (or
 * "Gravyurka · cheksiz" when the limit is 0). Nothing renders when the product
 * doesn't offer engraving.
 */
export function EngravingChip({
  product,
  globalMax,
  globalPrice,
}: {
  product: Pick<ProductOut, 'engraving_available' | 'engraving_max_chars' | 'engraving_price'>;
  globalMax: number;
  globalPrice: number;
}) {
  if (!product.engraving_available) return null;
  const max = resolveEngravingMax(product, globalMax);
  const price = resolveEngravingPrice(product, globalPrice);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-medium text-muted">
      <PenLine className="h-3 w-3 shrink-0 text-accent-ink" strokeWidth={1.75} />
      Gravyurka · {max === 0 ? 'cheksiz' : `${max} belgi`} · +<Money short value={price} />
    </span>
  );
}
