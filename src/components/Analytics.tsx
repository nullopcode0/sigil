'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface ClaimAnalytics {
  epochDay: number;
  claimedAt: string;
  farcasterUsername: string | null;
  clicks: number;
  date: string;
}

export default function Analytics() {
  const { publicKey } = useWallet();
  const [claims, setClaims] = useState<ClaimAnalytics[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) { setClaims([]); setTotalClicks(0); return; }

    setLoading(true);
    fetch(`/api/analytics?wallet=${publicKey.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setClaims(data.claims || []);
        setTotalClicks(data.totalClicks || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [publicKey]);

  if (!publicKey || loading || claims.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Your Claims</h3>
        <span className="text-xs text-muted font-mono">{totalClicks} clicks</span>
      </div>

      <div className="divide-y divide-border">
        {claims.map((claim) => (
          <div key={claim.epochDay} className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm text-foreground">{claim.date}</span>
              {claim.farcasterUsername && (
                <span className="text-xs text-muted ml-2">@{claim.farcasterUsername}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-accent">{claim.clicks}</span>
              <span className="text-[10px] text-muted">clicks</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
