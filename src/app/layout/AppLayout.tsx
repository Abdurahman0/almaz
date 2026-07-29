import { Outlet } from 'react-router-dom';
import { Sidebar, MobileNav } from './Sidebar';
import { Topbar } from './Topbar';
import { IntroOverlay } from '../IntroOverlay';

export function AppLayout() {
  return (
    <div className="flex h-dvh gap-3 overflow-hidden bg-bg p-3 lg:gap-4 lg:p-4">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--r-lg)] border border-border bg-surface shadow-sm">
        <Topbar />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-20 pt-6 md:pb-8 lg:px-8"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className="mx-auto w-full max-w-content">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
      <IntroOverlay />
    </div>
  );
}
