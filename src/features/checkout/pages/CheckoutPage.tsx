import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Crosshair, MapPin } from 'lucide-react';
import { Button, Input, Money, Textarea, toast } from '@/shared/ui';
import { loadYandexMaps } from '@/shared/lib/yandexMaps';
import type { ApiError } from '@/shared/api/client';
import { getCheckoutContext, submitCheckout } from '../api';

const TASHKENT: [number, number] = [41.311081, 69.279737];
const zoneLabels: Record<string, string> = { tashkent: 'Toshkent', region: 'Viloyat' };

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
  const markRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [apartment, setApartment] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      submitCheckout(token, {
        lat: coords ? coords[0] : null,
        lng: coords ? coords[1] : null,
        address_text: address.trim() || null,
        phone: phone.trim() || null,
        landmark: landmark.trim() || null,
        apartment: apartment.trim() || null,
      }),
    onError: (e) => toast.error((e as unknown as ApiError).message || 'Yuborishda xatolik'),
  });

  // reverse-geocode a point into an address line (best effort)
  const geocode = (pt: [number, number]) => {
    if (!window.ymaps?.geocode) return;
    window.ymaps
      .geocode(pt)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        const first = res.geoObjects.get(0);
        if (first) setAddress((prev) => prev || first.getAddressLine());
      })
      .catch(() => {});
  };

  const place = (pt: [number, number], pan = false) => {
    setCoords(pt);
    if (markRef.current) markRef.current.geometry.setCoordinates(pt);
    if (pan && mapRef.current) mapRef.current.setCenter(pt, 16, { duration: 300 });
    geocode(pt);
  };

  // init the map once the context is loaded and the container is in the DOM
  useEffect(() => {
    if (!ctx.isSuccess || mapFailed) return;
    let disposed = false;
    loadYandexMaps()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((ymaps: any) => {
        if (disposed || !mapBoxRef.current || mapRef.current) return;
        const map = new ymaps.Map(mapBoxRef.current, { center: TASHKENT, zoom: 11, controls: ['zoomControl'] }, { suppressMapOpenBlock: true });
        const mark = new ymaps.Placemark(TASHKENT, {}, { draggable: true, preset: 'islands#redDotIcon' });
        map.geoObjects.add(mark);
        mapRef.current = map;
        markRef.current = mark;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.events.add('click', (e: any) => { const c = e.get('coords') as [number, number]; setCoords(c); mark.geometry.setCoordinates(c); geocode(c); });
        mark.events.add('dragend', () => { const c = mark.geometry.getCoordinates() as [number, number]; setCoords(c); geocode(c); });
      })
      .catch(() => { if (!disposed) setMapFailed(true); });
    return () => {
      disposed = true;
      if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; markRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.isSuccess, mapFailed]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Joylashuv mavjud emas'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => place([pos.coords.latitude, pos.coords.longitude], true),
      () => toast.error('Joylashuvni aniqlab bo\'lmadi'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="min-h-screen bg-bg px-4 py-8 text-text">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="brand-gradient text-2xl font-bold tracking-tight">Almaz Silver</h1>
          <p className="mt-1 text-sm text-muted">Yetkazib berish manzili</p>
        </div>

        {ctx.isPending && (
          <div className="card-velvet space-y-4 p-6">
            <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
            <div className="h-64 w-full animate-pulse rounded-xl bg-surface-2" />
          </div>
        )}

        {ctx.isError && (
          <div className="card-velvet p-8 text-center">
            <p className="text-md font-semibold text-text">Havola yaroqsiz</p>
            <p className="mt-2 text-sm text-muted">
              {(ctx.error as unknown as ApiError).message || "Havola muddati o'tgan yoki allaqachon ishlatilgan."}
            </p>
          </div>
        )}

        {submit.isSuccess && (
          <div className="card-velvet flex flex-col items-center gap-3 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-success" strokeWidth={1.5} />
            <p className="text-lg font-semibold text-text">Lokatsiya qabul qilindi</p>
            <p className="text-sm text-muted">
              Rahmat! Endi to'lovga o'ting — операторимиз/AI chatда to'lov kartasini yuboradi.
            </p>
          </div>
        )}

        {ctx.isSuccess && !submit.isSuccess && (
          <div className="card-velvet space-y-5 p-6">
            {/* order summary */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs text-muted">Buyurtma</p>
                <p className="font-mono text-sm font-semibold text-text">{ctx.data.order_no}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Mahsulotlar</p>
                <p className="tnum text-sm font-semibold text-accent-ink"><Money value={ctx.data.items_total} /></p>
              </div>
            </div>

            {/* zone prices (auto-selected by location) */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Yetkazish narxi (joylashuvga qarab avtomatik)</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ctx.data.zones).map(([z, fee]) => (
                  <span key={z} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-text">
                    <span className="font-medium">{zoneLabels[z] ?? z}</span>
                    <span className="tnum text-muted"><Money short value={fee} /></span>
                  </span>
                ))}
              </div>
            </div>

            {/* map */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} /> Xaritada joyni belgilang
                </span>
                <button type="button" onClick={useMyLocation} className="flex items-center gap-1 text-xs text-accent-ink hover:underline">
                  <Crosshair className="h-3.5 w-3.5" strokeWidth={1.75} /> Mening joylashuvim
                </button>
              </div>
              {mapFailed ? (
                <div className="rounded-xl border border-dashed border-border bg-surface-2/40 px-4 py-6 text-center text-xs text-muted">
                  Xarita yuklanmadi. «Mening joylashuvim» tugmasidan foydalaning yoki manzilni qo'lда yozing.
                </div>
              ) : (
                <div ref={mapBoxRef} className="h-64 w-full overflow-hidden rounded-xl border border-border bg-surface-2" />
              )}
              <p className="mt-1.5 text-2xs text-muted">
                {coords ? `Tanlangan: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}` : 'Nuqta tanlanmagan'}
              </p>
            </div>

            {/* address detail */}
            <div className="space-y-3">
              <Textarea label="Manzil" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ko'cha, uy" rows={2} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 111 22 33" inputMode="tel" />
                <Input label="Orientir (mo'ljal)" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Metro yonida" />
              </div>
              <Input label="Qavat / xonadon / domofon" value={apartment} onChange={(e) => setApartment(e.target.value)} placeholder="5-qavat, 34-xonadon" />
            </div>

            <Button
              size="lg"
              className="w-full"
              loading={submit.isPending}
              disabled={!coords}
              onClick={() => submit.mutate()}
            >
              Yuborish
            </Button>
            {!coords && <p className="text-center text-2xs text-muted">Davom etish uchun xaritada joyni belgilang</p>}
          </div>
        )}
      </div>
    </div>
  );
}
