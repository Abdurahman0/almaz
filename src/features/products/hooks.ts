import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated } from '@/shared/api/client';
import * as productsApi from './api';
import type { ComboListParams, ProductListParams } from './api';
import type {
  BoxCreate,
  BoxStockUpdate,
  BoxUpdate,
  CategoryCreate,
  CategoryUpdate,
  ComboCreate,
  ComboItemIn,
  ComboUpdate,
  InstagramMediaCreate,
  InstagramMediaUpdate,
  ProductCreate,
  ProductMediaCreate,
  ProductOut,
  ProductStatus,
  ProductUpdate,
  RefCreate,
  RefKind,
  RefUpdate,
  StockAdjust,
  VariantCreate,
  VariantOut,
} from '@/shared/api/types';

// Reference dictionaries barely change — cache them for the session so the four
// product-form dropdowns don't refetch on every open.
const REF_STALE = 10 * 60_000;

export const productKeys = {
  all: ['products'] as const,
  list: (status?: ProductStatus) => ['products', 'list', status ?? 'all'] as const,
  page: (params: ProductListParams) => ['products', 'page', params] as const,
  lowStock: (params: { status?: ProductStatus; limit?: number; offset?: number }) =>
    ['products', 'low-stock', params] as const,
  categories: ['catalog', 'categories'] as const,
  refs: (kind: RefKind, onlyActive: boolean) => ['catalog', kind, onlyActive] as const,
  boxes: (categoryId: string, onlyActive: boolean) =>
    ['catalog', 'boxes', categoryId, onlyActive] as const,
};

/** Flat product array for dropdowns/reports (no pagination UI). */
export function useProducts(status?: ProductStatus) {
  return useQuery({
    queryKey: productKeys.list(status),
    queryFn: () => productsApi.listProducts({ status, limit: 200 }).then((r) => r.items),
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
    staleTime: REF_STALE,
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

// ---------- Boxes (colored gift boxes per category) ----------
export function useBoxes(categoryId: string | null | undefined, onlyActive = false) {
  return useQuery({
    queryKey: productKeys.boxes(categoryId ?? '', onlyActive),
    queryFn: () => productsApi.listBoxes(categoryId as string, onlyActive ? { only_active: true } : {}),
    enabled: Boolean(categoryId),
  });
}

export function useCreateBox(categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BoxCreate) => productsApi.createBox(categoryId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'boxes', categoryId] }),
  });
}

export function useUpdateBox(categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BoxUpdate }) => productsApi.updateBox(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'boxes', categoryId] }),
  });
}

export function useDeleteBox(categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteBox(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'boxes', categoryId] }),
  });
}

export function useSetBoxStock(categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BoxStockUpdate }) =>
      productsApi.setBoxStock(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'boxes', categoryId] }),
  });
}

export function useAddBoxMedia(categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, image_url }: { id: string; image_url: string }) =>
      productsApi.addBoxMedia(id, { image_url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'boxes', categoryId] }),
  });
}

export function useDeleteBoxMedia(categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => productsApi.deleteBoxMedia(mediaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'boxes', categoryId] }),
  });
}

// ---------- Combos (multi-category product bundles) ----------
export const comboKeys = {
  all: ['catalog', 'combos'] as const,
  page: (params: ComboListParams) => ['catalog', 'combos', 'page', params] as const,
  one: (id: string) => ['catalog', 'combos', id] as const,
};

export function useCombos(params: ComboListParams = {}) {
  return useQuery({
    queryKey: comboKeys.page(params),
    queryFn: () => productsApi.listCombos(params),
    placeholderData: keepPreviousData,
  });
}

export function useCombo(id: string | null | undefined) {
  return useQuery({
    queryKey: comboKeys.one(id ?? ''),
    queryFn: () => productsApi.getCombo(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateCombo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ComboCreate) => productsApi.createCombo(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: comboKeys.all }),
  });
}

export function useUpdateCombo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ComboUpdate }) => productsApi.updateCombo(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: comboKeys.all }),
  });
}

export function useDeleteCombo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteCombo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: comboKeys.all }),
  });
}

export function useAddComboItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ComboItemIn }) => productsApi.addComboItem(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: comboKeys.all }),
  });
}

export function useDeleteComboItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => productsApi.deleteComboItem(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: comboKeys.all }),
  });
}

export function useAddComboImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, image_url }: { id: string; image_url: string }) =>
      productsApi.addComboImage(id, image_url),
    onSuccess: () => qc.invalidateQueries({ queryKey: comboKeys.all }),
  });
}

// ---------- Instagram post/story links (per product) ----------
export function useProductInstagram(productId: string | null | undefined) {
  return useQuery({
    queryKey: ['catalog', 'instagram', productId],
    queryFn: () => productsApi.listProductInstagram(productId as string),
    enabled: Boolean(productId),
  });
}

export function useAddProductInstagram(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InstagramMediaCreate) => productsApi.addProductInstagram(productId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'instagram', productId] }),
  });
}

export function useUpdateInstagramMedia(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InstagramMediaUpdate }) =>
      productsApi.updateInstagramMedia(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'instagram', productId] }),
  });
}

export function useDeleteInstagramMedia(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteInstagramMedia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'instagram', productId] }),
  });
}

// ---------- Reference dictionaries (gender / material / stone) ----------
export function useRefs(kind: RefKind, onlyActive = false) {
  return useQuery({
    queryKey: productKeys.refs(kind, onlyActive),
    queryFn: () => productsApi.listRefs(kind, onlyActive),
    staleTime: REF_STALE,
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

export function useDuplicateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: ProductOut) => productsApi.duplicateProduct(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

// A cached products payload is either a paginated envelope or a bare array.
type ProductsCache = Paginated<ProductOut> | ProductOut[] | undefined;

/** Apply a stock change to one variant everywhere it's cached, recomputing the
 *  product's summed `available` so the UI stays consistent optimistically. */
function patchVariantStock(
  cache: ProductsCache,
  variantId: string,
  nextQty: (v: VariantOut) => number,
): ProductsCache {
  if (!cache) return cache;
  const patch = (p: ProductOut): ProductOut => {
    if (!p.variants.some((v) => v.id === variantId)) return p;
    const variants = p.variants.map((v) => {
      if (v.id !== variantId) return v;
      const stock_qty = Math.max(0, nextQty(v));
      return { ...v, stock_qty, available: stock_qty - v.reserved_qty };
    });
    const available = variants.reduce((s, v) => s + (v.stock_qty - v.reserved_qty), 0);
    return { ...p, variants, available };
  };
  return Array.isArray(cache) ? cache.map(patch) : { ...cache, items: cache.items.map(patch) };
}

/**
 * POST /catalog/variants/{id}/stock — set an exact `stock_qty` OR apply a `delta`.
 * Optimistically patches every cached product list and rolls back on failure.
 */
export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, body }: { variantId: string; body: StockAdjust }) =>
      productsApi.adjustStock(variantId, body),
    onMutate: async ({ variantId, body }) => {
      await qc.cancelQueries({ queryKey: productKeys.all });
      const snapshot = qc.getQueriesData<ProductsCache>({ queryKey: productKeys.all });
      const nextQty = (v: VariantOut) =>
        body.stock_qty != null ? body.stock_qty : v.stock_qty + (body.delta ?? 0);
      for (const [key, data] of snapshot) {
        qc.setQueryData(key, patchVariantStock(data, variantId, nextQty));
      }
      return { snapshot };
    },
    onError: (_e, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

/** Add a variant to an existing product (fallback when a product has none). */
export function useAddVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, body }: { productId: string; body: VariantCreate }) =>
      productsApi.addVariant(productId, body),
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
