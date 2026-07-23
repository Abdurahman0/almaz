import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Input, PasswordInput } from '@/shared/ui';
import { RingSpin } from '@/shared/ui/RingSpin';
import { useIsAuthenticated } from '@/shared/stores/auth';
import { useLogin } from '../hooks';
import { useT } from '@/shared/lib/i18n';
import { getRingFrames } from '@/shared/lib/ringFrames';
import type { ApiError } from '@/shared/api/client';

const schema = z.object({
  email: z.string().email("Email noto'g'ri kiritildi"),
  password: z.string().min(4, "Parol kamida 4 ta belgi bo'lishi kerak"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const authed = useIsAuthenticated();
  const loginMutation = useLogin();
  const t = useT();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // warm the intro's spin frames while the user types credentials
  useEffect(() => {
    void getRingFrames().catch(() => {});
  }, []);

  if (authed) return <Navigate to="/" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="card-velvet relative z-10 w-full max-w-md p-10"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <RingSpin size={148} speed={0.6} className="-my-6 translate-x-3" />
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
      </motion.div>
    </div>
  );
}
