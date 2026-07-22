import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth';
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
