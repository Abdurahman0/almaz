import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth';
import { useIntroStore } from '@/shared/stores/intro';
import { login, fetchMe } from './api';
import type { LoginRequest } from '@/shared/api/types';

export function useLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const tokens = await login(body);
      // Arm the one-time intro BEFORE tokens land: setTokens flips `authed`,
      // which immediately triggers LoginPage's <Navigate replace> — the intro
      // must already be suppressing the page-transition ring at that point,
      // or it flashes for a few frames. Plays only on a real login, never on
      // refresh/restore.
      useIntroStore.getState().request();
      setTokens(tokens.access_token, tokens.refresh_token);
      const me = await fetchMe();
      setUser(me);
      return me;
    },
    onSuccess: () => {
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    },
  });
}
