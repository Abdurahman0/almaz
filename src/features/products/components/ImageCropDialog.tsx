import { useEffect, useMemo, useRef, useState } from 'react';
import { Move } from 'lucide-react';
import { Button, Modal } from '@/shared/ui';

const VIEW = 300; // square crop viewport (css px)
const OUT = 1000; // exported square size (px)

/**
 * Square crop-on-upload. The customer/salesperson drags + zooms the image inside a
 * square frame — exactly the box the product card shows — so they pick which part
 * is visible before it's saved. The chosen square is baked into the uploaded file,
 * so it renders identically (and filled, no letterbox) across every surface.
 */
export function ImageCropDialog({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (f: File) => void;
}) {
  const src = useMemo(() => URL.createObjectURL(file), [file]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const baseScale = nat ? Math.max(VIEW / nat.w, VIEW / nat.h) : 1;
  const scale = baseScale * zoom;

  const clamp = (o: { x: number; y: number }, s = scale) => {
    if (!nat) return o;
    const iw = nat.w * s, ih = nat.h * s;
    return { x: Math.min(0, Math.max(VIEW - iw, o.x)), y: Math.min(0, Math.max(VIEW - ih, o.y)) };
  };

  useEffect(() => {
    if (nat) setOff((o) => clamp(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, nat]);

  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const im = e.currentTarget;
    const w = im.naturalWidth, h = im.naturalHeight;
    const s = Math.max(VIEW / w, VIEW / h);
    setNat({ w, h });
    setOff({ x: (VIEW - w * s) / 2, y: (VIEW - h * s) / 2 }); // centred
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: off.x, oy: off.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setOff(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }));
  };
  const onPointerUp = () => { drag.current = null; };

  const confirm = () => {
    const img = imgRef.current;
    if (!img || !nat) return;
    setBusy(true);
    const sSize = VIEW / scale; // source square side in natural px
    const sx = -off.x / scale;
    const sy = -off.y / scale;
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const cx = canvas.getContext('2d');
    if (!cx) { setBusy(false); return; }
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) return;
        onDone(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <Modal open onClose={onCancel} heading="Rasmni moslang">
      <div className="space-y-4">
        <p className="text-xs text-muted">
          Rasmni suring va kattalashtiring — CRM'da aynan shu kvadrat ko'rinadi.
        </p>
        <div className="mx-auto" style={{ width: VIEW }}>
          <div
            className="relative overflow-hidden rounded-xl bg-surface-2 [touch-action:none]"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              ref={imgRef}
              src={src}
              alt=""
              onLoad={onLoad}
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
              style={{
                width: nat ? nat.w * scale : 'auto',
                height: nat ? nat.h * scale : 'auto',
                transform: `translate(${off.x}px, ${off.y}px)`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/25" />
            <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-2xs text-white">
              <Move className="h-3 w-3" strokeWidth={2} /> Suring
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Kattalashtirish"
            className="mt-3 w-full accent-[var(--accent)]"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Bekor qilish
          </Button>
          <Button type="button" onClick={confirm} loading={busy}>
            Kesish va yuklash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
