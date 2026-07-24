import { api, getItems, getList, type Paginated } from '@/shared/api/client';
import type {
  CategoryCreate,
  CategoryOut,
  CategoryUpdate,
  KursCreate,
  KursOut,
  KursUpdate,
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
  gender_id?: string;
  material_id?: string;
  stone_id?: string;
  engraving_available?: boolean;
  in_stock?: boolean;
  min_price?: number;
  max_price?: number;
  q?: string;
}

export async function listProducts(params: ProductListParams = {}): Promise<Paginated<ProductOut>> {
  return getList<ProductOut>('/catalog/products', { params: { limit: 50, ...params } });
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
export interface CategoryListParams extends ListParams {
  parent_id?: string;
  q?: string;
}

export async function listCategories(params: CategoryListParams = {}): Promise<CategoryOut[]> {
  return getItems<CategoryOut>('/catalog/categories', { params: { limit: 1000, ...params } });
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
  const params = { limit: 1000, ...(onlyActive ? { only_active: true } : {}) };
  return getItems<RefOut>(`/catalog/${kind}`, { params });
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

// ---------- Kurs (per-gram price, linked to category) ----------
export interface KursListParams extends ListParams {
  category_id?: string;
  is_active?: boolean;
}

export async function listKurs(params: KursListParams = {}): Promise<KursOut[]> {
  return getItems<KursOut>('/catalog/kurs', { params: { limit: 1000, ...params } });
}

export async function createKurs(body: KursCreate): Promise<KursOut> {
  return (await api.post<KursOut>('/catalog/kurs', body)).data;
}

export async function updateKurs(id: string, body: KursUpdate): Promise<KursOut> {
  return (await api.patch<KursOut>(`/catalog/kurs/${id}`, body)).data;
}

export async function deleteKurs(id: string): Promise<void> {
  await api.delete(`/catalog/kurs/${id}`);
}

// ---------- Weight -> price calculator preview ----------
export async function priceCalc(categoryId: string, weightGrams: number): Promise<PriceCalcOut> {
  return (
    await api.get<PriceCalcOut>('/catalog/price-calc', {
      params: { category_id: categoryId, weight_grams: weightGrams },
    })
  ).data;
}
