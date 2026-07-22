import { api } from '@/shared/api/client';
import type {
  CategoryCreate,
  CategoryOut,
  ListParams,
  ProductCreate,
  ProductOut,
  ProductStatus,
  ProductUpdate,
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

export async function listCategories(): Promise<CategoryOut[]> {
  return (await api.get<CategoryOut[]>('/catalog/categories')).data;
}

export async function createCategory(body: CategoryCreate): Promise<CategoryOut> {
  return (await api.post<CategoryOut>('/catalog/categories', body)).data;
}
