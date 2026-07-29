import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
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

const TASHKENT: [number, number] = [41.311081, 69.279737];

// Space-grouped thousands ("50 000 so'm") — Uzbek convention, matches the doc.
// (ICU 'uz-UZ' renders a comma, which reads wrong locally.)
const fmtSom = (n: number): string =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

/**
 * A dead link is one the customer can't recover from on this page — invalid,
 * already used, or expired. Those get a clean full-screen state (not a toast).
 * lat/lng-missing and branch-selection errors are recoverable and handled inline.
 */
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
    <div className="flex h-dvh items-center justify-center bg-bg px-5 text-center text-text">
      {children}
    </div>
  );
}

function DeadLink({ message }: { message: string }) {
  return (
    <FullScreen>
      <div className="max-w-sm rounded-[var(--r-lg)] border border-border bg-surface p-8">
        <AlertTriangle className="mx-auto h-11 w-11 text-danger" strokeWidth={1.5} />
        <p className="mt-4 text-md font-semibold">Havola ochilmadi</p>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    </FullScreen>
  );
}

function SuccessScreen({ data }: { data: MapConfirmOut }) {
  const isBts = data.location_type === 'BTS' && data.bts_branch;
  return (
    <FullScreen>
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-[var(--r-lg)] border border-border bg-surface p-8">
        <CheckCircle2 className="h-14 w-14 text-success" strokeWidth={1.5} />
        <p className="text-lg font-semibold">Qabul qilindi!</p>
        <p className="font-mono text-2xs text-muted">{data.order_no}</p>

        {isBts && data.bts_branch ? (
          <div className="w-full rounded-[var(--r-md)] bg-surface-2 p-4 text-left text-sm">
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
          <div className="w-full rounded-[var(--r-md)] bg-surface-2 p-4 text-left text-sm">
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className={`tnum ${strong ? 'text-md font-bold text-accent-ink' : 'text-text'}`}>{value}</span>
    </div>
  );
}

// ---- main page --------------------------------------------------------------

export default function MapPage() {
  const { token = '' } = useParams();

  // GET /map/{token}: header context + our "is this link alive?" probe.
  const ctx = useQuery({
    queryKey: ['map-ctx', token],
    queryFn: () => getMapContext(token),
    retry: false,
    enabled: Boolean(token),
  });

  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pinRef = useRef<any>(null);

  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);

  const [resolveData, setResolveData] = useState<MapResolveOut | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [deadLink, setDeadLink] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [apartment, setApartment] = useState('');

  useEffect(() => {
    document.title = "Almaz Silver — Yetkazib berish manzili";
  }, []);

  // Place / move the pin. Uses only refs + stable setters, so the closure the
  // map's click handler captures at init stays correct across re-renders.
  const placePin = useCallback((pt: [number, number]) => {
    const ymaps = window.ymaps;
    const map = mapRef.current;
    if (!ymaps || !map) return;
    if (!pinRef.current) {
      const pm = new ymaps.Placemark(pt, {}, { draggable: true, preset: 'islands#redIcon' });
      pm.events.add('dragend', () => {
        const c = pm.geometry.getCoordinates();
        setCoords([c[0], c[1]]);
      });
      map.geoObjects.add(pm);
      pinRef.current = pm;
    } else {
      pinRef.current.geometry.setCoordinates(pt);
    }
    setCoords([pt[0], pt[1]]);
  }, []);

  // ---- resolve (debounced on pin move) — token stays open --------------------
  const resolve = useMutation({
    mutationFn: (pt: [number, number]) => resolveMap(token, { lat: pt[0], lng: pt[1] }),
    onSuccess: (data) => {
      setResolveData(data);
      setSelectedBranchId(null); // fresh location → fresh branch list
    },
    onError: (e) => {
      const dl = deadLinkMessage(e);
      if (dl) setDeadLink(dl);
    },
  });
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  useEffect(() => {
    if (!coords) return;
    const id = window.setTimeout(() => resolveRef.current.mutate(coords), 500);
    return () => window.clearTimeout(id);
  }, [coords]);

  // ---- confirm — closes the token, one time only -----------------------------
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
      // "Tanlangan BTS filiali topilmadi" → list is stale; re-resolve.
      if (/topilmadi/i.test((e as ApiError)?.message ?? '') && coords) {
        setSelectedBranchId(null);
        resolveRef.current.mutate(coords);
      }
    },
  });

  // ---- init the map ----------------------------------------------------------
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
        map.events.add('click', (e: { get: (k: string) => [number, number] }) => placePin(e.get('coords')));
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
        pinRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.isSuccess, mapFailed]);

  const useMyLocation = () => {
    setGeoDenied(false);
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (mapRef.current) mapRef.current.setCenter(p, 16, { duration: 400 });
        placePin(p);
      },
      () => setGeoDenied(true), // denial is graceful — they can still place manually
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ---- non-map screens -------------------------------------------------------
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
  const canConfirm = Boolean(
    coords && resolveData && !confirm.isPending && (!isBts || selectedBranchId),
  );
  const confirmErr = confirm.isError && !deadLink ? (confirm.error as ApiError)?.message : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-text">
      {/* full-screen map */}
      {mapFailed ? (
        <div className="flex h-full items-center justify-center px-6 pb-64 text-center text-sm text-muted">
          Xarita yuklanmadi. «Mening joylashuvim» tugmasidan foydalaning.
        </div>
      ) : (
        <div ref={mapBoxRef} className="absolute inset-0 bg-surface-2" />
      )}

      {/* quiet header: order + items total */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
        <div className="mx-auto flex max-w-lg items-center justify-between rounded-[var(--r-lg)] border border-border bg-surface/95 px-4 py-2 shadow-sm backdrop-blur-sm">
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

      {/* prominent my-location button */}
      {!mapFailed && (
        <button
          type="button"
          onClick={useMyLocation}
          className="absolute right-4 top-20 z-20 flex h-12 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-accent-ink shadow-md transition-transform active:scale-95"
        >
          <Crosshair className="h-5 w-5" strokeWidth={1.75} /> Mening joylashuvim
        </button>
      )}

      {/* bottom action sheet */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3">
        <div className="mx-auto flex max-h-[72dvh] max-w-lg flex-col overflow-hidden rounded-[var(--r-lg)] border border-border bg-surface shadow-xl">
          {/* header row of the sheet */}
          <div className="shrink-0 border-b border-border px-4 pt-3">
            {!coords ? (
              <p className="flex items-center gap-1.5 pb-3 text-sm text-muted">
                <MapPin className="h-4 w-4 shrink-0 text-accent-ink" strokeWidth={1.75} />
                Xaritada joyingizni belgilang yoki «Mening joylashuvim».
              </p>
            ) : firstResolvePending ? (
              <p className="flex items-center gap-2 pb-3 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> Zona aniqlanmoqda…
              </p>
            ) : resolveData ? (
              <div className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold ${
                      isBts ? 'bg-accent-soft text-accent-ink' : 'bg-success-soft text-success'
                    }`}
                  >
                    {isBts ? <Store className="h-3.5 w-3.5" strokeWidth={2} /> : <Truck className="h-3.5 w-3.5" strokeWidth={2} />}
                    {isBts ? 'Filialdan olib ketish' : 'Kuryer yetkazadi'}
                  </span>
                  {resolve.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" strokeWidth={1.75} />}
                </div>
                <div className="mt-2 space-y-1">
                  <Row label="Yetkazish" value={fmtSom(resolveData.delivery_fee)} />
                  <Row label="Jami" value={fmtSom(resolveData.grand_total)} strong />
                </div>
                {isBts && (
                  <p className="mt-2 text-2xs font-medium text-text">
                    Yaqin filialni tanlang ({resolveData.branches.length} ta):
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* scrollable middle: BTS branch list */}
          {resolveData && isBts && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {resolveData.branches.length > 0 ? (
                <BranchList branches={resolveData.branches} selectedId={selectedBranchId} onSelect={setSelectedBranchId} />
              ) : (
                <p className="py-4 text-center text-2xs text-muted">
                  Bu hududda filial topilmadi. Boshqa joyni belgilab ko'ring.
                </p>
              )}
            </div>
          )}

          {/* optional contact fields (compact) */}
          {resolveData && (
            <div className="shrink-0 space-y-2 px-4 pt-1">
              {!isBts && (
                <Field value={address} onChange={setAddress} placeholder="Manzil (ko'cha, uy)" />
              )}
              <div className="flex gap-2">
                <Field value={phone} onChange={setPhone} placeholder="Telefon" inputMode="tel" />
                {!isBts && <Field value={apartment} onChange={setApartment} placeholder="Xonadon" />}
              </div>
              <Field value={landmark} onChange={setLandmark} placeholder="Mo'ljal (ixtiyoriy)" />
            </div>
          )}

          {/* footer: confirm */}
          <div className="shrink-0 space-y-2 p-4 pt-3">
            {geoDenied && (
              <p className="text-2xs text-muted">
                Joylashuvga ruxsat berilmadi — xaritada qo'lda belgilang.
              </p>
            )}
            {confirmErr && (
              <p className="flex items-center gap-1.5 text-2xs text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} /> {confirmErr}
              </p>
            )}
            <button
              type="button"
              onClick={() => canConfirm && !confirm.isSuccess && confirm.mutate()}
              disabled={!canConfirm || (!mapFailed && !ready)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--r-md)] bg-accent text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {confirm.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Yuborilmoqda…
                </>
              ) : isBts && !selectedBranchId && resolveData ? (
                'Filialni tanlang'
              ) : (
                'Tasdiqlash'
              )}
            </button>
            {coords && (
              <p className="text-center text-2xs text-muted tnum">
                {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputMode?: 'tel' | 'text';
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="h-11 w-full rounded-[var(--r-md)] border border-border bg-surface-2 px-3 text-sm text-text outline-none placeholder:text-muted focus:border-accent"
    />
  );
}
