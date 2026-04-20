import type { Metadata } from 'next';
import './globals.css';
import AuthGate from '@/components/AuthGate';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';

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
      <body className="tc-shell">
        <AuthGate>
          <div className="relative min-h-screen">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.28),transparent)]" />

            <TopBar />

            <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <Sidebar />

                <section className="min-w-0 flex-1">
                  <div className="tc-page">{children}</div>
                </section>
              </div>
            </main>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}