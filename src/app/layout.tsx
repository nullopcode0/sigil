import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import WalletProvider from '@/components/WalletProvider';

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

export const metadata: Metadata = {
  title: 'Sigil — Billboard That Pays Rent',
  description: 'A living NFT billboard on Solana. Claim a day, display your image across 10,000 NFTs. Holders check in daily to earn.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=localStorage.getItem('sigil-theme');if(m==='dark'||(!m&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
