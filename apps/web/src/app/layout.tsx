import type { Metadata } from 'next';
import './globals.css';
import AuthGate from '@/components/AuthGate';
import TopBar from '@/components/TopBar';

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
            <main className="tc-page relative z-10">{children}</main>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}