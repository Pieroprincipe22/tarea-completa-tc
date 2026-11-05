import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { InventoryProvider } from '@/components/InventoryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inventorio',
  description: 'Materiales y almacén de tu empresa, desde el móvil.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2149B0',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <InventoryProvider>{children}</InventoryProvider>
      </body>
    </html>
  );
}
