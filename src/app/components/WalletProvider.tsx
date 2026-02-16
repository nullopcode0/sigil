'use client';

import { useMemo, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { FarcasterSolanaProvider } from '@farcaster/mini-app-solana';
import { useFrameSDK } from './FrameSDK';

export default function WalletProvider({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const { isInMiniApp, isLoaded } = useFrameSDK();
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  // Wait for FrameSDK to determine context (splash screen covers in Farcaster)
  if (!isLoaded) return null;

  // In Farcaster: FarcasterSolanaProvider handles wallet registration,
  // auto-connect, and the correct localStorage key ('fcWalletName')
  if (isInMiniApp) {
    return (
      <FarcasterSolanaProvider endpoint={endpoint}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </FarcasterSolanaProvider>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
