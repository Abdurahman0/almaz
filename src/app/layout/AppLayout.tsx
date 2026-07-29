import { Outlet } from 'react-router-dom';
import { Sidebar, MobileNav } from './Sidebar';
import { Topbar } from './Topbar';
import { IntroOverlay } from '../IntroOverlay';

export function AppLayout() {
  return (
    // app-canvas paints soft accent blobs behind everything so the glass panels
    // have something to blur. Header and content are now SEPARATE glass panels —
    // no shared solid parent surface.
    <div className="app-canvas flex h-dvh gap-3 overflow-hidden bg-bg p-3 lg:gap-4 lg:p-4">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden lg:gap-4">
        <Topbar />
        {/* No content panel — page components float directly on the canvas. */}
        <main
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0.5 pb-20 md:pb-2"
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
