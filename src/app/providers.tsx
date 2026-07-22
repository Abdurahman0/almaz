import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applyThemeAttrs, useUiStore } from '@/shared/stores/ui';
import { ToastViewport, TooltipProvider } from '@/shared/ui';

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
  useEffect(() => {
    applyThemeAttrs(preset);
  }, [preset]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeSync />
        {children}
        <ToastViewport />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
