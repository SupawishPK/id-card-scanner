import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "ID Card Scanner",
  description: "Lightweight client-side ID card capture",
  icons: {
    icon: `${basePath}/icon.svg`,
    shortcut: `${basePath}/icon.svg`,
    apple: `${basePath}/icon.svg`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <head>
        <Script
          type="module"
          src="https://jelly-ui.com/package.js"
          strategy="beforeInteractive"
        />
      </head>
      {/* Grammarly injects attributes directly on body before React hydrates. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
