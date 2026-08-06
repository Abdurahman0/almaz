import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Mic, Pause, Play } from 'lucide-react';

/** Only one voice message plays at a time (Instagram behaviour). */
let nowPlaying: HTMLAudioElement | null = null;

const BAR_COUNT = 30;

/** Deterministic pseudo-waveform from the url — the real waveform isn't available
 *  (cross-origin CDN, no Web Audio access), so bars are stable per message. */
function barsFor(url: string, n = BAR_COUNT): number[] {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) { h ^= url.charCodeAt(i); h = Math.imul(h, 16777619) | 0; }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h |= 0;
    out.push(5 + (Math.abs(h) % 14)); // 5..18 px
  }
  return out;
}

const fmt = (s: number) =>
  Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '−:−−';

const SPEEDS = [1, 1.5, 2] as const;

/**
 * Instagram-DM-style voice message: circular play/pause, seekable waveform whose
 * played portion fills, live duration, and a 1×/1.5×/2× speed toggle. Inherits the
 * bubble's text color (`out` bubbles are accent-filled). Falls back to a plain
 * open-externally chip when the audio can't load (IG CDN links expire).
 */
export function VoiceMessage({ url, out }: { url: string; out: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const bars = barsFor(url);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'metadata';
    a.src = url;
    audioRef.current = a;
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : null);
    const onTime = () => {
      setCurrent(a.currentTime);
      if (Number.isFinite(a.duration) && a.duration > 0) setProgress(a.currentTime / a.duration);
    };
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrent(0); };
    const onErr = () => setFailed(true);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    a.addEventListener('error', onErr);
    return () => {
      a.pause();
      if (nowPlaying === a) nowPlaying = null;
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('error', onErr);
    };
  }, [url]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      if (nowPlaying && nowPlaying !== a) nowPlaying.pause();
      nowPlaying = a;
      a.playbackRate = SPEEDS[speedIdx];
      a.play().then(() => setPlaying(true)).catch(() => setFailed(true));
    }
  };

  // keep `playing` honest when another message pauses this one
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPause = () => setPlaying(false);
    a.addEventListener('pause', onPause);
    return () => a.removeEventListener('pause', onPause);
  }, []);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(a.duration) || a.duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = frac * a.duration;
    setProgress(frac);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  if (failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors ${
          out ? 'bg-white/15 text-on-accent hover:bg-white/25' : 'border border-border bg-surface-2 text-text hover:border-strong'
        }`}
      >
        <Mic className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Ovozli xabar
        <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
      </a>
    );
  }

  const shownTime = playing || current > 0 ? current : duration;

  return (
    <div className={`flex min-w-[210px] items-center gap-2.5 ${out ? 'text-on-accent' : 'text-text'}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "To'xtatish" : 'Tinglash'}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
          out ? 'bg-white/20 hover:bg-white/30' : 'bg-accent-btn text-on-accent hover:bg-accent-btn-hover'
        }`}
      >
        {playing
          ? <Pause className="h-4 w-4 fill-current" strokeWidth={0} />
          : <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={0} />}
      </button>

      {/* waveform — click to seek; played bars full-opacity, rest dimmed */}
      <div
        role="slider"
        aria-label="Ovoz jadvali"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onClick={seek}
        className="flex h-9 flex-1 cursor-pointer items-center gap-[2px]"
      >
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-[2.5px] rounded-full bg-current transition-opacity"
            style={{ height: `${h}px`, opacity: i / BAR_COUNT <= progress && progress > 0 ? 1 : 0.35 }}
          />
        ))}
      </div>

      <span className={`tnum shrink-0 text-2xs ${out ? 'text-on-accent/75' : 'text-muted'}`}>
        {fmt(shownTime ?? NaN)}
      </span>
      <button
        type="button"
        onClick={cycleSpeed}
        aria-label="Tezlik"
        className={`tnum shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-semibold transition-colors ${
          out ? 'bg-white/15 hover:bg-white/25' : 'bg-surface-2 text-muted hover:text-text'
        }`}
      >
        {SPEEDS[speedIdx]}×
      </button>
    </div>
  );
}
