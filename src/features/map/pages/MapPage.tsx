import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  Store,
  Truck,
} from 'lucide-react';
import { loadYandexMaps } from '@/shared/lib/yandexMaps';
import type { ApiError } from '@/shared/api/client';
import { confirmMap, getMapContext, resolveMap } from '../api';
import type { MapConfirmBody, MapConfirmOut, MapResolveOut } from '../types';
import { BranchList } from '../components/BranchList';
import { BottomSheet, SNAP_FRAC, type Snap } from '../components/BottomSheet';

const TASHKENT: [number, number] = [41.311081, 69.279737];

const fmtSom = (n: number): string =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

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
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-5 text-center text-text">
      {children}
    </div>
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

// ---- small controls ---------------------------------------------------------

function Field({
  value,
  onChange,
  placeholder,
  inputMode,
  type,
  onFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputMode?: 'tel' | 'numeric' | 'text';
  type?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      type={type}
      onFocus={onFocus}
      // 16px avoids iOS focus auto-zoom.
      className="h-12 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-[16px] text-text outline-none placeholder:text-muted focus:border-accent"
    />
  );
}

// ---- main page --------------------------------------------------------------

export default function MapPage() {
  const { token = '' } = useParams();

  const ctx = useQuery({
    queryKey: ['map-ctx', token],
    queryFn: () => getMapContext(token),
    retry: false,
    enabled: Boolean(token),
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const interactedRef = useRef(false);

  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800));
  const [kbInset, setKbInset] = useState(0);
  const [snap, setSnap] = useState<Snap>('peek');
  const [coords, setCoords] = useState<[number, number] | null>(null);
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

  useEffect(() => {
    document.title = "Almaz Silver — Yetkazib berish manzili";
  }, []);

  // Lock body scroll / bounce behind the sheet.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (document.body.style as CSSStyleDeclaration & { overscrollBehavior?: string }).overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Track viewport height (dvh) + on-screen keyboard via visualViewport.
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    const vv = window.visualViewport;
    const onVv = () => {
      if (!vv) return;
      setKbInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    vv?.addEventListener('resize', onVv);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      vv?.removeEventListener('resize', onVv);
    };
  }, []);

  // Write the sheet's live visible height to a CSS var (no re-render during drag).
  const onSheetHeight = useCallback((px: number, animate: boolean) => {
    const r = rootRef.current;
    if (!r) return;
    r.style.setProperty('--sheet-h', `${px}px`);
    r.dataset.animating = animate ? 'true' : 'false';
  }, []);

  const setDragging = useCallback((on: boolean) => {
    if (rootRef.current) rootRef.current.dataset.dragging = on ? 'true' : 'false';
  }, []);
  const markInteracted = useCallback(() => {
    if (!interactedRef.current) {
      interactedRef.current = true;
      setInteracted(true);
    }
  }, []);

  // ---- resolve (debounced on map centre change) — token stays open ----
  const resolve = useMutation({
    mutationFn: (pt: [number, number]) => resolveMap(token, { lat: pt[0], lng: pt[1] }),
    onSuccess: (data) => {
      setResolveData(data);
      setSelectedBranchId(null);
      setSnap(data.requires_branch_selection ? 'half' : 'peek');
    },
    onError: (e) => {
      const dl = deadLinkMessage(e);
      if (dl) setDeadLink(dl);
    },
  });
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  useEffect(() => {
    if (!coords || !interactedRef.current) return;
    const id = window.setTimeout(() => resolveRef.current.mutate(coords), 400);
    return () => window.clearTimeout(id);
  }, [coords]);

  // ---- confirm — closes the token, one time only ----
  const confirm = useMutation<MapConfirmOut, unknown, void>({
    mutationFn: () => {
      const [lat, lng] = coords!;
      const body: MapConfirmBody = { lat, lng };
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
      if (dl) {
        setDeadLink(dl);
        return;
      }
      if (/topilmadi/i.test((e as ApiError)?.message ?? '') && coords) {
        setSelectedBranchId(null);
        resolveRef.current.mutate(coords);
      }
    },
  });

  // ---- init the map ----
  useEffect(() => {
    if (!ctx.isSuccess || mapFailed) return;
    let disposed = false;
    loadYandexMaps()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((ymaps: any) => {
        if (disposed || !mapBoxRef.current || mapRef.current) return;
        const map = new ymaps.Map(
          mapBoxRef.current,
          { center: TASHKENT, zoom: 12, controls: ['zoomControl'] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
        );
        mapRef.current = map;
        map.events.add('actionbegin', () => {
          setDragging(true);
          markInteracted();
        });
        map.events.add('actionend', () => {
          setDragging(false);
          const c = map.getCenter() as [number, number];
          setCoords([c[0], c[1]]);
        });
        setReady(true);
      })
      .catch(() => {
        if (!disposed) setMapFailed(true);
      });
    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.isSuccess, mapFailed]);

  // The visible map area shrinks with the sheet; refit so the centre pin stays
  // over the same point, above the sheet, once the snap settles.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        mapRef.current?.container.fitToViewport();
      } catch {
        /* noop */
      }
    }, 340);
    return () => window.clearTimeout(t);
  }, [snap, vh, kbInset]);

  const useMyLocation = () => {
    setGeoDenied(false);
    markInteracted();
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (mapRef.current) mapRef.current.setCenter(p, 16, { duration: 400 });
        else setCoords(p);
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
  if (ctx.isPending) {
    return (
      <FullScreen>
        <Loader2 className="h-8 w-8 animate-spin text-accent" strokeWidth={1.75} />
      </FullScreen>
    );
  }
  if (deadLink) return <DeadLink message={deadLink} />;
  if (ctx.isError) {
    return <DeadLink message={deadLinkMessage(ctx.error) ?? "Havola yaroqsiz. Sotuvchidan yangi havola so'rang."} />;
  }
  if (confirm.isSuccess && confirm.data) return <SuccessScreen data={confirm.data} />;

  const isBts = resolveData?.location_type === 'BTS';
  const firstResolvePending = resolve.isPending && !resolveData;
  const canConfirm = Boolean(coords && resolveData && !confirm.isPending && (!isBts || selectedBranchId));
  const confirmErr = confirm.isError && !deadLink ? (confirm.error as ApiError)?.message : null;
  const confirmLabel = !resolveData
    ? 'Joyni belgilang'
    : isBts && !selectedBranchId
      ? 'Filialni tanlang'
      : 'Tasdiqlash';

  return (
    <div
      ref={rootRef}
      className="mapx-root fixed inset-0 overflow-hidden bg-bg text-text"
      style={{ ['--sheet-h' as string]: `${initialSheetH}px`, height: '100dvh' }}
    >
      {/* map fills the area above the sheet */}
      {mapFailed ? (
        <div className="mapx-map absolute inset-x-0 top-0 flex items-center justify-center px-6 text-center text-sm text-muted" style={{ height: 'calc(100dvh - var(--sheet-h))' }}>
          Xarita yuklanmadi. «Mening joylashuvim» tugmasidan foydalaning.
        </div>
      ) : (
        <div
          ref={mapBoxRef}
          className="mapx-map absolute inset-x-0 top-0 bg-surface-2"
          style={{ height: 'calc(100dvh - var(--sheet-h))' }}
        />
      )}

      {/* fixed centre crosshair — the map pans under it */}
      {!mapFailed && (
        <div
          className="mapx-cross pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 -translate-y-full"
          style={{ top: 'calc((100dvh - var(--sheet-h)) / 2)' }}
        >
          <MapPin className="mapx-pin h-11 w-11 text-danger" strokeWidth={2} fill="currentColor" />
          <span className="mx-auto -mt-2 block h-1.5 w-1.5 rounded-full bg-black/50" />
        </div>
      )}

      {/* first-load hint */}
      {!interacted && !mapFailed && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center" style={{ top: 'calc((100dvh - var(--sheet-h)) / 2 + 28px)' }}>
          <span className="rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">
            Xaritani suring — joyingizni belgilang
          </span>
        </div>
      )}

      {/* quiet header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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

      {/* my-location FAB — thumb zone, above the sheet */}
      {!mapFailed && (
        <button
          type="button"
          onClick={useMyLocation}
          aria-label="Mening joylashuvim"
          className="mapx-fab absolute right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-accent-ink shadow-lg [touch-action:manipulation] active:scale-95"
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
            {firstResolvePending ? (
              <p className="flex items-center gap-2 py-1 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> Zona aniqlanmoqda…
              </p>
            ) : resolveData ? (
              <div className="flex items-center justify-between gap-2 py-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${
                    isBts ? 'bg-accent-soft text-accent-ink' : 'bg-success-soft text-success'
                  }`}
                >
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
                <MapPin className="h-4 w-4 shrink-0 text-accent-ink" strokeWidth={1.75} /> Joyingizni belgilang
              </p>
            )}
          </div>
        }
        footer={
          <>
            {geoDenied && (
              <p className="mb-2 text-2xs text-muted">Joylashuvga ruxsat berilmadi — xaritani suring.</p>
            )}
            {confirmErr && (
              <p className="mb-2 flex items-center gap-1.5 text-2xs text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {confirmErr}
              </p>
            )}
            <button
              type="button"
              onClick={() => canConfirm && !confirm.isSuccess && confirm.mutate()}
              disabled={!canConfirm || (!mapFailed && !ready)}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white shadow-sm [touch-action:manipulation] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {confirm.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Yuborilmoqda…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </>
        }
      >
        {/* scrollable content */}
        {firstResolvePending ? (
          <div className="space-y-2 py-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : (
          <>
            {isBts && resolveData && (
              resolveData.branches.length > 0 ? (
                <BranchList branches={resolveData.branches} selectedId={selectedBranchId} onSelect={setSelectedBranchId} />
              ) : (
                <p className="py-6 text-center text-sm text-muted">
                  Bu hududda filial topilmadi. Xaritada boshqa joyni belgilang.
                </p>
              )
            )}

            {resolveData && !isBts && (
              <p className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm text-muted">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" strokeWidth={1.75} />
                Kuryer belgilagan manzilingizga yetkazadi.
              </p>
            )}

            {/* optional details, collapsed by default */}
            {resolveData && (
              <div className="mt-2 pb-2">
                <button
                  type="button"
                  onClick={() => setShowExtra((v) => !v)}
                  className="flex w-full items-center justify-between py-2 text-sm font-medium text-text [touch-action:manipulation]"
                >
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
