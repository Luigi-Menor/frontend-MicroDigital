import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Plus Jakarta Sans (títulos): rasgos redondeados que le dan calidez a la
// marca sin perder seriedad. Inter (cuerpo/tablas): máxima legibilidad a
// tamaños pequeños y buen soporte de números tabulares para cifras de venta.
const fontDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});
const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MicroDigital",
  description: "Plataforma multi-negocio para la gestión de micronegocios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}
