import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as productsApi from './api';
import type { ProductCreate, ProductStatus, ProductUpdate, StockAdjust } from '@/shared/api/types';

export const productKeys = {
  all: ['products'] as const,
  list: (status?: ProductStatus) => ['products', 'list', status ?? 'all'] as const,
  categories: ['products', 'categories'] as const,
};

export function useProducts(status?: ProductStatus) {
  return useQuery({
    queryKey: productKeys.list(status),
    queryFn: () => productsApi.listProducts({ status }),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: productsApi.listCategories,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductCreate) => productsApi.createProduct(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProductUpdate }) =>
      productsApi.updateProduct(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, body }: { variantId: string; body: StockAdjust }) =>
      productsApi.adjustStock(variantId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}
