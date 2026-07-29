import { api } from '@/shared/api/client';
import type { MapConfirmBody, MapConfirmOut, MapContext, MapResolveOut } from './types';

/*
 * Public map endpoints (FRONTEND_MAP_INTEGRATION.md). No auth — the one-time
 * token in the path is the authorization. The shared `api` instance is fine: a
 * not-logged-in customer sends no Authorization header, and a bad/used/expired
 * token returns 400/404 (never 401), so the refresh interceptor never fires.
 */
export async function getMapContext(token: string): Promise<MapContext> {
  return (await api.get<MapContext>(`/map/${token}`)).data;
}

/** Step 1 — does NOT close the token; safe to call on every pin move. */
export async function resolveMap(
  token: string,
  body: { lat: number; lng: number },
): Promise<MapResolveOut> {
  return (await api.post<MapResolveOut>(`/map/${token}/resolve`, body)).data;
}

/** Step 2 — closes the token, one time only. */
export async function confirmMap(token: string, body: MapConfirmBody): Promise<MapConfirmOut> {
  return (await api.post<MapConfirmOut>(`/map/${token}/confirm`, body)).data;
}
