/*
 * Extracts the 30 spin frames of the 3D ring webm into ImageBitmaps, once per
 * session. Canvas renderers crossfade adjacent frames for butter-smooth slow
 * rotation — at 14s/rotation the raw 30-frame video steps visibly (~2fps),
 * so interpolation is required rather than optional.
 */

const FRAME_COUNT = 30;

let cache: Promise<ImageBitmap[]> | null = null;

export function getRingFrames(assetPath = '/'): Promise<ImageBitmap[]> {
  if (!cache) {
    cache = extract(assetPath).catch((e) => {
      cache = null; // allow retry on transient failure
      throw e;
    });
  }
  return cache;
}

async function extract(assetPath: string): Promise<ImageBitmap[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.src = `${assetPath}ring_spin_512.webm`;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('ring frames: video load failed'));
    video.load();
  });
  const duration = video.duration;
  const frames: ImageBitmap[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = Math.min(duration - 0.001, (i / FRAME_COUNT) * duration + 0.001);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = t;
    });
    frames.push(await createImageBitmap(video));
  }
  video.removeAttribute('src');
  return frames;
}

export const RING_FRAME_COUNT = FRAME_COUNT;
