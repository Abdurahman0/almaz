import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MeResponse } from '@/shared/api/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: MeResponse | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: MeResponse | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'almaz-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
    },
  ),
);

export const useIsAuthenticated = (): boolean => useAuthStore((s) => Boolean(s.accessToken));
