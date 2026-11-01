'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { isPublicRoute } from '@/lib/tc/public-routes';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen bg-canvas">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />

          <main className="min-w-0 flex-1 px-5 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
