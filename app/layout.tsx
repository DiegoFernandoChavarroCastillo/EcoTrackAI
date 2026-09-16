import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

/** Grotesca de texto: limpia, con algo más de carácter que las de sistema. */
const sans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

/** Monoespaciada para cifras y etiquetas: alinea los kilos en columna. */
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "EcoTrack AI",
  description:
    "Calcula la huella de carbono de tu negocio describiendo tus actividades en lenguaje natural.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Header />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
