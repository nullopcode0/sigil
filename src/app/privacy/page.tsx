import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Sigil',
  description: 'Privacy Policy for sigil.bond — the living NFT billboard on Solana.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10">
      <article className="w-full max-w-2xl prose-sm">
        <Link href="/" className="text-accent text-xs hover:underline">&larr; Back to Sigil</Link>

        <h1 className="text-2xl font-extrabold text-foreground mt-6 mb-1">Privacy Policy</h1>
        <p className="text-xs text-muted mb-8">Last updated: February 10, 2026</p>

        <div className="space-y-6 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Overview</h2>
            <p>
              Sigil (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or the &ldquo;Platform&rdquo;) respects your privacy.
              This Privacy Policy explains what information we collect, how we use it, and your choices.
              We are committed to transparency and minimal data collection.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect the following categories of information:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>
                <strong className="text-foreground">Wallet addresses</strong> — Your public Solana wallet address
                when you connect your wallet, mint an NFT, claim a day, or check in. This is inherently public
                blockchain data.
              </li>
              <li>
                <strong className="text-foreground">Transaction data</strong> — On-chain transaction signatures
                related to mints, claims, and reward distributions. This data is publicly available on the
                Solana blockchain.
              </li>
              <li>
                <strong className="text-foreground">Uploaded content</strong> — Billboard images and optional
                link URLs submitted by advertisers when claiming a day.
              </li>
              <li>
                <strong className="text-foreground">Farcaster information</strong> — If you optionally provide
                a Farcaster username, we may retrieve your public profile picture and FID from the Farcaster
                network via third-party APIs.
              </li>
              <li>
                <strong className="text-foreground">Check-in records</strong> — Timestamp and wallet address
                of daily check-ins, used to calculate reward distribution weights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Process NFT mints, day claims, check-ins, and reward distributions</li>
              <li>Display billboard content across all Sigil NFTs</li>
              <li>Calculate and distribute incentive pool rewards to holders</li>
              <li>Show advertiser profiles (Farcaster PFP, username) on claimed calendar days</li>
              <li>Prevent abuse (e.g., one NFT per wallet enforcement)</li>
              <li>Improve and maintain the Platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Data Storage</h2>
            <p>
              Off-chain data (check-in records, uploaded images, claim metadata) is stored in Supabase,
              a hosted database service. On-chain data (NFT ownership, day claims, transactions) is stored
              on the Solana blockchain and is publicly accessible. We do not store private keys, seed phrases,
              or wallet passwords.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Third-Party Services</h2>
            <p className="mb-2">The Platform uses the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong className="text-foreground">Solana blockchain</strong> — For all on-chain operations</li>
              <li><strong className="text-foreground">Supabase</strong> — For off-chain data storage and image hosting</li>
              <li><strong className="text-foreground">Neynar</strong> — For Farcaster profile resolution</li>
              <li><strong className="text-foreground">Vercel</strong> — For web hosting and serverless functions</li>
              <li><strong className="text-foreground">Alchemy</strong> — For Solana RPC access</li>
            </ul>
            <p className="mt-2">
              Each service has its own privacy policy. We encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Cookies & Analytics</h2>
            <p>
              The Platform uses local storage to persist your theme preference (light/dark mode). We do not use
              tracking cookies, fingerprinting, or third-party analytics services. We do not serve targeted
              advertisements or sell your data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Data Sharing</h2>
            <p>
              We do not sell, rent, or share your personal information with third parties for marketing purposes.
              Information may be shared only as required by law, to protect our rights, or as part of a
              business transfer. Blockchain data is inherently public and accessible by anyone.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Your Rights</h2>
            <p>
              You may disconnect your wallet at any time to stop interacting with the Platform. Due to the
              nature of blockchain technology, on-chain data (transactions, NFT ownership, day claims) cannot
              be deleted. Off-chain data (uploaded images, Farcaster profiles) may be removed upon request
              through our public channels.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Security</h2>
            <p>
              We implement reasonable security measures to protect off-chain data. However, no system is
              completely secure. Smart contract code is publicly verifiable on-chain. We recommend using
              hardware wallets and following standard blockchain security practices.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Changes</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be reflected on this page
              with an updated date. Continued use of the Platform constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">11. Contact</h2>
            <p>
              For privacy-related questions or data removal requests, reach out via Farcaster or through
              the project&apos;s public channels.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted/50 flex gap-4">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
        </div>
      </article>
    </main>
  );
}
