import type { Metadata } from "next";
import "./globals.css";

import TopBar from "@/components/TopBar";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "TC Mantenimiento",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-black">
        <AuthGate>
          <TopBar />
          <main className="mx-auto max-w-5xl p-6">{children}</main>
        </AuthGate>
      </body>
    </html>
  );
}
