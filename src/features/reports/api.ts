import { getItems } from '@/shared/api/client';
import type { TopProductOut } from '@/shared/api/types';

export interface TopProductsParams {
  date_from?: string;
  date_to?: string;
  limit?: number;
}

/** GET /analytics/top-products — exact ordered/sold counts, ranked by sold_qty. */
export async function listTopProducts(params: TopProductsParams = {}): Promise<TopProductOut[]> {
  return getItems<TopProductOut>('/analytics/top-products', { params: { limit: 5, ...params } });
}
