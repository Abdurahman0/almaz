import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Maximize2 } from 'lucide-react';
import { Modal } from '@/shared/ui';

const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIB = '&copy; OpenStreetMap';

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="30" height="38" viewBox="0 0 30 38"><path d="M15 1 C7 1 1 7.3 1 15 c0 9.6 12 21.4 13.4 21.4 h1.2 C17 36.4 29 24.6 29 15 29 7.3 23 1 15 1z" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/><circle cx="15" cy="14.5" r="5" fill="var(--on-accent)"/></svg>`,
    iconSize: [30, 38],
    iconAnchor: [15, 36],
  });
}

function branchIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="26" height="26" viewBox="0 0 26 26"><rect x="3" y="8" width="20" height="14" rx="2" fill="var(--surface)" stroke="var(--accent-strong)" stroke-width="2"/><path d="M3 12 h20 M9 8 v-3 h8 v3" fill="none" stroke="var(--accent-strong)" stroke-width="2"/></svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 24],
  });
}

function mount(
  el: HTMLElement,
  lat: number,
  lng: number,
  interactive: boolean,
  branch?: { lat: number; lng: number } | null,
): L.Map {
  const map = L.map(el, {
    zoomControl: interactive,
    dragging: interactive,
    scrollWheelZoom: interactive,
    doubleClickZoom: interactive,
    touchZoom: interactive,
    boxZoom: false,
    keyboard: interactive,
    attributionControl: false,
  }).setView([lat, lng], 15);
  L.tileLayer(TILES, { attribution: ATTRIB }).addTo(map);
  L.marker([lat, lng], { icon: pinIcon(), interactive: false }).addTo(map);
  if (branch) {
    L.marker([branch.lat, branch.lng], { icon: branchIcon(), interactive: false }).addTo(map);
    L.polyline(
      [
        [lat, lng],
        [branch.lat, branch.lng],
      ],
      { dashArray: '6 6', weight: 2, color: 'var(--accent-strong)', opacity: 0.8 },
    ).addTo(map);
    map.fitBounds(
      L.latLngBounds([lat, lng], [branch.lat, branch.lng]).pad(0.25),
      { animate: false },
    );
  }
  return map;
}

interface OrderMapPreviewProps {
  lat: number;
  lng: number;
  /** BTS branch marker + dashed connector (drawn when the API exposes it). */
  branch?: { lat: number; lng: number } | null;
}

/** Non-interactive ~200px map preview with the customer pin; click expands to a
 *  full modal map. Deep links let a courier navigate (Google / Yandex). */
export function OrderMapPreview({ lat, lng, branch }: OrderMapPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const map = mount(el, lat, lng, false, branch);
    return () => { map.remove(); };
  }, [lat, lng, branch]);

  useEffect(() => {
    if (!expanded) return;
    // Modal content mounts after the dialog animates in.
    const t = window.setTimeout(() => {
      const el = modalRef.current;
      if (!el) return;
      const map = mount(el, lat, lng, true, branch);
      el.dataset.mounted = '1';
      (el as HTMLElement & { _map?: L.Map })._map = map;
    }, 60);
    return () => {
      window.clearTimeout(t);
      const el = modalRef.current as (HTMLElement & { _map?: L.Map }) | null;
      el?._map?.remove();
      if (el) delete el.dataset.mounted;
    };
  }, [expanded, lat, lng, branch]);

  const gmaps = `https://www.google.com/maps?q=${lat},${lng}`;
  const ymaps = `https://yandex.com/maps/?pt=${lng},${lat}&z=16`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Xaritani kattalashtirish"
        className="group relative block h-[200px] w-full overflow-hidden rounded-[var(--r-sm)] border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <div ref={previewRef} className="pointer-events-none h-full w-full" />
        <span className="absolute right-2 top-2 z-[500] rounded-[var(--r-xs)] border border-border bg-surface p-1.5 text-muted opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
      </button>
      <div className="flex gap-3 text-xs">
        <a href={gmaps} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-ink hover:underline">
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} /> Google xarita
        </a>
        <a href={ymaps} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-ink hover:underline">
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} /> Yandex xarita
        </a>
      </div>

      <Modal open={expanded} onClose={() => setExpanded(false)} heading="Yetkazish manzili" wide>
        <div ref={modalRef} className="h-[420px] w-full overflow-hidden rounded-[var(--r-sm)] border border-border" />
      </Modal>
    </div>
  );
}
