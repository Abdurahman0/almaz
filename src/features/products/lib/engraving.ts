import type { ProductOut } from '@/shared/api/types';

type EngravingFields = Pick<ProductOut, 'engraving_max_chars' | 'engraving_price'>;

/**
 * Resolve the engraving character limit: product value → global setting → 20.
 * A product value of 0 means UNLIMITED and is preserved as 0 (never treated as
 * "no characters"). Only `null` falls back to the global.
 */
export function resolveEngravingMax(product: EngravingFields, globalMax: number): number {
  return product.engraving_max_chars != null ? product.engraving_max_chars : globalMax;
}

/** Resolve the engraving surcharge: product value → global setting. */
export function resolveEngravingPrice(product: EngravingFields, globalPrice: number): number {
  return product.engraving_price != null ? Number(product.engraving_price) : globalPrice;
}
