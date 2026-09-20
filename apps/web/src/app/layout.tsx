import type { Metadata } from 'next';

import AppShell from '@/components/AppShell';
import AuthGate from '@/components/AuthGate';

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
          <AppShell>{children}</AppShell>
        </AuthGate>
      </body>
    </html>
  );
}