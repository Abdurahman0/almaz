import { Bell, LogOut } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/stores/auth';
import { api } from '@/shared/api/client';
import type { NotificationOut } from '@/shared/api/types';
import { formatDateTime } from '@/shared/lib/format';
import { useT } from '@/shared/lib/i18n';
import { ThemePopover } from './ThemePopover';

function NotificationsPopover() {
  const t = useT();
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () =>
      (await api.get<NotificationOut[]>('/notifications', { params: { limit: 10 } })).data,
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Bildirishnomalar"
          className="relative rounded-lg p-2 text-muted transition-colors hover:bg-accent-soft hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Bell className="h-5 w-5" strokeWidth={1.5} />
          {notifications && notifications.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="end"
          className="float-panel float-in z-40 max-h-96 w-80 overflow-y-auto p-3"
        >
          {!notifications?.length && (
            <p className="p-4 text-center text-sm text-muted">{t('common.empty.title')}</p>
          )}
          {notifications?.map((n) => (
            <div key={n.id} className="border-b border-border p-3 text-sm last:border-0">
              <p className="text-text">{n.body}</p>
              <p className="tnum mt-1 text-xs text-muted">{formatDateTime(n.created_at)}</p>
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const t = useT();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-end gap-2 border-b border-border bg-glass px-6 py-3 backdrop-blur">
      <ThemePopover />
      <NotificationsPopover />

      <div className="mx-2 hidden text-right sm:block">
        <p className="text-sm font-semibold text-text">{user?.full_name}</p>
        <p className="text-xs text-muted">{user?.roles.join(', ')}</p>
      </div>

      <button
        onClick={logout}
        aria-label={t('nav.logout')}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <LogOut className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </header>
  );
}
