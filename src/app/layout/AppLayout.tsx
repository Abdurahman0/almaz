import { Sidebar, MobileNav } from './Sidebar';
import { Topbar } from './Topbar';
import { RingTransition } from '@/app/RingTransition';

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 w-full flex-1 flex-col">
        <Topbar />
        <main className="w-full flex-1 px-6 pb-24 pt-8 md:pb-10 lg:px-10">
          <div className="mx-auto w-full max-w-content">
            <RingTransition />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
