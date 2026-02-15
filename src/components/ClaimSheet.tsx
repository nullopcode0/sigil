'use client';

import { useState, useRef, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useFrameSDK } from '@/components/FrameSDK';

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SIGIL_PROGRAM_ID || 'GTc3X6f7CYSb9oAj25przd4FpyUuKhNHmh2ZhQMDXmy8'
);
const TREASURY = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY || 'CGiuetrCxiaibJuxxCvrRjMyEjgmVEngxmvBXJtrmB5y'
);
const INCENTIVE_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_INCENTIVE_WALLET || 'CGiuetrCxiaibJuxxCvrRjMyEjgmVEngxmvBXJtrmB5y'
);
const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111');

const MIN_INCENTIVE_SOL = 0.1;

// sha256("global:claim_day")[:8]
const CLAIM_DAY_DISCRIMINATOR = Buffer.from([0xbe, 0x58, 0x08, 0x29, 0xc8, 0x35, 0x2f, 0x6a]);

interface ClaimSheetProps {
  epochDay: number;
  onClose: () => void;
  onClaimed: () => void;
  platformFee: number; // lamports
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

export default function ClaimSheet({ epochDay, onClose, onClaimed, platformFee }: ClaimSheetProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { context, isInMiniApp } = useFrameSDK();
  const [incentiveSol, setIncentiveSol] = useState('0.1');
  const [linkUrl, setLinkUrl] = useState('');
  const [farcasterUsername, setFarcasterUsername] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-populate Farcaster username from mini app context
  useEffect(() => {
    if (isInMiniApp && context?.user?.username && !farcasterUsername) {
      setFarcasterUsername(context.user.username);
    }
  }, [isInMiniApp, context, farcasterUsername]);

  const dateStr = new Date(epochDay * 86400 * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const platformFeeSol = platformFee / LAMPORTS_PER_SOL;
  const incentiveNum = parseFloat(incentiveSol) || 0;
  const totalCostSol = platformFeeSol + incentiveNum;
  const incentiveValid = incentiveNum >= MIN_INCENTIVE_SOL;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setStatus('Image must be under 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setStatus('Must be JPEG or PNG');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStatus('');
  }

  async function handleClaim() {
    if (!publicKey || !incentiveValid) return;

    setClaiming(true);
    setStatus('Sign transaction...');

    try {
      const incentiveLamports = Math.round(incentiveNum * LAMPORTS_PER_SOL);

      // Build claim_day instruction: [discriminator][epoch_day i64 LE][incentive_amount u64 LE]
      const epochDayBuf = Buffer.alloc(8);
      epochDayBuf.writeBigInt64LE(BigInt(epochDay));
      const incentiveBuf = Buffer.alloc(8);
      incentiveBuf.writeBigUInt64LE(BigInt(incentiveLamports));
      const data = Buffer.concat([CLAIM_DAY_DISCRIMINATOR, epochDayBuf, incentiveBuf]);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: getProtocolPda(), isSigner: false, isWritable: true },
          { pubkey: getDayClaimPda(epochDay), isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: TREASURY, isSigner: false, isWritable: true },
          { pubkey: INCENTIVE_WALLET, isSigner: false, isWritable: true },
          { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
        ],
        data,
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await sendTransaction(tx, connection);
      setStatus('Confirming on-chain...');

      // POST to API with FormData (supports image upload)
      const formData = new FormData();
      formData.append('txSignature', signature);
      formData.append('epochDay', String(epochDay));
      formData.append('incentiveLamports', String(incentiveLamports));
      if (linkUrl.trim()) formData.append('linkUrl', linkUrl.trim());
      if (farcasterUsername) formData.append('farcasterUsername', farcasterUsername);
      if (imageFile) formData.append('image', imageFile);

      const res = await fetch('/api/claim', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Claim failed');

      onClaimed();
      onClose();
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg.includes('User rejected') || msg.includes('rejected the request')) {
        setStatus('Transaction cancelled');
      } else if (msg.includes('already in use') || msg.includes('0x0')) {
        setStatus('This day has already been claimed');
      } else if (msg.includes('insufficient') || msg.includes('not enough')) {
        setStatus('Insufficient SOL balance');
      } else if (msg.includes('DayNotFuture')) {
        setStatus('Cannot claim today or past days');
      } else if (msg.includes('DayTooFarAhead')) {
        setStatus('Day is more than 30 days ahead');
      } else if (msg.includes('IncentiveTooLow')) {
        setStatus(`Incentive must be at least ${MIN_INCENTIVE_SOL} SOL`);
      } else {
        setStatus(msg || 'Transaction failed');
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm sheet-backdrop" onClick={onClose} />

      <div className="sheet-content relative w-full sm:max-w-md bg-surface border-t sm:border border-border
        rounded-t-2xl sm:rounded-2xl p-6 pb-8 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5 sm:hidden" />

        <h3 className="text-lg font-bold text-foreground mb-1">Claim {dateStr}</h3>
        <p className="text-sm text-muted mb-5">
          Upload your billboard image. All 10,000 Sigils display it for 24 hours.
        </p>

        <div className="space-y-3">
          {/* Image upload */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Billboard Image (optional, max 5MB)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 rounded-xl border-2 border-dashed border-border bg-background
                flex items-center justify-center hover:border-accent/30 transition-colors overflow-hidden"
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-muted">Click to upload image</span>
              )}
            </button>
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Link URL (optional)</label>
            <input
              type="url"
              placeholder="https://yoursite.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground
                placeholder:text-muted/40 focus:border-accent focus:outline-none text-sm"
            />
          </div>

          {/* Incentive amount */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Incentive Pool (min {MIN_INCENTIVE_SOL} SOL)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min={MIN_INCENTIVE_SOL}
                placeholder="0.1"
                value={incentiveSol}
                onChange={(e) => setIncentiveSol(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground
                  placeholder:text-muted/40 focus:border-accent focus:outline-none text-sm pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">SOL</span>
            </div>
            {!incentiveValid && incentiveSol !== '' && (
              <p className="text-[10px] text-red-400 mt-1">Minimum {MIN_INCENTIVE_SOL} SOL</p>
            )}
          </div>

          {/* Farcaster username */}
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

          {/* Cost breakdown */}
          <div className="bg-background rounded-xl border border-border p-3 text-xs space-y-1">
            <div className="flex justify-between text-muted">
              <span>Platform fee</span>
              <span>{platformFeeSol.toFixed(2)} SOL</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Incentive pool</span>
              <span>{incentiveNum.toFixed(2)} SOL</span>
            </div>
            <div className="border-t border-border pt-1 flex justify-between font-semibold text-foreground">
              <span>Total</span>
              <span>{totalCostSol.toFixed(2)} SOL</span>
            </div>
          </div>

          <button
            onClick={handleClaim}
            disabled={!publicKey || claiming || !incentiveValid}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]
              bg-accent text-white hover:bg-accent/90
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {claiming ? 'Claiming...' : `Claim Day — ${totalCostSol.toFixed(2)} SOL`}
          </button>

          {status && (
            <div className="text-xs text-center text-accent">{status}</div>
          )}
        </div>
      </div>
    </div>
  );
}
