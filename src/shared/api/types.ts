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
}

// ---------- Boxes (colored gift boxes per category, migration 0013) ----------
export interface BoxOut {
  id: string;
  category_id: string;
  name_uz: string;
  name_ru: string | null;
  color_hex: string;
  /** Numeric(12,2) as string; 0 => free. */
  price: string;
  is_free: boolean;
  stock_qty: number;
  reserved_qty: number;
  /** stock_qty - reserved_qty — the count actually offerable. */
  available: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}
export interface BoxCreate {
  name_uz: string;
  name_ru?: string | null;
  color_hex?: string;
  price?: number;
  stock_qty?: number;
  is_active?: boolean;
  sort_order?: number;
}
export interface BoxUpdate {
  name_uz?: string;
  name_ru?: string | null;
  color_hex?: string;
  price?: number;
  is_active?: boolean;
  sort_order?: number;
}
/** Absolute set (stock_qty) OR relative (delta ±). */
export interface BoxStockUpdate {
  stock_qty?: number;
  delta?: number;
}

// ---------- AI operator override (POST /ai/conversations/{id}/respond) ----------
export interface AgentRespondOut {
  status: 'replied' | 'skipped';
  reason: string | null;
  reply: string | null;
  message_id: string | null;
  used_tools: string[];
  violations: unknown[];
  state: string;
}

// ---------- Integrations (DB-stored provider tokens, migration 0014) ----------
export type IntegrationProvider = 'telegram' | 'instagram' | 'openai';
export interface IntegrationConfigOut {
  id: string;
  provider: string;
  key: string;
  /** Sensitive — only returned to holders of settings:manage_integrations. */
  value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface IntegrationConfigCreate {
  provider: string;
  key: string;
  value: string;
  is_active?: boolean;
}
export interface IntegrationConfigUpdate {
  value?: string;
  is_active?: boolean;
}
export interface IntegrationEventOut {
  id: string;
  provider: string;
  status: string;
  payload: unknown;
  created_at: string;
}
export interface TelegramWebhookInfo {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_message?: string;
  last_error_date?: number;
  [k: string]: unknown;
}
export interface CategoryCreate {
  name_uz: string;
  name_ru?: string | null;
  slug?: string | null;
  parent_id?: string | null;
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
  /** Base price (struck-through when discounted). */
  price: string;
  /** Discounted price the customer pays; null = no discount. */
  discount_price: string | null;
  /** Computed: discount_price when present, else price. */
  effective_price: string;
  status: ProductStatus;
  engraving_available?: boolean;
  /** Extra charge for engraving; null -> falls back to the global setting. */
  engraving_price: string | null;
  /** Per-product low-stock threshold; null -> global setting used. */
  low_stock_threshold: number | null;
  /** Total available stock across active stocked variants (stock - reserved). */
  available: number;
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
  /** Required — base price. Server 422s if missing. */
  price: number | string;
  discount_price?: number | string | null;
  engraving_available?: boolean;
  engraving_price?: number | string | null;
  low_stock_threshold?: number | null;
  status?: ProductStatus;
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
  /** Whether the AI answers in this conversation at all (false = fully off). */
  ai_enabled: boolean;
  /** AI stays quiet until this instant (temporary pause); null = not paused. */
  ai_paused_until: string | null;
  unread_count: number;
  last_message: string | null;
  last_activity_at: string;
  customer: CustomerOut | null;
}

/** Per-conversation AI control (POST /inbox/conversations/{id}/ai). */
export type AiControlMode = 'pause_minutes' | 'pause_until' | 'off' | 'on';
export interface AiControlRequest {
  mode: AiControlMode;
  /** pause_minutes: minutes to stay quiet. */
  minutes?: number;
  /** pause_until: ISO instant to stay quiet until. */
  until?: string;
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
  engraving_text?: string | null;
  /** Optional gift box (must belong to the product's category). */
  box_id?: string | null;
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
  /** Gift box snapshot (migration 0013): id, price at order time, display label. */
  box_id: string | null;
  box_price: string | null;
  box_label: string | null;
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

/** GET /analytics/top-products — exact ordered/sold counts per product. */
export interface TopProductOut {
  product_id: string;
  name_uz?: string | null;
  name_ru?: string | null;
  /** Units requested across all orders (demand). */
  ordered_qty: number;
  /** Distinct orders the product appeared in. */
  orders_count: number;
  /** Units actually sold (confirmed+ statuses). */
  sold_qty: number;
  /** Revenue from sold units, (unit_price + engraving_price) x qty. */
  revenue: string | number;
}

export interface ListParams {
  limit?: number;
  offset?: number;
}

// ---------- File upload ----------
export interface UploadedFile {
  url: string;
  filename: string;
  content_type: string;
  size: number;
}
