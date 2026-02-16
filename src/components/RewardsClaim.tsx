'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { toast } from 'sonner';

interface RewardsClaimProps {
  epochDay: number;
}

interface DayBreakdown {
  epochDay: number;
  weight: number;
  totalWeight: number;
  incentiveLamports: number;
  earnedLamports: number;
  pendingLamports: number;
}

interface TodayEstimate {
  epochDay: number;
  weight: number;
  currentTotalWeight: number;
  incentiveLamports: number;
  estimatedLamports: number;
  estimatedSol: number;
}

export default function RewardsClaim({ epochDay }: RewardsClaimProps) {
  const { publicKey, signMessage, connected } = useWallet();
  const [pendingSol, setPendingSol] = useState(0);
  const [daysCheckedIn, setDaysCheckedIn] = useState(0);
  const [bonusDays, setBonusDays] = useState(0);
  const [dayBreakdown, setDayBreakdown] = useState<DayBreakdown[]>([]);
  const [todayEstimate, setTodayEstimate] = useState<TodayEstimate | null>(null);
  const [todayPool, setTodayPool] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [txSignature, setTxSignature] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    if (!publicKey) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/rewards?wallet=${publicKey.toString()}`);
      const data = await res.json();
      setPendingSol(data.pendingSol || 0);
      setDaysCheckedIn(data.daysCheckedIn || 0);
      setBonusDays(data.bonusDays || 0);
      setDayBreakdown(data.dayBreakdown || []);
      setTodayEstimate(data.todayEstimate || null);
      setTodayPool(data.todayPool || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => { fetchRewards(); }, [fetchRewards]);

  async function handleClaim() {
    if (!publicKey || !signMessage || pendingSol <= 0) return;
    setClaiming(true);
    const toastId = toast.loading('Sign message...');

    try {
      const message = `Sigil claim rewards: ${epochDay}:${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);
      const sig = await signMessage(messageBytes);

      toast.loading('Claiming...', { id: toastId });

      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          signature: bs58.encode(sig),
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim failed');

      setTxSignature(data.txSignature);
      setPendingSol(0);
      toast.success('Rewards claimed!', {
        id: toastId,
        description: `TX: ${data.txSignature.slice(0, 16)}...`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://explorer.solana.com/tx/${data.txSignature}?cluster=devnet`, '_blank'),
        },
        duration: 8000,
      });
      fetchRewards();
    } catch (err) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setClaiming(false);
    }
  }

  if (!connected || loading) return null;

  // Show if: has check-ins, has pending rewards, has today estimate, or there's a pool today
  const hasContent = daysCheckedIn > 0 || pendingSol > 0 || todayEstimate || todayPool > 0;
  if (!hasContent) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Rewards</h2>

      {/* Claimable rewards (settled days) */}
      {pendingSol > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Claimable</span>
            <span className="text-lg font-bold text-accent">{pendingSol.toFixed(4)} SOL</span>
          </div>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]
              bg-accent text-white hover:bg-accent/90
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {claiming ? 'Claiming...' : `Claim ${pendingSol.toFixed(4)} SOL`}
          </button>
        </div>
      )}

      {/* Today's estimated earnings (pre-settlement) */}
      {todayEstimate && (
        <div className="mb-4 p-3 rounded-xl bg-accent/5 border border-accent/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">Today&apos;s estimate</span>
            <span className="text-sm font-bold text-accent">~{todayEstimate.estimatedSol.toFixed(4)} SOL</span>
          </div>
          <p className="text-[10px] text-muted">
            Your {todayEstimate.weight}x weight / {todayEstimate.currentTotalWeight} total &middot; {(todayEstimate.incentiveLamports / 1e9).toFixed(2)} SOL pool
          </p>
          <p className="text-[10px] text-muted/60 mt-1">
            Claimable after midnight UTC settlement
          </p>
        </div>
      )}

      {/* Today's pool (if not checked in yet) */}
      {!todayEstimate && todayPool > 0 && daysCheckedIn === 0 && (
        <div className="mb-4 p-3 rounded-xl bg-surface border border-border">
          <p className="text-xs text-muted text-center">
            Today&apos;s billboard has a <span className="text-accent font-semibold">{todayPool.toFixed(2)} SOL</span> incentive pool.
            Check in to earn your share.
          </p>
        </div>
      )}

      {/* Stats */}
      {(daysCheckedIn > 0 || pendingSol > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{daysCheckedIn}</div>
            <div className="text-[10px] text-muted">Days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{bonusDays}</div>
            <div className="text-[10px] text-muted">2x Days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-accent">{pendingSol.toFixed(4)}</div>
            <div className="text-[10px] text-muted">Pending SOL</div>
          </div>
        </div>
      )}

      {txSignature && (
        <a
          href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] text-accent/70 hover:text-accent text-center mt-2 truncate"
        >
          TX: {txSignature.slice(0, 20)}...
        </a>
      )}

      {dayBreakdown.length > 0 && (
        <details className="mt-3">
          <summary className="text-[10px] text-muted cursor-pointer hover:text-foreground">
            View breakdown ({dayBreakdown.length} days)
          </summary>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {dayBreakdown.map((d) => (
              <div key={d.epochDay} className="flex justify-between text-[10px] text-muted">
                <span>Day {d.epochDay} ({d.weight}x)</span>
                <span>{(d.pendingLamports / 1e9).toFixed(6)} SOL</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
