import type { UseQueryResult } from '@tanstack/react-query';
import { Badge, Card, ErrorCard, Money, Skeleton } from '@/shared/ui';
import type { DeliveryOut } from '@/shared/api/types';
import { OrderMapPreview } from '../OrderMapPreview';

const statusLabels: Record<string, string> = {
  pending: 'Kutilmoqda',
  awaiting_address: 'Manzil kutilmoqda',
  ready: 'Tayyor',
  dispatched: "Yo'lga chiqdi",
  delivered: 'Yetkazildi',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-text">{children}</dd>
    </div>
  );
}

interface DeliveryCardProps {
  delivery: UseQueryResult<DeliveryOut>;
}

/**
 * Where it's going. Zone badge (Toshkent kuryer / BTS), the /map-collected
 * contact fields, a static Leaflet preview when lat/lng exist, and courier deep
 * links. NOTE: for BTS the chosen branch (name/address/hours) is not exposed on
 * the order — only the pin coordinates land in DeliveryOut (docs/API-GAPS.md).
 */
export function DeliveryCard({ delivery }: DeliveryCardProps) {
  return (
    <Card className="print-block">
      <h2 className="mb-3 text-md font-semibold text-text">Yetkazib berish</h2>

      {delivery.isPending && <Skeleton className="h-40 w-full" />}
      {delivery.isError &&
        ((delivery.error as { status?: number | null } | null)?.status === 404 ? (
          <p className="text-sm text-muted">Yetkazib berish maʼlumoti yo'q</p>
        ) : (
          <ErrorCard error={delivery.error} onRetry={() => delivery.refetch()} />
        ))}

      {delivery.isSuccess && (() => {
        const d = delivery.data;
        const branch = d.bts_branch ?? null;
        const branchPin =
          branch?.lat != null && branch?.lng != null
            ? { lat: Number(branch.lat), lng: Number(branch.lng) }
            : null;
        return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {delivery.data.zone === 'tashkent' && <Badge tone="gold">Toshkent — kuryer</Badge>}
            {delivery.data.zone === 'region' && (
              <Badge tone="gold">{delivery.data.provider === 'bts' ? 'BTS — filialdan olib ketish' : 'Viloyat'}</Badge>
            )}
            {!delivery.data.zone && <Badge tone="muted">Hudud aniqlanmagan</Badge>}
            <Badge tone={delivery.data.status === 'delivered' ? 'success' : 'muted'}>
              {statusLabels[delivery.data.status] ?? delivery.data.status}
            </Badge>
          </div>

          {/* BTS branch block — renders automatically once the API returns
              bts_branch on the delivery (docs/API-GAPS.md order-detail #2). */}
          {branch && (
            <div className="rounded-[var(--r-sm)] border border-border bg-surface-2 p-3">
              <p className="text-sm font-semibold text-text">{branch.name}</p>
              {branch.address && <p className="mt-0.5 text-xs text-muted">{branch.address}</p>}
              <p className="tnum mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                {branch.work_hours && <span>{branch.work_hours}</span>}
                {branch.phone && (
                  <a href={`tel:${branch.phone}`} className="text-accent-ink hover:underline">
                    {branch.phone}
                  </a>
                )}
              </p>
            </div>
          )}

          <dl className="space-y-1.5">
            {delivery.data.address_text && <Row label="Manzil">{delivery.data.address_text}</Row>}
            {delivery.data.landmark && <Row label="Orientir">{delivery.data.landmark}</Row>}
            {delivery.data.apartment && <Row label="Xonadon">{delivery.data.apartment}</Row>}
            {delivery.data.phone && (
              <Row label="Telefon">
                <a href={`tel:${delivery.data.phone}`} className="tnum text-accent-ink hover:underline">
                  {delivery.data.phone}
                </a>
              </Row>
            )}
            <Row label="Yetkazish narxi">
              <Money value={delivery.data.fee} />
            </Row>
          </dl>

          {delivery.data.lat && delivery.data.lng ? (
            <OrderMapPreview
              lat={Number(delivery.data.lat)}
              lng={Number(delivery.data.lng)}
              branch={branchPin}
            />
          ) : (
            <p className="rounded-[var(--r-sm)] border border-dashed border-border py-4 text-center text-xs text-muted">
              Lokatsiya hali yuborilmagan
            </p>
          )}
        </div>
        );
      })()}
    </Card>
  );
}
