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
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <AuthGate>
          <TopBar />
          <main className="mx-auto max-w-6xl p-6">{children}</main>
        </AuthGate>
      </body>
    </html>
  );
}
