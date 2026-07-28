/*
 * Lazy Yandex Maps JS API (v2.1) loader. The script is injected once and the
 * ready `ymaps` object is cached. An API key can be supplied via
 * VITE_YANDEX_MAPS_KEY; without one the API still loads for light use. Callers
 * must handle rejection (offline / blocked) and degrade to manual entry.
 */
declare global {
  interface Window {
    // Yandex Maps global — untyped third-party API.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps?: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loader: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadYandexMaps(): Promise<any> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (window.ymaps?.ready) {
      window.ymaps.ready(() => resolve(window.ymaps));
      return;
    }
    const key = import.meta.env.VITE_YANDEX_MAPS_KEY as string | undefined;
    const params = new URLSearchParams({ lang: 'uz_UZ' });
    if (key) params.set('apikey', key);
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps?.ready) { reject(new Error('ymaps missing')); return; }
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => { loader = null; reject(new Error('yandex maps failed to load')); };
    document.head.appendChild(script);
  });
  return loader;
}
