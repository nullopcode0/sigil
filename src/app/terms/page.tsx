import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Sigil',
  description: 'Terms of Service for sigil.bond — the living NFT billboard on Solana.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10">
      <article className="w-full max-w-2xl prose-sm">
        <Link href="/" className="text-accent text-xs hover:underline">&larr; Back to Sigil</Link>

        <h1 className="text-2xl font-extrabold text-foreground mt-6 mb-1">Terms of Service</h1>
        <p className="text-xs text-muted mb-8">Last updated: February 10, 2026</p>

        <div className="space-y-6 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using sigil.bond and associated smart contracts (collectively, the &ldquo;Platform&rdquo;),
              you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
              The Platform is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Eligibility</h2>
            <p>
              You must be at least 18 years old and capable of forming a binding agreement to use the Platform.
              By connecting a wallet, you represent that you meet these requirements and have the legal capacity
              to enter into these Terms in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Platform Description</h2>
            <p>
              Sigil is a dynamic NFT collection on the Solana blockchain. Advertisers may claim calendar days
              to display billboard images across all Sigil NFTs for 24 hours. NFT holders may check in daily
              to earn a share of the advertiser-funded incentive pool. The Platform facilitates these interactions
              through on-chain smart contracts and off-chain services.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Wallet & Transactions</h2>
            <p>
              You are solely responsible for your wallet, private keys, and all transactions executed through them.
              All blockchain transactions are final and irreversible. The Platform does not custody, hold, or
              control any funds, tokens, or private keys. Platform fees and incentive payments are processed
              entirely on-chain through publicly auditable smart contracts.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Advertiser Content</h2>
            <p>
              Advertisers who claim a day are solely responsible for the content they upload. You agree not to
              upload content that is illegal, harmful, defamatory, obscene, hateful, or that infringes on any
              third-party intellectual property rights. We reserve the right to remove any content that violates
              these Terms without notice or refund.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. NFT Ownership</h2>
            <p>
              Minting a Sigil NFT grants you ownership of the digital token on the Solana blockchain. Ownership
              does not grant intellectual property rights over the Sigil brand, platform, or any billboard
              content displayed on your NFT. The dynamic image displayed on each NFT changes based on
              advertiser claims and is not controlled by the NFT holder.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Rewards & Incentives</h2>
            <p>
              Rewards are distributed from the advertiser-funded incentive pool based on check-in participation
              and weight. Reward amounts are determined programmatically and may vary. There is no guarantee of
              any particular return or reward amount. Past performance is not indicative of future results.
              Rewards are not interest, dividends, or investment returns.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Risks</h2>
            <p>
              Blockchain technology, smart contracts, and digital assets carry inherent risks including but not
              limited to: smart contract vulnerabilities, network congestion, regulatory changes, loss of private
              keys, and market volatility. You acknowledge these risks and agree that the Platform is not
              responsible for any losses arising from your use of the Platform or the Solana blockchain.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, the Platform, its creators, contributors, and affiliates
              shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
              including loss of profits, data, or digital assets, arising from your use of or inability to use
              the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Modifications</h2>
            <p>
              We may update these Terms at any time. Continued use of the Platform after changes constitutes
              acceptance. Material changes will be communicated through the Platform. It is your responsibility
              to review these Terms periodically.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable law, without regard
              to conflict of law principles. Any disputes arising from these Terms shall be resolved through
              binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">12. Contact</h2>
            <p>
              For questions about these Terms, reach out via Farcaster or through the project&apos;s
              public channels.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted/50 flex gap-4">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        </div>
      </article>
    </main>
  );
}
