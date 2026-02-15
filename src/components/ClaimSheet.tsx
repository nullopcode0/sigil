'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SIGIL_PROGRAM_ID || 'GTc3X6f7CYSb9oAj25przd4FpyUuKhNHmh2ZhQMDXmy8'
);
const TREASURY = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY || 'CGiuetrCxiaibJuxxCvrRjMyEjgmVEngxmvBXJtrmB5y'
);
const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111');

interface ClaimSheetProps {
  epochDay: number;
  onClose: () => void;
  onClaimed: () => void;
  nftTokenAccount?: string;
}

function getProtocolPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('proto')], PROGRAM_ID);
  return pda;
}

function getDayClaimPda(epochDay: number): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(epochDay));
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('day'), buf], PROGRAM_ID);
  return pda;
}

export default function ClaimSheet({ epochDay, onClose, onClaimed, nftTokenAccount }: ClaimSheetProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [linkUrl, setLinkUrl] = useState('');
  const [farcasterUsername, setFarcasterUsername] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [status, setStatus] = useState('');

  const dateStr = new Date(epochDay * 86400 * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  async function handleClaim() {
    if (!publicKey || !linkUrl || !nftTokenAccount) return;

    try { new URL(linkUrl); } catch {
      setStatus('Enter a valid URL');
      return;
    }

    setClaiming(true);
    setStatus('Sign transaction...');

    try {
      const discriminator = Buffer.from([0x9d, 0x64, 0x5e, 0x79, 0x2d, 0x3a, 0x6c, 0x1b]);
      const epochDayBuf = Buffer.alloc(8);
      epochDayBuf.writeBigInt64LE(BigInt(epochDay));
      const data = Buffer.concat([discriminator, epochDayBuf]);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: getProtocolPda(), isSigner: false, isWritable: true },
          { pubkey: getDayClaimPda(epochDay), isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: TREASURY, isSigner: false, isWritable: true },
          { pubkey: new PublicKey(nftTokenAccount), isSigner: false, isWritable: false },
          { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
        ],
        data,
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await sendTransaction(tx, connection);
      setStatus('Confirming...');

      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txSignature: signature,
          epochDay,
          linkUrl,
          farcasterUsername: farcasterUsername || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Claim failed');

      onClaimed();
      onClose();
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm sheet-backdrop" onClick={onClose} />

      {/* Sheet */}
      <div className="sheet-content relative w-full sm:max-w-md bg-surface border-t sm:border border-border
        rounded-t-2xl sm:rounded-2xl p-6 pb-8 shadow-2xl">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5 sm:hidden" />

        <h3 className="text-lg font-bold text-foreground mb-1">Claim {dateStr}</h3>
        <p className="text-sm text-muted mb-5">
          Your link goes live for 24h. All 1,000 Sigils redirect to it.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Destination URL</label>
            <input
              type="url"
              placeholder="https://your-project.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground
                placeholder:text-muted/40 focus:border-accent focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Farcaster username (optional)</label>
            <input
              type="text"
              placeholder="@username"
              value={farcasterUsername}
              onChange={(e) => setFarcasterUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground
                placeholder:text-muted/40 focus:border-accent focus:outline-none text-sm"
            />
          </div>

          <button
            onClick={handleClaim}
            disabled={!publicKey || claiming || !linkUrl || !nftTokenAccount}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]
              bg-accent text-white hover:bg-accent/90
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!nftTokenAccount
              ? 'Mint a Sigil first'
              : claiming
                ? 'Claiming...'
                : 'Claim Day'}
          </button>

          {status && (
            <div className="text-xs text-center text-accent">{status}</div>
          )}
        </div>
      </div>
    </div>
  );
}
