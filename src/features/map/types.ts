/*
 * Public customer location page (/map/{token}) — two-step contract from
 * FRONTEND_MAP_INTEGRATION.md. The frontend NEVER computes the zone or the
 * price: it sends lat/lng (and, for BTS, the chosen branch) and displays
 * whatever the backend returns.
 */

export type LocationType = 'Toshkent' | 'BTS';

/** GET /map/{token} — quiet page header context. */
export interface MapContext {
  order_no: string;
  items_total: number;
  zones: { tashkent: number; region: number };
}

/** A BTS pickup branch as returned by resolve/confirm. */
export interface MapBranch {
  id: string;
  name: string;
  region: string;
  district: string;
  address: string;
  landmark: string | null;
  phone: string | null;
  work_hours: string | null;
  lat: number;
  lng: number;
  /** Present in resolve (sorted nearest-first); absent in confirm echo. */
  distance_km?: number;
}

/** POST /map/{token}/resolve — zone + price + (BTS) branches. Token stays open. */
export interface MapResolveOut {
  order_no: string;
  location_type: LocationType;
  delivery_fee: number;
  items_total: number;
  grand_total: number;
  requires_branch_selection: boolean;
  branches: MapBranch[];
}

/** POST /map/{token}/confirm request. Token closes on success (one-time). */
export interface MapConfirmBody {
  lat: number;
  lng: number;
  /** Required for BTS, omitted for Toshkent. */
  bts_branch_id?: string;
  address_text?: string;
  phone?: string;
  landmark?: string;
  apartment?: string;
}

/** POST /map/{token}/confirm response. */
export interface MapConfirmOut {
  order_no: string;
  location_type: LocationType;
  delivery_fee: number;
  items_total: number;
  grand_total: number;
  address_text: string | null;
  bts_branch: MapBranch | null;
}
