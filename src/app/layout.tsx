import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import WalletProvider from '@/components/WalletProvider';
import { FrameSDKProvider } from '@/components/FrameSDK';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sigil.bond';

export const metadata: Metadata = {
  title: {
    default: 'Sigil — Billboard That Pays Rent',
    template: '%s | Sigil',
  },
  description: 'A living NFT billboard on Solana. Claim a day, display your image across 10,000 NFTs. Holders check in daily to earn SOL.',
  metadataBase: new URL(APP_URL),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sigil',
  },
  keywords: ['NFT', 'Solana', 'billboard', 'advertising', 'web3', 'dynamic NFT', 'check-in', 'earn SOL', 'devnet'],
  authors: [{ name: 'nullopcode', url: 'https://nullopcode.cv' }],
  creator: 'nullopcode',
  openGraph: {
    type: 'website',
    siteName: 'Sigil',
    title: 'Sigil — Billboard That Pays Rent',
    description: 'A living NFT billboard on Solana. Claim a day, display your image across 10,000 NFTs. Holders check in daily to earn.',
    images: [{ url: `${APP_URL}/api/og`, width: 1200, height: 630, alt: 'Sigil — Billboard That Pays Rent' }],
    url: APP_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sigil — Billboard That Pays Rent',
    description: 'A living NFT billboard on Solana. Claim a day, display your image across 10,000 NFTs.',
    images: [{ url: `${APP_URL}/api/og`, width: 1200, height: 630, alt: 'Sigil — Billboard That Pays Rent' }],
    creator: '@nullopcode',
  },
  alternates: {
    canonical: APP_URL,
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: `${APP_URL}/api/og`,
      button: {
        title: 'Open Sigil',
        action: {
          type: 'launch_miniapp',
          name: 'Sigil',
          url: APP_URL,
          splashImageUrl: `${APP_URL}/sigil.png`,
          splashBackgroundColor: '#0a0f1a',
        },
      },
    }),
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: `${APP_URL}/api/og`,
      button: {
        title: 'Open Sigil',
        action: {
          type: 'launch_frame',
          name: 'Sigil',
          url: APP_URL,
          splashImageUrl: `${APP_URL}/sigil.png`,
          splashBackgroundColor: '#0a0f1a',
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0f1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=localStorage.getItem('sigil-theme');if(m==='dark'||(!m&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})();if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Sigil',
              alternateName: 'Sigil — Billboard That Pays Rent',
              description: 'A living NFT billboard on Solana. Claim a day, display your image across 10,000 NFTs. Holders check in daily to earn SOL.',
              url: APP_URL,
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0.01',
                priceCurrency: 'SOL',
                description: 'Mint a Sigil NFT',
              },
              creator: {
                '@type': 'Organization',
                name: 'nullopcode',
                url: 'https://nullopcode.cv',
              },
              image: `${APP_URL}/api/og`,
            }),
          }}
        />
        <FrameSDKProvider>
          <WalletProvider>{children}</WalletProvider>
        </FrameSDKProvider>
      </body>
    </html>
  );
}
