import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applyThemeAttrs, useUiStore } from '@/shared/stores/ui';
import { ToastViewport, TooltipProvider } from '@/shared/ui';
import { BackgroundVideo } from './BackgroundVideo';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemeSync() {
  const preset = useUiStore((s) => s.preset);
  const glassEnabled = useUiStore((s) => s.glassEnabled);
  useEffect(() => {
    applyThemeAttrs(preset);
  }, [preset]);
  useEffect(() => {
    document.documentElement.dataset.glass = glassEnabled ? 'on' : 'off';
  }, [glassEnabled]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeSync />
        <BackgroundVideo />
        {children}
        <ToastViewport />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
