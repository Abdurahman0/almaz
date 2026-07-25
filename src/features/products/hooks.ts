import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as productsApi from './api';
import type { ProductListParams } from './api';
import type {
  CategoryCreate,
  CategoryUpdate,
  ProductCreate,
  ProductMediaCreate,
  ProductStatus,
  ProductUpdate,
  RefCreate,
  RefKind,
  RefUpdate,
  StockAdjust,
} from '@/shared/api/types';

export const productKeys = {
  all: ['products'] as const,
  list: (status?: ProductStatus) => ['products', 'list', status ?? 'all'] as const,
  page: (params: ProductListParams) => ['products', 'page', params] as const,
  lowStock: (params: { status?: ProductStatus; limit?: number; offset?: number }) =>
    ['products', 'low-stock', params] as const,
  categories: ['catalog', 'categories'] as const,
  refs: (kind: RefKind, onlyActive: boolean) => ['catalog', kind, onlyActive] as const,
};

/** Flat product array for dropdowns/reports (no pagination UI). */
export function useProducts(status?: ProductStatus) {
  return useQuery({
    queryKey: productKeys.list(status),
    queryFn: () => productsApi.listProducts({ status, limit: 1000 }).then((r) => r.items),
  });
}

/** Paginated + filtered product list for the products page. */
export function useProductsPage(params: ProductListParams, enabled = true) {
  return useQuery({
    queryKey: productKeys.page(params),
    queryFn: () => productsApi.listProducts(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Products under their low-stock threshold (admin re-order view). */
export function useLowStock(
  params: { status?: ProductStatus; limit?: number; offset?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: productKeys.lowStock(params),
    queryFn: () => productsApi.listLowStock(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

// ---------- Categories ----------
export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: () => productsApi.listCategories(),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryCreate) => productsApi.createCategory(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.categories }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CategoryUpdate }) =>
      productsApi.updateCategory(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.categories });
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.categories }),
  });
}

// ---------- Reference dictionaries (gender / material / stone) ----------
export function useRefs(kind: RefKind, onlyActive = false) {
  return useQuery({
    queryKey: productKeys.refs(kind, onlyActive),
    queryFn: () => productsApi.listRefs(kind, onlyActive),
  });
}

export function useCreateRef(kind: RefKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RefCreate) => productsApi.createRef(kind, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', kind] }),
  });
}

export function useUpdateRef(kind: RefKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RefUpdate }) =>
      productsApi.updateRef(kind, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog', kind] });
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteRef(kind: RefKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteRef(kind, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', kind] }),
  });
}

// ---------- Products ----------
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

export function useAddProductMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, body }: { productId: string; body: ProductMediaCreate }) =>
      productsApi.addProductMedia(productId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => productsApi.deleteMedia(mediaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}
