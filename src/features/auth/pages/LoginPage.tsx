import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { Button, Input, PasswordInput } from '@/shared/ui';
import { RingCanvas } from '@/shared/ui/RingCanvas';
import { useIsAuthenticated } from '@/shared/stores/auth';
import { useLogin } from '../hooks';
import { useT } from '@/shared/lib/i18n';
import { prefetchRingAssets, ringFramesRatio } from '@/shared/lib/ringFrames';
import type { ApiError } from '@/shared/api/client';

const schema = z.object({
  email: z.string().email("Email noto'g'ri kiritildi"),
  password: z.string().min(4, "Parol kamida 4 ta belgi bo'lishi kerak"),
});
type FormValues = z.infer<typeof schema>;

const POSTER = '/video/login-poster.webp';

/**
 * Full-bleed cinematic video behind the login card. Starts muted (autoplay
 * policy) with a discreet speaker toggle to enable sound. Degrades to the
 * poster-only still under prefers-reduced-motion, a data-saver connection, or a
 * decode failure — and never blocks the form: it renders behind the card and
 * loads lazily (preload="metadata"), the card is interactive immediately.
 */
function LoginBackground() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  // Poster-only when motion is reduced or the OS/browser signals data-saver.
  const posterOnly = useMemo(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData;
    return reduced || Boolean(saveData);
  }, []);

  const still = posterOnly || failed;

  const toggleAudio = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted) void v.play().catch(() => {});
    setMuted(v.muted);
  };

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden bg-bg">
        {still ? (
          <img src={POSTER} alt="" className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={POSTER}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          >
            <source src="/video/login.webm" type="video/webm" />
            <source src="/video/login.mp4" type="video/mp4" />
          </video>
        )}
        {/* Legibility scrim. Tablet/mobile: an even dark overlay (card centered).
            Desktop (≥1024px): directional — transparent on the left so the scene
            stays visible, darkening toward the right under the card, plus a soft
            radial directly beneath it. The card is opaque (bg-surface) so it
            stays legible across all 5 presets on either scrim. */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              'radial-gradient(78% 62% at 50% 50%, rgba(0,0,0,0.60), rgba(0,0,0,0.46) 70%, rgba(0,0,0,0.54))',
          }}
        />
        <div
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              'linear-gradient(100deg, transparent 36%, rgba(0,0,0,0.30) 62%, rgba(0,0,0,0.60) 100%), radial-gradient(42% 58% at 82% 50%, rgba(0,0,0,0.42), transparent 72%)',
          }}
        />
      </div>

      {!still && (
        <button
          type="button"
          onClick={toggleAudio}
          aria-label={muted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
          className="login-audio-toggle fixed bottom-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/70 backdrop-blur-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {muted ? <VolumeX className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Volume2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        </button>
      )}
    </>
  );
}

export default function LoginPage() {
  const authed = useIsAuthenticated();
  const loginMutation = useLogin();
  const t = useT();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Start downloading + decoding the intro assets the moment the form is up, so
  // the intro is ready by submit. A barely-visible accent line at the card's
  // bottom edge hints at turntable progress; it vanishes once fully loaded.
  const [assetProgress, setAssetProgress] = useState(0);
  useEffect(() => {
    prefetchRingAssets();
    const mountT = performance.now();
    const w = window as unknown as { __ringRatio?: number; __ringReadyMs?: number };
    const id = window.setInterval(() => {
      const r = ringFramesRatio();
      setAssetProgress(r);
      w.__ringRatio = r;
      if (r >= 1) { w.__ringReadyMs = Math.round(performance.now() - mountT); window.clearInterval(id); }
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  if (authed) return <Navigate to="/" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 lg:justify-end lg:pr-[7vw]">
      <LoginBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="card-velvet relative z-10 w-full max-w-md p-10 shadow-lg"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <RingCanvas size={96} rotationMs={9000} className="-my-3" />
          <h1 className="brand-gradient text-xl font-bold tracking-tight">{t('auth.title')}</h1>
          <p className="text-sm text-muted">{t('auth.subtitle')}</p>
        </div>

        <form
          onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
          className="space-y-5"
          noValidate
        >
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            placeholder="siz@almaz.uz"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordInput
            label={t('auth.password')}
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          {loginMutation.isError && (
            <p className="rounded-xl border border-danger-soft bg-danger-soft px-4 py-2.5 text-sm text-danger">
              {(loginMutation.error as unknown as ApiError).message}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={loginMutation.isPending}>
            {t('auth.submit')}
          </Button>
        </form>

        {assetProgress > 0.02 && assetProgress < 1 && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
            style={{ borderBottomLeftRadius: 'var(--r-lg)', borderBottomRightRadius: 'var(--r-lg)' }}
          >
            <span
              className="block h-full bg-accent/60 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round(assetProgress * 100)}%` }}
            />
          </span>
        )}
      </motion.div>
    </div>
  );
}
