/** Types derived from https://almaz.api.cognilabs.org/openapi.json (Almaz AI Seller CRM 1.0.0) */

// ---------- Enums ----------
export type Channel = 'instagram' | 'telegram';
export type ConversationStatus = 'open' | 'closed';
export type AiState =
  | 'greeting'
  | 'browsing'
  | 'recommending'
  | 'ordering'
  | 'awaiting_location'
  | 'awaiting_payment'
  | 'payment_review'
  | 'handed_off'
  | 'closed';
export type SenderType = 'customer' | 'ai' | 'operator' | 'system';
export type MessageDirection = 'incoming' | 'outgoing';
export type MessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'waiting_payment'
  | 'payment_review'
  | 'confirmed'
  | 'preparing'
  | 'packed'
  | 'shipping'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'returned';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type ProductStatus = 'draft' | 'active' | 'archived';
export type FulfillmentType = 'stocked' | 'made_to_order' | 'unique';
export type Gender = 'erkak' | 'ayol' | 'uniseks';
export type DeliveryZone = 'tashkent' | 'region';
export type DeliveryProvider = 'yandex' | 'bts';
export type DeliveryStatus = 'pending' | 'awaiting_address' | 'ready' | 'dispatched' | 'delivered';
export type KnowledgeType =
  | 'faq'
  | 'policy'
  | 'delivery'
  | 'payment'
  | 'company'
  | 'guarantee'
  | 'instruction';

// ---------- Auth ----------
export interface LoginRequest {
  email: string;
  password: string;
}
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
export interface RefreshRequest {
  refresh_token: string;
}
export interface MeResponse {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  roles: string[];
  permissions: string[];
}

// ---------- Settings ----------
export type SettingValue = string | number | boolean | null | Record<string, unknown>;
export interface SettingOut {
  key: string;
  value: SettingValue;
}
export interface SettingUpdate {
  value: SettingValue;
}

// ---------- Catalog ----------
/** A localized dictionary row shared by categories and the reference lists. */
export interface Localized {
  name_uz: string;
  name_ru: string | null;
}
export interface CategoryOut {
  id: string;
  name_uz: string;
  name_ru: string | null;
  slug: string;
  parent_id: string | null;
  /** Price per gram (money as string) used by the weight calculator. */
  gram_price: string | null;
}
export interface CategoryCreate {
  name_uz: string;
  name_ru?: string | null;
  slug?: string | null;
  parent_id?: string | null;
  gram_price?: number | string | null;
}
export type CategoryUpdate = Partial<CategoryCreate>;

/** gender / material / stone — same shape reference dictionary (DB-driven CRUD). */
export type RefKind = 'genders' | 'materials' | 'stones';
export interface RefOut {
  id: string;
  name_uz: string;
  name_ru: string | null;
  is_active: boolean;
  sort_order: number;
}
export interface RefCreate {
  name_uz: string;
  name_ru?: string | null;
  is_active?: boolean;
  sort_order?: number;
}
export type RefUpdate = Partial<RefCreate>;

/** GET /catalog/price-calc — preview only, does not persist. */
export interface PriceCalcOut {
  gram_price: string | number;
  weight_grams: string | number;
  price: string | number;
}
export interface ProductMediaCreate {
  image_url: string;
  shortcode_or_url?: string | null;
}
export interface VariantOut {
  id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  fulfillment_type: FulfillmentType;
  stock_qty: number;
  reserved_qty: number;
  available: number;
  is_active: boolean;
}
export interface VariantCreate {
  sku?: string | null;
  barcode?: string | null;
  fulfillment_type?: FulfillmentType;
  stock_qty?: number;
  is_active?: boolean;
}
export interface StockAdjust {
  stock_qty?: number | null;
  delta?: number | null;
}
export interface MediaOut {
  id: string;
  product_id: string;
  channel: Channel;
  external_media_id: string | null;
  shortcode: string | null;
  permalink: string | null;
  image_url: string | null;
}
export interface ProductOut {
  id: string;
  category_id: string | null;
  name_uz: string;
  name_ru: string | null;
  description_uz: string | null;
  description_ru: string | null;
  gender_id: string | null;
  material_id: string | null;
  stone_id: string | null;
  weight_grams: string | number | null;
  /** Base price (struck-through when discounted). */
  price: string;
  /** Discounted price the customer pays; null = no discount. */
  discount_price: string | null;
  /** Computed: discount_price when present, else price. */
  effective_price: string;
  status: ProductStatus;
  engraving_available?: boolean;
  ai_keywords: string[] | null;
  variants: VariantOut[];
  media: MediaOut[];
}
export interface ProductCreate {
  name_uz: string;
  name_ru?: string | null;
  description_uz?: string | null;
  description_ru?: string | null;
  category_id?: string | null;
  gender_id?: string | null;
  material_id?: string | null;
  stone_id?: string | null;
  weight_grams?: number | string | null;
  /** Optional: omitted -> server computes from weight_grams x category gram_price. */
  price?: number | string | null;
  discount_price?: number | string | null;
  status?: ProductStatus;
  engraving_available?: boolean;
  ai_keywords?: string[] | null;
  /** Simplest image attach — plain URLs. */
  image_urls?: string[] | null;
  /** Richer media attach with optional Instagram shortcode/permalink. */
  media?: ProductMediaCreate[] | null;
  variants?: VariantCreate[] | null;
}
export type ProductUpdate = Partial<Omit<ProductCreate, 'variants'>>;
export interface SearchHit {
  product: ProductOut;
  match_type: string;
  score: number | null;
}
export interface SearchResponse {
  query: string | null;
  match_type: string;
  hits: SearchHit[];
}

// ---------- Inbox ----------
export interface CustomerOut {
  id: string;
  channel: Channel;
  external_id: string;
  username: string | null;
  full_name: string | null;
  language: string;
}
export interface ConversationOut {
  id: string;
  customer_id: string;
  channel: Channel;
  ai_state: AiState;
  status: ConversationStatus;
  assigned_operator_id: string | null;
  ai_paused_until: string | null;
  unread_count: number;
  last_message: string | null;
  last_activity_at: string;
  customer: CustomerOut | null;
}
export interface MessageOut {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  sender_type: SenderType;
  sender_user_id: string | null;
  content: string | null;
  attachments: unknown[] | null;
  delivery_status: MessageDeliveryStatus;
  is_read: boolean;
  created_at: string;
}
export interface SendMessageRequest {
  text: string;
}
export interface TransferRequest {
  operator_id?: string | null;
  reason?: string | null;
}
export interface AssignRequest {
  operator_id: string;
}

// ---------- Orders ----------
export interface OrderItemCreate {
  variant_id: string;
  quantity?: number;
  ring_size?: string | null;
}
export interface OrderCreate {
  customer_id: string;
  items: OrderItemCreate[];
}
export interface OrderItemOut {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price: string;
  ring_size: string | null;
  bonus_snapshot: unknown[] | null;
}
export interface OrderStatusHistoryOut {
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  created_at: string;
}
export interface OrderOut {
  id: string;
  order_no: string;
  customer_id: string;
  assigned_operator_id: string | null;
  status: OrderStatus;
  items_total: string;
  delivery_fee: string;
  grand_total: string;
  created_at: string;
  items: OrderItemOut[];
  history: OrderStatusHistoryOut[];
}
export interface OrderCancel {
  reason?: string | null;
}

// ---------- Delivery ----------
export interface DeliveryOut {
  id: string;
  order_id: string;
  zone: DeliveryZone | null;
  provider: DeliveryProvider | null;
  fee: string;
  address_text: string | null;
  lat: string | null;
  lng: string | null;
  status: DeliveryStatus;
}
export interface CheckoutLinkOut {
  url: string;
  expires_at: string;
}

// ---------- Payments ----------
export interface PaymentCardOut {
  id: string;
  holder_name: string;
  card_number_masked: string;
  is_primary: boolean;
  is_active: boolean;
}
export interface PaymentCardCreate {
  holder_name: string;
  card_number_masked: string;
  is_primary?: boolean;
  is_active?: boolean;
}
export type PaymentCardUpdate = Partial<PaymentCardCreate>;
export interface PaymentOut {
  id: string;
  order_id: string;
  card_id: string | null;
  status: PaymentStatus;
  receipt_url: string | null;
  payer_name: string | null;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}
export interface PaymentReject {
  reason?: string | null;
}

// ---------- AI knowledge ----------
export interface KnowledgeOut {
  id: string;
  type: KnowledgeType;
  title: string;
  content: string;
  created_at: string;
}
export interface KnowledgeCreate {
  type: KnowledgeType;
  title: string;
  content: string;
}
export type KnowledgeUpdate = Partial<KnowledgeCreate>;

// ---------- RBAC ----------
export interface PermissionOut {
  id: string;
  code: string;
  description: string | null;
}
export interface RoleOut {
  id: string;
  name: string;
  is_system: boolean;
}
export interface RoleDetailOut extends RoleOut {
  permissions: string[];
}
export interface UserDetailOut {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  roles: string[];
}
export interface UserCreate {
  full_name: string;
  email: string;
  password: string;
  role_ids?: string[] | null;
}
export interface UserUpdate {
  full_name?: string | null;
  is_active?: boolean | null;
}

// ---------- Misc ----------
export interface AuditLogOut {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}
export interface NotificationOut {
  id: string;
  type: string;
  channel: string;
  target: string | null;
  body: string;
  status: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}
/** /analytics/dashboard is untyped in the spec — keep it defensive. */
export type DashboardAnalytics = Record<string, unknown>;

export interface ListParams {
  limit?: number;
  offset?: number;
}
