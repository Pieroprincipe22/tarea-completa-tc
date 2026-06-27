import type { Metadata } from 'next';

import AuthGate from '@/components/AuthGate';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

import './globals.css';

export const metadata: Metadata = {
  title: 'TC Command Center',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="tc-shell min-h-screen bg-[#020817] text-slate-100 antialiased">
        <AuthGate>
          <div className="relative min-h-screen overflow-hidden bg-[#020817]">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(2,132,199,0.10),transparent_38%)]" />

            <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.055)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent_78%)]" />

            <div className="relative z-10 flex min-h-screen">
              <Sidebar />

              <div className="flex min-w-0 flex-1 flex-col xl:pl-[280px]">
                <TopBar />

                <main className="min-w-0 flex-1 px-5 py-6 sm:px-6 lg:px-8">
                  <div className="mx-auto w-full max-w-[1500px]">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}