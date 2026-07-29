import { api, getItems, getList, type Paginated } from '@/shared/api/client';
import type {
  BoxCreate,
  BoxMediaCreate,
  BoxOut,
  BoxStockUpdate,
  BoxUpdate,
  CategoryCreate,
  CategoryOut,
  CategoryUpdate,
  ComboCreate,
  ComboItemIn,
  ComboOut,
  ComboUpdate,
  InstagramMediaCreate,
  InstagramMediaOut,
  InstagramMediaUpdate,
  ListParams,
  MediaOut,
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

/** GET /catalog/products/low-stock — products under their low-stock threshold. */
export async function listLowStock(
  params: { status?: ProductStatus } & ListParams = {},
): Promise<Paginated<ProductOut>> {
  const { status, ...rest } = params;
  // default to active without letting an explicit undefined clobber it
  return getList<ProductOut>('/catalog/products/low-stock', {
    params: { limit: 50, status: status ?? 'active', ...rest },
  });
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

/** Re-create a product from an existing one (as a draft, images carried over). */
export async function duplicateProduct(p: ProductOut): Promise<ProductOut> {
  return createProduct({
    name_uz: `${p.name_uz} (nusxa)`,
    name_ru: p.name_ru,
    description_uz: p.description_uz,
    description_ru: p.description_ru,
    category_id: p.category_id,
    gender_id: p.gender_id,
    material_id: p.material_id,
    stone_id: p.stone_id,
    price: Number(p.price),
    discount_price: p.discount_price != null ? Number(p.discount_price) : null,
    engraving_available: p.engraving_available,
    engraving_price: p.engraving_price != null ? Number(p.engraving_price) : null,
    low_stock_threshold: p.low_stock_threshold,
    status: 'draft',
    image_urls: p.media.map((m) => m.image_url).filter((u): u is string => Boolean(u)),
    variants: [{ fulfillment_type: 'stocked', stock_qty: 1, is_active: true }],
  });
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

// ---------- Instagram post/story links (migration 0018) ----------
export async function listProductInstagram(productId: string): Promise<InstagramMediaOut[]> {
  return (await api.get<InstagramMediaOut[]>(`/catalog/products/${productId}/instagram`)).data;
}

export async function addProductInstagram(productId: string, body: InstagramMediaCreate): Promise<InstagramMediaOut> {
  return (await api.post<InstagramMediaOut>(`/catalog/products/${productId}/instagram`, body)).data;
}

export async function updateInstagramMedia(mediaId: string, body: InstagramMediaUpdate): Promise<InstagramMediaOut> {
  return (await api.patch<InstagramMediaOut>(`/catalog/instagram-media/${mediaId}`, body)).data;
}

export async function deleteInstagramMedia(mediaId: string): Promise<void> {
  await api.delete(`/catalog/instagram-media/${mediaId}`);
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

// ---------- Boxes (colored gift boxes, scoped to a category) ----------
export interface BoxListParams extends ListParams {
  only_active?: boolean;
}

export async function listBoxes(categoryId: string, params: BoxListParams = {}): Promise<BoxOut[]> {
  return getItems<BoxOut>(`/catalog/categories/${categoryId}/boxes`, {
    params: { limit: 200, ...params },
  });
}

export async function createBox(categoryId: string, body: BoxCreate): Promise<BoxOut> {
  return (await api.post<BoxOut>(`/catalog/categories/${categoryId}/boxes`, body)).data;
}

export async function updateBox(boxId: string, body: BoxUpdate): Promise<BoxOut> {
  return (await api.patch<BoxOut>(`/catalog/boxes/${boxId}`, body)).data;
}

export async function deleteBox(boxId: string): Promise<void> {
  await api.delete(`/catalog/boxes/${boxId}`);
}

/** Absolute (stock_qty) or relative (delta ±) stock change. */
export async function setBoxStock(boxId: string, body: BoxStockUpdate): Promise<BoxOut> {
  return (await api.post<BoxOut>(`/catalog/boxes/${boxId}/stock`, body)).data;
}

// ---------- Box media (photo gallery, migration 0017) ----------
export async function addBoxMedia(boxId: string, body: BoxMediaCreate): Promise<BoxOut> {
  return (await api.post<BoxOut>(`/catalog/boxes/${boxId}/media`, body)).data;
}

export async function deleteBoxMedia(mediaId: string): Promise<void> {
  await api.delete(`/catalog/boxes/media/${mediaId}`);
}

// ---------- Combos (multi-category product bundles, migration 0017) ----------
export interface ComboListParams extends ListParams {
  status?: ProductStatus;
  q?: string;
}

export async function listCombos(params: ComboListParams = {}): Promise<Paginated<ComboOut>> {
  return getList<ComboOut>('/catalog/combos', { params: { limit: 50, ...params } });
}

export async function getCombo(id: string): Promise<ComboOut> {
  return (await api.get<ComboOut>(`/catalog/combos/${id}`)).data;
}

export async function createCombo(body: ComboCreate): Promise<ComboOut> {
  return (await api.post<ComboOut>('/catalog/combos', body)).data;
}

export async function updateCombo(id: string, body: ComboUpdate): Promise<ComboOut> {
  return (await api.patch<ComboOut>(`/catalog/combos/${id}`, body)).data;
}

export async function deleteCombo(id: string): Promise<void> {
  await api.delete(`/catalog/combos/${id}`);
}

export async function addComboItem(comboId: string, body: ComboItemIn): Promise<ComboOut> {
  return (await api.post<ComboOut>(`/catalog/combos/${comboId}/items`, body)).data;
}

export async function deleteComboItem(itemId: string): Promise<void> {
  await api.delete(`/catalog/combos/items/${itemId}`);
}

/** A combo is a product, so its gallery uses the product-media endpoint. */
export async function addComboImage(comboId: string, imageUrl: string): Promise<MediaOut> {
  return addProductMedia(comboId, { image_url: imageUrl });
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

