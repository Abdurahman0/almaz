import { api } from '@/shared/api/client';
import type {
  CategoryCreate,
  CategoryOut,
  CategoryUpdate,
  ListParams,
  MediaOut,
  PriceCalcOut,
  ProductCreate,
  ProductMediaCreate,
  ProductOut,
  ProductStatus,
  ProductUpdate,
  RefCreate,
  RefKind,
  RefOut,
  RefUpdate,
  StockAdjust,
  VariantCreate,
  VariantOut,
} from '@/shared/api/types';

export interface ProductListParams extends ListParams {
  status?: ProductStatus;
  category_id?: string;
}

export async function listProducts(params: ProductListParams = {}): Promise<ProductOut[]> {
  return (await api.get<ProductOut[]>('/catalog/products', { params: { limit: 100, ...params } })).data;
}

export async function getProduct(id: string): Promise<ProductOut> {
  return (await api.get<ProductOut>(`/catalog/products/${id}`)).data;
}

export async function createProduct(body: ProductCreate): Promise<ProductOut> {
  return (await api.post<ProductOut>('/catalog/products', body)).data;
}

export async function updateProduct(id: string, body: ProductUpdate): Promise<ProductOut> {
  return (await api.patch<ProductOut>(`/catalog/products/${id}`, body)).data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/catalog/products/${id}`);
}

export async function addVariant(productId: string, body: VariantCreate): Promise<VariantOut> {
  return (await api.post<VariantOut>(`/catalog/products/${productId}/variants`, body)).data;
}

export async function adjustStock(variantId: string, body: StockAdjust): Promise<VariantOut> {
  return (await api.post<VariantOut>(`/catalog/variants/${variantId}/stock`, body)).data;
}

// ---------- Product media ----------
export async function addProductMedia(productId: string, body: ProductMediaCreate): Promise<MediaOut> {
  return (await api.post<MediaOut>(`/catalog/products/${productId}/media`, body)).data;
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await api.delete(`/catalog/media/${mediaId}`);
}

// ---------- Categories (full CRUD) ----------
export async function listCategories(): Promise<CategoryOut[]> {
  return (await api.get<CategoryOut[]>('/catalog/categories')).data;
}

export async function getCategory(id: string): Promise<CategoryOut> {
  return (await api.get<CategoryOut>(`/catalog/categories/${id}`)).data;
}

export async function createCategory(body: CategoryCreate): Promise<CategoryOut> {
  return (await api.post<CategoryOut>('/catalog/categories', body)).data;
}

export async function updateCategory(id: string, body: CategoryUpdate): Promise<CategoryOut> {
  return (await api.patch<CategoryOut>(`/catalog/categories/${id}`, body)).data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/catalog/categories/${id}`);
}

// ---------- Reference dictionaries: genders / materials / stones ----------
export async function listRefs(kind: RefKind, onlyActive = false): Promise<RefOut[]> {
  const params = onlyActive ? { only_active: true } : undefined;
  return (await api.get<RefOut[]>(`/catalog/${kind}`, { params })).data;
}

export async function createRef(kind: RefKind, body: RefCreate): Promise<RefOut> {
  return (await api.post<RefOut>(`/catalog/${kind}`, body)).data;
}

export async function updateRef(kind: RefKind, id: string, body: RefUpdate): Promise<RefOut> {
  return (await api.patch<RefOut>(`/catalog/${kind}/${id}`, body)).data;
}

export async function deleteRef(kind: RefKind, id: string): Promise<void> {
  await api.delete(`/catalog/${kind}/${id}`);
}

// ---------- Weight -> price calculator preview ----------
export async function priceCalc(categoryId: string, weightGrams: number): Promise<PriceCalcOut> {
  return (
    await api.get<PriceCalcOut>('/catalog/price-calc', {
      params: { category_id: categoryId, weight_grams: weightGrams },
    })
  ).data;
}
