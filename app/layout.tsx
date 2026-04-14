import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import "./globals.css";

const headingFont = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading" });
const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Cuadrante Minimal",
  description: "Cuadrante semanal minimalista para equipos de limpieza."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
