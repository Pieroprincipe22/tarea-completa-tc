import type { Metadata } from 'next';

import AuthGate from '@/components/AuthGate';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

import './globals.css';

export const metadata: Metadata = {
  title: 'TC Mantenimiento',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="tc-shell min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AuthGate>
          <div className="relative min-h-screen overflow-x-hidden bg-slate-950">
            <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.045)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.45),transparent_78%)]" />

            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(37,99,235,0.12),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(2,132,199,0.08),transparent_36%)]" />

            <TopBar />

            <div className="relative z-10 mx-auto flex w-full max-w-[1600px]">
              <Sidebar />

              <div className="min-w-0 flex-1">
                {children}
              </div>
            </div>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}