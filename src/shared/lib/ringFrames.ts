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

// ---------------- fetch pool + progress ----------------
/** Parallel fetch+decode workers. 6 keeps the pipe full without stalling the
 *  main thread with 180 simultaneous decodes; the browser interleaves these
 *  fetch() requests with the (streaming, preload=metadata) background video. */
const CONCURRENCY = 6;

async function loadOne(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ring asset ${url}: ${res.status}`);
  return createImageBitmap(await res.blob());
}

/** Drain `urls` into `out` with a fixed worker pool; `onEach` ticks per decode. */
async function loadPool(urls: string[], out: ImageBitmap[], onEach?: () => void): Promise<ImageBitmap[]> {
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= urls.length) return;
      out[i] = await loadOne(urls[i]);
      onEach?.();
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  return out;
}

// ---------------- full-res frame sequence (intro) ----------------
let framesCache: Promise<ImageBitmap[]> | null = null;
let framesLoaded = 0;
let framesReadyFlag = false;

/** True once the whole turntable is decoded (the intro can play instantly). */
export function ringFramesReady(): boolean {
  return framesReadyFlag;
}
/** 0..1 fraction of the turntable decoded so far (drives the gate + hint). */
export function ringFramesRatio(): number {
  return framesLoaded / FRAME_COUNT;
}

export function getRingFrames(assetPath = '/'): Promise<ImageBitmap[]> {
  if (!framesCache) {
    framesCache = loadFrames(assetPath).catch((e) => {
      framesCache = null; // allow retry on transient failure
      framesReadyFlag = false;
      framesLoaded = 0;
      throw e;
    });
  }
  return framesCache;
}

async function loadFrames(assetPath: string): Promise<ImageBitmap[]> {
  const base = `${assetPath}${RING_ASSET_BASE}/frames`;
  const urls = Array.from({ length: FRAME_COUNT }, (_, i) => `${base}/ring_${String(i).padStart(4, '0')}.webp`);
  const out: ImageBitmap[] = new Array(FRAME_COUNT);
  framesLoaded = 0;
  framesReadyFlag = false;
  await loadPool(urls, out, () => { framesLoaded += 1; });
  framesReadyFlag = true;
  return out;
}

// ---------------- tilt sequence (intro peak approach) ----------------
/*
 * 48-frame 3D tilt (public/ring/tilt/tilt_0000.webp … tilt_0047.webp), 1600px
 * transparent WebP. Frame 0 is framed identically to turntable frame 0 (gem
 * facing camera, silhouette bbox measured pixel-for-pixel equal) so the
 * turntable->tilt handoff is seamless; frame 47 is pixel-identical to the
 * inner-band hero (inner_clean), so the tilt->hero handoff is seamless too. The
 * peak plays 0->47 (tip up, present the inner wall) while the ring scales in.
 */
export const TILT_ASSET_BASE = 'ring/tilt';
export const TILT_COUNT = 48;

let tiltCache: Promise<ImageBitmap[]> | null = null;

export function getTiltFrames(assetPath = '/'): Promise<ImageBitmap[]> {
  if (!tiltCache) {
    tiltCache = loadTiltFrames(assetPath).catch((e) => {
      tiltCache = null; // allow retry on transient failure
      throw e;
    });
  }
  return tiltCache;
}

async function loadTiltFrames(assetPath: string): Promise<ImageBitmap[]> {
  const base = `${assetPath}${TILT_ASSET_BASE}`;
  const urls = Array.from({ length: TILT_COUNT }, (_, i) => `${base}/tilt_${String(i).padStart(4, '0')}.webp`);
  return loadPool(urls, new Array(TILT_COUNT));
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
 * Engraving geometry re-measured from the NEW heroes (tilt frame 47 render,
 * 1600px) by diffing inner_clean vs inner_engraved (6222 cut pixels):
 *   - letters occupy x 55.6-82.0%, y 43.2-64.6%, centroid (0.686, 0.497)
 *   - principal axis ~26.8deg (image coords), i.e. the baseline runs down-right
 *   - reading order Almaz(0.557,0.458, upper-left) -> Silver(0.817,0.636,
 *     lower-right), reading direction (0.826,0.564)
 * The reveal mask sweeps along that baseline UL->LR, a CSS gradient angle of
 * ~124deg (see ENGRAVE_ANGLE in IntroOverlay). Flip ENGRAVE_SWEEP_DIR to reverse.
 */
export const ENGRAVE_CENTROID = { x: 0.686, y: 0.497 };
export const ENGRAVE_BASELINE_DEG = 27;
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
 * Warm all intro asset sets in the background from the moment the login route
 * mounts — NOT gated behind requestIdleCallback, so the ~20 MB actually lands
 * during the 10-30s a user typically spends on the login screen and the intro
 * can start instantly on submit.
 *
 * Priority order (chained so each set gets the full 6-worker pipe in turn):
 *   turntable (gate asset) -> tilt -> heroes -> sidebar spritesheet.
 * The background video is preload="metadata" and streams via range requests, so
 * it never starves these fetches. The turntable + heroes must never be the skip
 * reason — the readiness gate only ever waits on the turntable.
 */
export function prefetchRingAssets(assetPath = '/'): void {
  void getRingFrames(assetPath)
    .catch(() => {})
    .then(() => getTiltFrames(assetPath).catch(() => {}))
    .then(() => getEngraveReady(assetPath).catch(() => {}))
    .then(() => getRingSheet(assetPath).catch(() => {}));
}
