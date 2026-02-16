import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEpochDay, getServerKeypair } from '@/lib/solana';
import { getServiceClient } from '@/lib/supabase';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { updateV1, fetchMetadataFromSeeds, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, publicKey, some } from '@metaplex-foundation/umi';

// Vercel crons invoke GET
export async function GET(request: NextRequest) {
  return handleSettle(request);
}

export async function POST(request: NextRequest) {
  return handleSettle(request);
}

async function handleSettle(request: NextRequest) {
  try {
    // Simple auth: check for cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const today = getCurrentEpochDay();
    const settled: { epochDay: number; totalWeight: number; incentiveLamports: number }[] = [];

    // Find ALL unsettled past days (total_weight = 0, epoch_day < today)
    const { data: unsettledClaims } = await supabase
      .from('day_claims')
      .select('epoch_day, total_weight, incentive_lamports')
      .lt('epoch_day', today)
      .eq('total_weight', 0)
      .order('epoch_day', { ascending: true });

    for (const claim of (unsettledClaims || [])) {
      // Sum weights for this day
      const { data: weightData } = await supabase
        .from('check_ins')
        .select('weight')
        .eq('epoch_day', claim.epoch_day);

      const totalWeight = (weightData || []).reduce((sum, row) => sum + row.weight, 0);

      if (totalWeight === 0) continue; // No check-ins for this day

      const { error } = await supabase
        .from('day_claims')
        .update({ total_weight: totalWeight })
        .eq('epoch_day', claim.epoch_day);

      if (error) {
        console.error(`Settle error for day ${claim.epoch_day}:`, error);
        continue;
      }

      settled.push({
        epochDay: claim.epoch_day,
        totalWeight,
        incentiveLamports: claim.incentive_lamports,
      });
    }

    // Bump on-chain metadata for all NFTs so DAS indexers re-fetch
    // Uses a cache-busting query param on the URI — the endpoint ignores it
    let bumped = 0;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.sigil.bond';
      const newUri = `${baseUrl}/api/nft/metadata?d=${today}`;

      const { data: mints } = await supabase
        .from('nft_mints')
        .select('mint_address')
        .order('token_id', { ascending: true });

      if (mints && mints.length > 0) {
        const serverKeypair = getServerKeypair();
        const rpc = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
        const umi = createUmi(rpc).use(mplTokenMetadata());
        const umiKeypair = umi.eddsa.createKeypairFromSecretKey(serverKeypair.secretKey);
        umi.use(keypairIdentity(umiKeypair));

        for (const row of mints) {
          try {
            const mintPk = publicKey(row.mint_address);
            const existing = await fetchMetadataFromSeeds(umi, { mint: mintPk });
            await updateV1(umi, {
              mint: mintPk,
              authority: umi.identity,
              data: some({
                name: existing.name,
                symbol: existing.symbol,
                uri: newUri,
                sellerFeeBasisPoints: existing.sellerFeeBasisPoints,
                creators: existing.creators,
              }),
            }).sendAndConfirm(umi);
            bumped++;
          } catch (err) {
            console.error(`Metadata bump failed for ${row.mint_address}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Metadata bump error (non-critical):', err);
    }

    return NextResponse.json({ settled, count: settled.length, metadataBumped: bumped });
  } catch (error) {
    console.error('Settle cron error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
