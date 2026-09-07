import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Prompt } from 'next/font/google';
import DisableZoom from '@/components/DisableZoom';
import './globals.css';

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-prompt',
});

export const metadata: Metadata = {
  title: 'เปิดกล้อง',
  description: 'เลือกและเปิดกล้องหลังของอุปกรณ์',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>
        <DisableZoom />
        {children}
      </body>
    </html>
  );
}
