import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as reportsApi from './api';
import type { TopProductsParams } from './api';

export function useTopProducts(params: TopProductsParams) {
  return useQuery({
    queryKey: ['analytics', 'top-products', params],
    queryFn: () => reportsApi.listTopProducts(params),
    placeholderData: keepPreviousData,
  });
}
