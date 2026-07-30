import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  RefreshCw,
  Store,
  Truck,
} from 'lucide-react';
import type { ApiError } from '@/shared/api/client';
import { confirmMap, getMapContext, resolveMap } from '../api';
import type { MapBranch, MapConfirmBody, MapConfirmOut, MapResolveOut } from '../types';
import { BranchList } from '../components/BranchList';
import { BottomSheet, SNAP_FRAC, type Snap } from '../components/BottomSheet';

const TASHKENT: L.LatLngTuple = [41.311081, 69.279737];

const fmtSom = (n: number): string =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;
const fmtKm = (km?: number): string => (typeof km === 'number' ? `${km.toFixed(1)} km` : '');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function deadLinkMessage(err: unknown): string | null {
  const e = err as ApiError;
  const msg = e?.message ?? '';
  if (e?.status === 404) return "Havola yaroqsiz. Sotuvchidan yangi havola so'rang.";
  if (e?.status === 400 && /ishlatilgan/i.test(msg)) return 'Bu havola allaqachon ishlatilgan.';
  if (e?.status === 400 && /muddat/i.test(msg)) return "Havola muddati tugagan. Yangi havola so'rang.";
  return null;
}

// ---- full-screen states -----------------------------------------------------

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-5 text-center text-text">{children}</div>
  );
}
function DeadLink({ message }: { message: string }) {
  return (
    <FullScreen>
      <div className="max-w-sm rounded-2xl border border-border bg-surface p-8">
        <AlertTriangle className="mx-auto h-11 w-11 text-danger" strokeWidth={1.5} />
        <p className="mt-4 text-md font-semibold">Havola ochilmadi</p>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    </FullScreen>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className={`tnum ${strong ? 'text-md font-bold text-accent-ink' : 'text-text'}`}>{value}</span>
    </div>
  );
}
function SuccessScreen({ data }: { data: MapConfirmOut }) {
  const isBts = data.location_type === 'BTS' && data.bts_branch;
  return (
    <FullScreen>
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8">
        <CheckCircle2 className="h-14 w-14 text-success" strokeWidth={1.5} />
        <p className="text-lg font-semibold">Qabul qilindi!</p>
        <p className="font-mono text-2xs text-muted">{data.order_no}</p>
        {isBts && data.bts_branch ? (
          <div className="w-full rounded-xl bg-surface-2 p-4 text-left text-sm">
            <p className="text-muted">Buyurtmangiz quyidagi filialga boradi:</p>
            <p className="mt-1 flex items-center gap-1.5 font-semibold text-text">
              <Store className="h-4 w-4 text-accent-ink" strokeWidth={1.75} /> {data.bts_branch.name}
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-2xs text-muted">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.75} /> {data.bts_branch.address}
            </p>
            {data.bts_branch.work_hours && (
              <p className="mt-1 flex items-center gap-1.5 text-2xs text-muted">
                <Clock className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {data.bts_branch.work_hours}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full rounded-xl bg-surface-2 p-4 text-left text-sm">
            <p className="flex items-center gap-1.5 font-semibold text-text">
              <Truck className="h-4 w-4 text-accent-ink" strokeWidth={1.75} /> Kuryer manzilingizga yetkazadi
            </p>
          </div>
        )}
        <div className="w-full space-y-1 border-t border-border pt-3 text-sm">
          <Row label="Yetkazish" value={fmtSom(data.delivery_fee)} />
          <Row label="Jami" value={fmtSom(data.grand_total)} strong />
        </div>
        <p className="mt-1 text-sm font-medium text-accent-ink">
          Instagram/Telegram'ga qayting — karta raqamini yuboramiz.
        </p>
      </div>
    </FullScreen>
  );
}
function Field({
  value, onChange, placeholder, inputMode, type, onFocus,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
  inputMode?: 'tel' | 'numeric' | 'text'; type?: string; onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} type={type} onFocus={onFocus}
      className="h-12 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-[16px] text-text outline-none placeholder:text-muted focus:border-accent"
    />
  );
}

// ---- leaflet divIcons -------------------------------------------------------

const customerIcon = () =>
  L.divIcon({
    className: 'mapx-icon',
    iconSize: [0, 0],
    html: '<div class="mapx-cust"><svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 39C15 39 28 24 28 14A13 13 0 1 0 2 14C2 24 15 39 15 39Z" fill="var(--accent)" stroke="var(--on-accent)" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="var(--on-accent)"/></svg></div>',
  });
const branchIcon = (b: MapBranch) =>
  L.divIcon({
    className: 'mapx-icon',
    iconSize: [0, 0],
    html:
      `<span class="mapx-branch" data-bid="${esc(b.id)}" tabindex="0" role="button" aria-pressed="false" aria-label="${esc(b.name)}${b.distance_km != null ? ', ' + fmtKm(b.distance_km) : ''}">` +
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>' +
      `<span>${b.distance_km != null ? fmtKm(b.distance_km) : esc(b.name)}</span></span>`,
  });
const clusterIcon = (cluster: { getChildCount: () => number }) =>
  L.divIcon({ className: 'mapx-icon', iconSize: [0, 0], html: `<div class="mapx-cluster">${cluster.getChildCount()}</div>` });

// ---- main page --------------------------------------------------------------

type Phase = 'idle' | 'result';

export default function MapPage() {
  const { token = '' } = useParams();
  const ctx = useQuery({ queryKey: ['map-ctx', token], queryFn: () => getMapContext(token), retry: false, enabled: Boolean(token) });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const custRef = useRef<L.Marker | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const plainRef = useRef<L.Marker[]>([]);
  const byId = useRef<Map<string, L.Marker>>(new Map());
  const lineRef = useRef<L.Polyline | null>(null);
  const labelRef = useRef<L.Marker | null>(null);
  const programmatic = useRef(false);
  const branchesRef = useRef<MapBranch[]>([]);
  const resolvePtRef = useRef<L.LatLngTuple | null>(null);
  const selectedRef = useRef<string | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const interactedRef = useRef(false);

  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800));
  const [kbInset, setKbInset] = useState(0);
  const [snap, setSnap] = useState<Snap>('peek');
  const [phase, setPhase] = useState<Phase>('idle');
  const [stale, setStale] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [resolveData, setResolveData] = useState<MapResolveOut | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [deadLink, setDeadLink] = useState<string | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [apartment, setApartment] = useState('');

  phaseRef.current = phase;
  selectedRef.current = selectedBranchId;

  useEffect(() => { document.title = "Almaz Silver — Yetkazib berish manzili"; }, []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (document.body.style as CSSStyleDeclaration & { overscrollBehavior?: string }).overscrollBehavior = 'none';
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    const vv = window.visualViewport;
    const onVv = () => { if (vv) setKbInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop)); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    vv?.addEventListener('resize', onVv);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); vv?.removeEventListener('resize', onVv); };
  }, []);

  const onSheetHeight = useCallback((px: number, animate: boolean) => {
    const r = rootRef.current;
    if (!r) return;
    r.style.setProperty('--sheet-h', `${px}px`);
    r.dataset.animating = animate ? 'true' : 'false';
  }, []);
  const setDragging = (on: boolean) => { if (rootRef.current) rootRef.current.dataset.dragging = on ? 'true' : 'false'; };
  const markInteracted = () => { if (!interactedRef.current) { interactedRef.current = true; setInteracted(true); } };
  const currentSheetH = () => {
    const v = rootRef.current?.style.getPropertyValue('--sheet-h');
    const n = v ? parseFloat(v) : 0;
    return Number.isFinite(n) && n > 0 ? n : Math.round(SNAP_FRAC.peek * vh);
  };

  // ---- mutations ----
  const resolve = useMutation({
    mutationFn: (pt: L.LatLngTuple) => resolveMap(token, { lat: pt[0], lng: pt[1] }),
    onSuccess: (data) => {
      setResolveData(data);
      setSelectedBranchId(null);
      selectedRef.current = null;
      setStale(false);
      setPhase('result');
      phaseRef.current = 'result';
      setSnap(data.requires_branch_selection ? 'half' : 'peek');
      buildResult(data, resolvePtRef.current ?? TASHKENT);
    },
    onError: (e) => { const dl = deadLinkMessage(e); if (dl) setDeadLink(dl); },
  });
  const confirm = useMutation<MapConfirmOut, unknown, void>({
    mutationFn: () => {
      const pt = resolvePtRef.current ?? TASHKENT;
      const body: MapConfirmBody = { lat: pt[0], lng: pt[1] };
      if (resolveData?.location_type === 'BTS' && selectedBranchId) body.bts_branch_id = selectedBranchId;
      const t = (s: string) => (s.trim() ? s.trim() : undefined);
      if (t(phone)) body.phone = t(phone);
      if (t(address)) body.address_text = t(address);
      if (t(landmark)) body.landmark = t(landmark);
      if (t(apartment)) body.apartment = t(apartment);
      return confirmMap(token, body);
    },
    onError: (e) => {
      const dl = deadLinkMessage(e);
      if (dl) { setDeadLink(dl); return; }
      if (/topilmadi/i.test((e as ApiError)?.message ?? '') && resolvePtRef.current) {
        setSelectedBranchId(null);
        resolve.mutate(resolvePtRef.current);
      }
    },
  });
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  // ---- imperative map ops (via refs so leaflet handlers never go stale) ----
  const clearOverlays = () => {
    custRef.current?.remove(); custRef.current = null;
    clusterRef.current?.remove(); clusterRef.current = null;
    plainRef.current.forEach((m) => m.remove()); plainRef.current = [];
    byId.current.clear();
    lineRef.current?.remove(); lineRef.current = null;
    labelRef.current?.remove(); labelRef.current = null;
  };

  const updateVisuals = () => {
    const map = mapRef.current;
    if (!map) return;
    const sel = selectedRef.current;
    const nearestId = branchesRef.current[0]?.id ?? null;
    byId.current.forEach((m, id) => {
      const chip = m.getElement()?.querySelector('.mapx-branch') as HTMLElement | null;
      if (!chip) return;
      chip.classList.toggle('is-selected', id === sel);
      chip.classList.toggle('is-nearest', id !== sel && id === nearestId);
      chip.setAttribute('aria-pressed', id === sel ? 'true' : 'false');
    });
    lineRef.current?.remove(); lineRef.current = null;
    labelRef.current?.remove(); labelRef.current = null;
    if (sel && custRef.current) {
      const b = branchesRef.current.find((x) => x.id === sel);
      if (b) {
        const a = custRef.current.getLatLng();
        const bl = L.latLng(b.lat, b.lng);
        lineRef.current = L.polyline([a, bl], { className: 'mapx-line', dashArray: '6 8', weight: 2, interactive: false }).addTo(map);
        const mid = L.latLng((a.lat + bl.lat) / 2, (a.lng + bl.lng) / 2);
        labelRef.current = L.marker(mid, {
          interactive: false,
          icon: L.divIcon({ className: 'mapx-icon', iconSize: [0, 0], html: `<div class="mapx-linelabel">${fmtKm(b.distance_km)}</div>` }),
        }).addTo(map);
      }
    }
  };

  const selectBranch = (id: string, fromList: boolean) => {
    setSelectedBranchId(id);
    selectedRef.current = id;
    updateVisuals();
    if (fromList) {
      flyToBranch(id);
    } else {
      setSnap('half');
      const el = rootRef.current?.querySelector(`[data-branch-id="${id}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const flyToBranch = (id: string) => {
    const map = mapRef.current;
    const b = branchesRef.current.find((x) => x.id === id);
    const m = byId.current.get(id);
    if (!map || !b) return;
    programmatic.current = true;
    const after = () => { programmatic.current = false; updateVisuals(); };
    const fly = () => { map.flyTo([b.lat, b.lng], Math.max(map.getZoom(), 15), { duration: 0.4 }); map.once('moveend', after); };
    if (clusterRef.current && m && clusterRef.current.hasLayer(m)) clusterRef.current.zoomToShowLayer(m, fly);
    else fly();
  };

  const buildResult = (data: MapResolveOut, pt: L.LatLngTuple) => {
    const map = mapRef.current;
    if (!map) return;
    clearOverlays();
    branchesRef.current = data.branches;
    custRef.current = L.marker(pt, { icon: customerIcon(), interactive: false, zIndexOffset: 1000 }).addTo(map);
    const bts = data.location_type === 'BTS' && data.branches.length > 0;
    if (bts) {
      const cluster = L.markerClusterGroup({ maxClusterRadius: 45, showCoverageOnHover: false, spiderfyOnMaxZoom: true, chunkedLoading: true, iconCreateFunction: clusterIcon });
      clusterRef.current = cluster;
      data.branches.forEach((b, i) => {
        const m = L.marker([b.lat, b.lng], { icon: branchIcon(b), keyboard: true });
        m.on('click', () => selectBranch(b.id, false));
        byId.current.set(b.id, m);
        if (i < 3) { m.addTo(map); plainRef.current.push(m); } // nearest 3 always unclustered
        else cluster.addLayer(m);
      });
      cluster.addTo(map);
      const bounds = L.latLngBounds([pt, ...data.branches.map((b) => [b.lat, b.lng] as L.LatLngTuple)]);
      programmatic.current = true;
      map.once('moveend', () => { programmatic.current = false; });
      map.fitBounds(bounds, { paddingTopLeft: [28, 88], paddingBottomRight: [28, currentSheetH() + 20] });
      updateVisuals();
    } else {
      programmatic.current = true;
      map.once('moveend', () => { programmatic.current = false; });
      map.setView(pt, 14, { animate: true });
    }
  };

  const goStale = () => {
    setPhase('idle');
    phaseRef.current = 'idle';
    setStale(true);
    setResolveData(null);
    setSelectedBranchId(null);
    selectedRef.current = null;
    clearOverlays();
  };

  // keep the latest closures reachable from long-lived leaflet handlers
  const fns = useRef({ goStale, selectBranch, markInteracted });
  fns.current = { goStale, selectBranch, markInteracted };

  // ---- init leaflet ----
  useEffect(() => {
    if (!ctx.isSuccess || mapFailed || mapRef.current || !mapBoxRef.current) return;
    let map: L.Map;
    try {
      map = L.map(mapBoxRef.current, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView(TASHKENT, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    } catch {
      setMapFailed(true);
      return;
    }
    mapRef.current = map;
    map.on('movestart', () => {
      setDragging(true);
      if (programmatic.current) return;
      fns.current.markInteracted();
      // In 'result' phase, panning is for inspecting branches — it must NOT clear
      // the chosen point. Re-positioning is explicit (the "Joyni o'zgartirish" button).
    });
    map.on('moveend', () => setDragging(false));
    // keyboard select on branch chips (delegated so it survives cluster reveal)
    const box = mapBoxRef.current;
    const onKey = (e: KeyboardEvent) => {
      const chip = (e.target as HTMLElement)?.closest?.('.mapx-branch') as HTMLElement | null;
      if (chip && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const id = chip.getAttribute('data-bid');
        if (id) fns.current.selectBranch(id, false);
      }
    };
    box.addEventListener('keydown', onKey);
    setReady(true);
    setTimeout(() => map.invalidateSize(), 60);
    return () => { box.removeEventListener('keydown', onKey); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.isSuccess, mapFailed]);

  // resize the map when the sheet/viewport changes
  useEffect(() => {
    const t = window.setTimeout(() => {
      try { mapRef.current?.invalidateSize(); } catch { /* noop */ }
    }, 340);
    return () => window.clearTimeout(t);
  }, [snap, vh, kbInset]);

  const doResolve = () => {
    const map = mapRef.current;
    if (!map || resolve.isPending) return;
    const c = map.getCenter();
    const pt: L.LatLngTuple = [c.lat, c.lng];
    resolvePtRef.current = pt;
    markInteracted();
    resolve.mutate(pt);
  };

  const useMyLocation = () => {
    setGeoDenied(false);
    markInteracted();
    if (phaseRef.current === 'result') goStale();
    if (!navigator.geolocation) { setGeoDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: L.LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
        const map = mapRef.current;
        if (map) { programmatic.current = true; map.flyTo(p, 16, { duration: 0.4 }); map.once('moveend', () => { programmatic.current = false; }); }
      },
      () => setGeoDenied(true),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const focusExpand = (e: React.FocusEvent<HTMLInputElement>) => {
    setSnap('full');
    const el = e.target;
    window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
  };

  const initialSheetH = useMemo(() => Math.max(Math.round(SNAP_FRAC.peek * vh), 176), [vh]);

  // ---- non-map screens ----
  if (ctx.isPending) return (<FullScreen><Loader2 className="h-8 w-8 animate-spin text-accent" strokeWidth={1.75} /></FullScreen>);
  if (deadLink) return <DeadLink message={deadLink} />;
  if (ctx.isError) return <DeadLink message={deadLinkMessage(ctx.error) ?? "Havola yaroqsiz. Sotuvchidan yangi havola so'rang."} />;
  if (confirm.isSuccess && confirm.data) return <SuccessScreen data={confirm.data} />;

  const inResult = phase === 'result' && !!resolveData;
  const isBts = resolveData?.location_type === 'BTS';
  const noBranches = Boolean(inResult && isBts && resolveData!.branches.length === 0);
  const resolveErr = resolve.isError && !deadLink ? (resolve.error as unknown as ApiError)?.message : null;
  const confirmErr = confirm.isError && !deadLink ? (confirm.error as ApiError)?.message : null;
  const canConfirm = Boolean(inResult && !confirm.isPending && (!isBts || selectedBranchId));

  // footer button: before/after a result it's RESOLVE; in a result it's CONFIRM.
  const footerButton = !inResult ? (
    <button
      type="button"
      onClick={doResolve}
      disabled={resolve.isPending || !ready}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white shadow-sm [touch-action:manipulation] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {resolve.isPending ? (<><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Hisoblanmoqda…</>) : stale ? (<><RefreshCw className="h-5 w-5" strokeWidth={2} /> Qayta hisoblash</>) : ('Manzilni tasdiqlash')}
    </button>
  ) : noBranches ? (
    <button
      type="button"
      onClick={goStale}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white shadow-sm [touch-action:manipulation] active:scale-[0.99]"
    >
      <RefreshCw className="h-5 w-5" strokeWidth={2} /> Boshqa joyni belgilang
    </button>
  ) : (
    <button
      type="button"
      onClick={() => canConfirm && !confirm.isSuccess && confirm.mutate()}
      disabled={!canConfirm}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white shadow-sm [touch-action:manipulation] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {confirm.isPending ? (<><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Yuborilmoqda…</>) : isBts && !selectedBranchId ? ('Filialni tanlang') : ('Tasdiqlash va yakunlash')}
    </button>
  );

  return (
    <div
      ref={rootRef}
      className="mapx-root fixed inset-0 overflow-hidden bg-bg text-text"
      style={{ ['--sheet-h' as string]: `${initialSheetH}px`, height: '100dvh' }}
    >
      {mapFailed ? (
        <div className="mapx-map absolute inset-x-0 top-0 flex items-center justify-center px-6 text-center text-sm text-muted" style={{ height: 'calc(100dvh - var(--sheet-h))' }}>
          Xarita yuklanmadi. «Mening joylashuvim» tugmasidan foydalaning.
        </div>
      ) : (
        <div ref={mapBoxRef} className="mapx-map absolute inset-x-0 top-0 bg-surface-2" style={{ height: 'calc(100dvh - var(--sheet-h))' }} />
      )}

      {/* centre crosshair — only while positioning (hidden once a point is resolved) */}
      {!mapFailed && !inResult && (
        <div className="mapx-cross pointer-events-none absolute left-1/2 z-[500] -translate-x-1/2 -translate-y-full" style={{ top: 'calc((100dvh - var(--sheet-h)) / 2)' }}>
          <MapPin className="mapx-pin h-11 w-11 text-danger" strokeWidth={2} fill="currentColor" />
          <span className="mx-auto -mt-2 block h-1.5 w-1.5 rounded-full bg-black/50" />
        </div>
      )}

      {!interacted && !mapFailed && !inResult && (
        <div className="pointer-events-none absolute inset-x-0 z-[500] flex justify-center" style={{ top: 'calc((100dvh - var(--sheet-h)) / 2 + 28px)' }}>
          <span className="rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">Xaritani suring — joyingizni belgilang</span>
        </div>
      )}

      {/* header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="m-3 flex items-center justify-between rounded-xl border border-border bg-surface/95 px-4 py-2 shadow-sm backdrop-blur-sm">
          <div>
            <p className="brand-gradient text-sm font-bold tracking-tight">Almaz Silver</p>
            <p className="font-mono text-2xs text-muted">{ctx.data.order_no}</p>
          </div>
          <div className="text-right">
            <p className="text-2xs text-muted">Mahsulotlar</p>
            <p className="tnum text-sm font-semibold text-text">{fmtSom(ctx.data.items_total)}</p>
          </div>
        </div>
      </div>

      {/* my-location FAB */}
      {!mapFailed && (
        <button
          type="button"
          onClick={useMyLocation}
          aria-label="Mening joylashuvim"
          className="mapx-fab absolute right-4 z-[500] flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-accent-ink shadow-lg [touch-action:manipulation] active:scale-95"
          style={{ bottom: 'calc(var(--sheet-h) + 14px)' }}
        >
          <Crosshair className="h-6 w-6" strokeWidth={1.75} />
        </button>
      )}

      {/* bottom sheet */}
      <BottomSheet
        snap={snap}
        onSnap={setSnap}
        vh={vh}
        kbInset={kbInset}
        onHeight={onSheetHeight}
        peek={
          <div className="px-4 pb-2">
            {inResult && resolveData ? (
              <div className="flex items-center justify-between gap-2 py-0.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${isBts ? 'bg-accent-soft text-accent-ink' : 'bg-success-soft text-success'}`}>
                  {isBts ? <Store className="h-3.5 w-3.5" strokeWidth={2} /> : <Truck className="h-3.5 w-3.5" strokeWidth={2} />}
                  {isBts ? 'Filialdan olib ketish' : 'Kuryer yetkazadi'}
                </span>
                <span className="tnum text-right text-sm">
                  <span className="font-bold text-accent-ink">{fmtSom(resolveData.grand_total)}</span>
                  <span className="ml-1 text-2xs text-muted">· yetkazish {fmtSom(resolveData.delivery_fee)}</span>
                </span>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 py-1 text-sm text-muted">
                <MapPin className="h-4 w-4 shrink-0 text-accent-ink" strokeWidth={1.75} />
                {stale ? "Joy o'zgardi — qayta hisoblang" : 'Xaritada joyingizni belgilang'}
              </p>
            )}
          </div>
        }
        footer={
          <>
            {geoDenied && <p className="mb-2 text-2xs text-muted">Joylashuvga ruxsat berilmadi — xaritani suring.</p>}
            {resolveErr && (
              <p className="mb-2 flex items-center gap-1.5 text-2xs text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> Ulanishda xatolik. Qayta urinib ko'ring.
              </p>
            )}
            {confirmErr && (
              <p className="mb-2 flex items-center gap-1.5 text-2xs text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {confirmErr}
              </p>
            )}
            {inResult && !noBranches && (
              <button
                type="button"
                onClick={goStale}
                className="mb-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium text-text [touch-action:manipulation] active:scale-[0.99]"
              >
                <MapPin className="h-4 w-4" strokeWidth={1.75} /> Joyni o'zgartirish
              </button>
            )}
            {footerButton}
          </>
        }
      >
        {resolve.isPending ? (
          <div className="space-y-2 py-3">
            {[0, 1, 2].map((i) => (<div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />))}
          </div>
        ) : !inResult ? (
          <p className="px-1 py-4 text-center text-sm text-muted">
            Xaritada markazdagi belgini joyingizga to'g'rilang, so'ng «{stale ? 'Qayta hisoblash' : 'Manzilni tasdiqlash'}».
          </p>
        ) : (
          <>
            {isBts && resolveData && (
              resolveData.branches.length > 0 ? (
                <BranchList branches={resolveData.branches} selectedId={selectedBranchId} nearestId={resolveData.branches[0]?.id} onSelect={(id) => selectBranch(id, true)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted">Bu hududda filial topilmadi. Boshqa joyni belgilang.</p>
              )
            )}
            {resolveData && !isBts && (
              <p className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm text-muted">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" strokeWidth={1.75} /> Kuryer belgilagan manzilingizga yetkazadi.
              </p>
            )}
            {resolveData && (
              <div className="mt-2 pb-2">
                <button type="button" onClick={() => setShowExtra((v) => !v)} className="flex w-full items-center justify-between py-2 text-sm font-medium text-text [touch-action:manipulation]">
                  Qo'shimcha ma'lumot (ixtiyoriy)
                  <ChevronDown className={`h-4 w-4 text-muted transition-transform ${showExtra ? 'rotate-180' : ''}`} strokeWidth={1.75} />
                </button>
                {showExtra && (
                  <div className="space-y-2 pt-1">
                    <Field value={phone} onChange={setPhone} placeholder="Telefon" type="tel" inputMode="tel" onFocus={focusExpand} />
                    {!isBts && (
                      <>
                        <Field value={address} onChange={setAddress} placeholder="Manzil (ko'cha, uy)" onFocus={focusExpand} />
                        <Field value={apartment} onChange={setApartment} placeholder="Xonadon" inputMode="numeric" onFocus={focusExpand} />
                      </>
                    )}
                    <Field value={landmark} onChange={setLandmark} placeholder="Mo'ljal" onFocus={focusExpand} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </BottomSheet>
    </div>
  );
}
