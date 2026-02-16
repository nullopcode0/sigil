'use client';

import { useMemo, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useFrameSDK } from './FrameSDK';
// Side-effect: registers Farcaster wallet via Wallet Standard when in mini app
import '@farcaster/mini-app-solana';

export default function WalletProvider({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const { isInMiniApp } = useFrameSDK();

  // In Farcaster: empty array — Farcaster wallet auto-registers via Wallet Standard
  // Outside: standard Phantom + Solflare adapters
  const wallets = useMemo(
    () => isInMiniApp ? [] : [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [isInMiniApp]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
