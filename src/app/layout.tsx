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
  title: 'Sigil — Billboard That Pays Rent',
  description: 'A living NFT billboard on Solana. Claim a day, display your image across 10,000 NFTs. Holders check in daily to earn.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sigil',
  },
  openGraph: {
    title: 'Sigil — Billboard That Pays Rent',
    description: 'A living NFT billboard on Solana. Claim a day, display your image across 10,000 NFTs.',
    images: [`${APP_URL}/api/nft/image`],
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sigil — Billboard That Pays Rent',
    description: 'A living NFT billboard on Solana. Claim a day, display your image across 10,000 NFTs.',
    images: [`${APP_URL}/api/nft/image`],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: `${APP_URL}/api/nft/image`,
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
      imageUrl: `${APP_URL}/api/nft/image`,
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
        <FrameSDKProvider>
          <WalletProvider>{children}</WalletProvider>
        </FrameSDKProvider>
      </body>
    </html>
  );
}
