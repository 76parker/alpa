import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://appsec-atlas.barabarw.chatgpt.site';
const description = 'Alpa is an application-centric security inventory for products, components, architecture, and threat models.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Alpa',
  description,
  openGraph: {
    title: 'Alpa',
    description,
    url: siteUrl,
    siteName: 'Alpa',
    type: 'website',
    images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630, alt: 'Alpa application security inventory' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alpa',
    description,
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
