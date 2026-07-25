/*
 * v2 ring turntable assets (public/ring/v2/).
 *
 * - Full-res 1200px WebP sequence (frames/ring_0000.webp … ring_0179.webp):
 *   180 frames, 2 deg/frame, seamless loop. Used by the login intro where the
 *   ring is huge on screen. Decoded to ImageBitmaps and held in memory.
 * - 320px spritesheet (spritesheet.webp, 15x12 tiles) + spritesheet.json:
 *   one small texture for the sidebar idle spin (~34-38px on screen).
 *
 * 180 frames are natively smooth — renderers step frames plainly, no crossfade.
 */

export const RING_ASSET_BASE = 'ring/v2';
export const FRAME_COUNT = 180;
export const DEG_PER_FRAME = 2;
/** Gem faces the camera most directly, band inner side fully open (frame 0). */
export const GEM_FRAME = 0;

/**
 * v2 frames are rendered perfectly centered (silhouette center = frame center,
 * measured 0.0000 offset), so no re-centering is needed. Kept as an export so
 * canvas renderers can multiply by size unconditionally.
 */
export const RING_CENTER_OFFSET = { x: 0, y: 0 };

/** rotation fraction (0..1) -> nearest frame index, plain stepping. */
export function frameIndexFor(pos: number): number {
  const n = FRAME_COUNT;
  return ((Math.round((((pos % 1) + 1) % 1) * n) % n) + n) % n;
}

// ---------------- full-res frame sequence (intro) ----------------
let framesCache: Promise<ImageBitmap[]> | null = null;

export function getRingFrames(assetPath = '/'): Promise<ImageBitmap[]> {
  if (!framesCache) {
    framesCache = loadFrames(assetPath).catch((e) => {
      framesCache = null; // allow retry on transient failure
      throw e;
    });
  }
  return framesCache;
}

async function loadOne(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ring frame ${url}: ${res.status}`);
  return createImageBitmap(await res.blob());
}

async function loadFrames(assetPath: string): Promise<ImageBitmap[]> {
  const base = `${assetPath}${RING_ASSET_BASE}/frames`;
  const urls = Array.from({ length: FRAME_COUNT }, (_, i) => `${base}/ring_${String(i).padStart(4, '0')}.webp`);
  const out: ImageBitmap[] = new Array(FRAME_COUNT);
  // decode in bounded-concurrency batches: parallel enough to be fast, not so
  // wide it stalls the main thread with 180 simultaneous decodes
  const BATCH = 12;
  for (let i = 0; i < urls.length; i += BATCH) {
    const slice = urls.slice(i, i + BATCH);
    const bmps = await Promise.all(slice.map(loadOne));
    bmps.forEach((b, j) => (out[i + j] = b));
  }
  return out;
}

// ---------------- spritesheet (sidebar idle) ----------------
export interface RingSheet {
  image: ImageBitmap;
  frameW: number;
  frameH: number;
  cols: number;
  rows: number;
  count: number;
}
interface SheetDescriptor {
  frameW: number;
  frameH: number;
  cols: number;
  rows: number;
  count: number;
}

let sheetCache: Promise<RingSheet> | null = null;

export function getRingSheet(assetPath = '/'): Promise<RingSheet> {
  if (!sheetCache) {
    sheetCache = loadSheet(assetPath).catch((e) => {
      sheetCache = null;
      throw e;
    });
  }
  return sheetCache;
}

async function loadSheet(assetPath: string): Promise<RingSheet> {
  const base = `${assetPath}${RING_ASSET_BASE}`;
  const [descRes, imgRes] = await Promise.all([
    fetch(`${base}/spritesheet.json`),
    fetch(`${base}/spritesheet.webp`),
  ]);
  if (!descRes.ok || !imgRes.ok) throw new Error('ring spritesheet load failed');
  const desc = (await descRes.json()) as SheetDescriptor;
  const image = await createImageBitmap(await imgRes.blob());
  return { image, frameW: desc.frameW, frameH: desc.frameH, cols: desc.cols, rows: desc.rows, count: desc.count };
}

// ---------------- inner-band engraving hero (intro peak) ----------------
export const ENGRAVE_CLEAN = 'ring/engrave/inner_clean.webp';
export const ENGRAVE_ENGRAVED = 'ring/engrave/inner_engraved.webp';
/**
 * Engraving geometry measured from the upright render (2400px frame): the
 * "Almaz Silver" letters occupy x 57-80%, y 31-53%, centroid (0.692, 0.392),
 * baseline principal axis ~41deg. Text reads upper-left (Almaz) -> lower-right
 * (Silver) along the band arc, so the reveal mask sweeps UL->LR; that maps to a
 * CSS gradient angle of ~131deg (see ENGRAVE_ANGLE in IntroOverlay). Flip
 * ENGRAVE_SWEEP_DIR to reverse.
 */
export const ENGRAVE_CENTROID = { x: 0.692, y: 0.392 };
export const ENGRAVE_BASELINE_DEG = 41;
export const ENGRAVE_SWEEP_DIR = 1; // 1: Almaz(UL) -> Silver(LR), measured reading order

let engraveCache: Promise<void> | null = null;

/** Decode both hero images so the engraving phase never waits on them. */
export function getEngraveReady(assetPath = '/'): Promise<void> {
  if (!engraveCache) {
    engraveCache = Promise.all(
      [ENGRAVE_CLEAN, ENGRAVE_ENGRAVED].map(
        (p) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => (img.decode ? img.decode().then(() => resolve(), () => resolve()) : resolve());
            img.onerror = () => reject(new Error(`engrave ${p} load failed`));
            img.src = `${assetPath}${p}`;
          }),
      ),
    ).then(() => undefined).catch((e) => {
      engraveCache = null;
      throw e;
    });
  }
  return engraveCache;
}

/**
 * Warm all intro asset sets in the background (login screen): the heavy frame
 * sequence, the small spritesheet, and the two tiny engraving heroes. The
 * engraving pair (~0.42 MB) is trivial and must never be why the intro skips.
 */
export function prefetchRingAssets(assetPath = '/'): void {
  const kick = () => {
    void getRingSheet(assetPath).catch(() => {});
    void getEngraveReady(assetPath).catch(() => {});
    void getRingFrames(assetPath).catch(() => {});
  };
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (ric) ric(kick);
  else window.setTimeout(kick, 200);
}
