import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ID Card Scanner",
  description: "Lightweight client-side ID card capture",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
