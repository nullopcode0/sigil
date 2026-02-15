'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sigil-how-it-works-seen';

interface HowItWorksModalProps {
  walletConnected: boolean;
}

export default function HowItWorksModal({ walletConnected }: HowItWorksModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!walletConnected) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setOpen(true);
    }
  }, [walletConnected]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm sheet-backdrop"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="modal-content relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-foreground mb-4">How Sigil Works</h2>

        <div className="space-y-4 text-sm text-muted leading-relaxed">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold text-xs">1</span>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-0.5">Mint a Sigil</div>
              <div>1,000 identical NFTs. Same image, same metadata &mdash; updated every day.</div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold text-xs">2</span>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-0.5">Claim a Day</div>
              <div>Pick a day on the 30-day calendar and set your link. All 1,000 NFTs will point to it for 24 hours.</div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold text-xs">3</span>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-0.5">Tap to Visit</div>
              <div>Anyone viewing a Sigil NFT just taps it. They get redirected to whatever link is live that day.</div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold text-xs">4</span>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-0.5">Track Clicks</div>
              <div>Every redirect is logged. You can see exactly how many people visited through your link.</div>
            </div>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="mt-6 w-full py-2.5 rounded-xl bg-accent text-white font-semibold text-sm
            hover:bg-accent/90 transition-colors active:scale-[0.98]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
