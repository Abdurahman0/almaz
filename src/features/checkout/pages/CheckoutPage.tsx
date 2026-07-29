import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Crosshair, MapPin } from 'lucide-react';
import { Button, Input, Money, toast } from '@/shared/ui';
import { loadYandexMaps } from '@/shared/lib/yandexMaps';
import type { ApiError } from '@/shared/api/client';
import { getCheckoutContext, submitCheckout } from '../api';

const TASHKENT: [number, number] = [41.311081, 69.279737];
const zoneLabels: Record<string, string> = { tashkent: 'Toshkent', region: 'Viloyat' };

/**
 * Customer delivery-location chooser — a full-screen map. A fixed pin sits at the
 * centre; the map pans under it, so wherever the map is centred IS the chosen
 * location (lat/lng captured automatically — no typing coordinates). The address
 * line reverse-geocodes as you move. Confirm sends it to the backend.
 */
export default function CheckoutPage() {
  const { token = '' } = useParams();
  const ctx = useQuery({
    queryKey: ['checkout', token],
    queryFn: () => getCheckoutContext(token),
    retry: false,
    enabled: Boolean(token),
  });

  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const geoTimer = useRef<number | undefined>(undefined);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [mapFailed, setMapFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      submitCheckout(token, {
        lat: coords ? coords[0] : null,
        lng: coords ? coords[1] : null,
        address_text: address.trim() || null,
        phone: phone.trim() || null,
      }),
    onError: (e) => toast.error((e as unknown as ApiError).message || 'Yuborishda xatolik'),
  });

  // reverse-geocode the centre into an address line (debounced, best effort)
  const geocode = (pt: [number, number]) => {
    window.clearTimeout(geoTimer.current);
    geoTimer.current = window.setTimeout(() => {
      if (!window.ymaps?.geocode) return;
      window.ymaps
        .geocode(pt)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((res: any) => {
          const first = res.geoObjects.get(0);
          if (first) setAddress(first.getAddressLine());
        })
        .catch(() => {});
    }, 450);
  };

  useEffect(() => {
    if (!ctx.isSuccess || mapFailed) return;
    let disposed = false;
    loadYandexMaps()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((ymaps: any) => {
        if (disposed || !mapBoxRef.current || mapRef.current) return;
        const map = new ymaps.Map(
          mapBoxRef.current,
          { center: TASHKENT, zoom: 12, controls: [] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
        );
        mapRef.current = map;
        // the map centre is the chosen point — update live while panning
        const sync = () => { const c = map.getCenter() as [number, number]; setCoords([c[0], c[1]]); };
        map.events.add('boundschange', sync);
        map.events.add('actionend', () => { const c = map.getCenter() as [number, number]; setCoords([c[0], c[1]]); geocode([c[0], c[1]]); });
        setCoords(TASHKENT);
        geocode(TASHKENT);
        setReady(true);
      })
      .catch(() => { if (!disposed) setMapFailed(true); });
    return () => {
      disposed = true;
      window.clearTimeout(geoTimer.current);
      if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.isSuccess, mapFailed]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Joylashuv mavjud emas'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (mapRef.current) mapRef.current.setCenter(p, 16, { duration: 400 });
        else setCoords(p);
      },
      () => toast.error("Joylashuvni aniqlab bo'lmadi"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ---- non-map states (loading / invalid / done) ----
  if (ctx.isPending) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }
  if (ctx.isError) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg px-4 text-center text-text">
        <div className="glass max-w-sm rounded-[var(--r-lg)] p-8">
          <p className="text-md font-semibold">Havola yaroqsiz</p>
          <p className="mt-2 text-sm text-muted">
            {(ctx.error as unknown as ApiError).message || "Havola muddati o'tgan yoki allaqachon ishlatilgan."}
          </p>
        </div>
      </div>
    );
  }
  if (submit.isSuccess) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg px-4 text-center text-text">
        <div className="glass flex max-w-sm flex-col items-center gap-3 rounded-[var(--r-lg)] p-8">
          <CheckCircle2 className="h-12 w-12 text-success" strokeWidth={1.5} />
          <p className="text-lg font-semibold">Lokatsiya qabul qilindi</p>
          <p className="text-sm text-muted">Rahmat! Endi to'lovga o'ting — operatorimiz to'lov kartasini yuboradi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-text">
      {/* full-screen map */}
      {mapFailed ? (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
          Xarita yuklanmadi. «Mening joylashuvim» tugmasidan foydalaning yoki manzilni qo'lda yozing.
        </div>
      ) : (
        <div ref={mapBoxRef} className="absolute inset-0 bg-surface-2" />
      )}

      {/* fixed centre pin — its tip marks the exact chosen point */}
      {!mapFailed && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <MapPin className="h-10 w-10 text-danger drop-shadow-lg" strokeWidth={2} fill="currentColor" />
          <span className="mx-auto mt-[-6px] block h-1.5 w-1.5 rounded-full bg-black/50" />
        </div>
      )}

      {/* top: brand + order summary */}
      <div className="absolute inset-x-0 top-0 z-20 p-3">
        <div className="glass mx-auto flex max-w-lg items-center justify-between rounded-[var(--r-lg)] px-4 py-2.5">
          <div>
            <p className="brand-gradient text-sm font-bold tracking-tight">Almaz Silver</p>
            <p className="font-mono text-2xs text-muted">{ctx.data.order_no}</p>
          </div>
          <div className="text-right">
            <p className="text-2xs text-muted">Mahsulotlar</p>
            <p className="tnum text-sm font-semibold text-accent-ink"><Money value={ctx.data.items_total} /></p>
          </div>
        </div>
      </div>

      {/* my-location button */}
      {!mapFailed && (
        <button
          type="button"
          onClick={useMyLocation}
          aria-label="Mening joylashuvim"
          className="glass absolute right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full text-accent-ink transition-transform active:scale-95"
          style={{ bottom: 'calc(var(--sheet-h, 230px) + 12px)' }}
        >
          <Crosshair className="h-5 w-5" strokeWidth={1.75} />
        </button>
      )}

      {/* bottom sheet: address + phone + confirm */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3">
        <div className="glass mx-auto max-w-lg space-y-3 rounded-[var(--r-lg)] p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} /> Xaritani suring — pin joyni belgilaydi
          </div>

          {/* zone prices (auto-applied by location) */}
          {Object.keys(ctx.data.zones).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ctx.data.zones).map(([z, fee]) => (
                <span key={z} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-2xs text-text">
                  {zoneLabels[z] ?? z} <span className="tnum text-muted"><Money short value={fee} /></span>
                </span>
              ))}
            </div>
          )}

          <Input
            label="Manzil"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ko'cha, uy (xaritadan avtomatik)"
          />
          <Input
            label="Telefon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 111 22 33"
            inputMode="tel"
          />

          <Button
            size="lg"
            className="w-full"
            loading={submit.isPending}
            disabled={!coords || (!mapFailed && !ready)}
            onClick={() => submit.mutate()}
          >
            Tasdiqlash va yuborish
          </Button>
          {coords && (
            <p className="text-center text-2xs text-muted tnum">
              {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
