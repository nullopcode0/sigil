import { NextRequest, NextResponse } from 'next/server';
import { getConnection, pollConfirmation } from '@/lib/solana';
import { getServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { txSignature, epochDay, linkUrl, farcasterUsername, farcasterPfpUrl, farcasterFid } =
      await request.json();

    if (!txSignature || !epochDay || !linkUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate link URL
    try {
      new URL(linkUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid link URL' }, { status: 400 });
    }

    // Confirm the on-chain transaction
    const connection = getConnection();
    await pollConfirmation(connection, txSignature);

    // Parse the TX to extract claimer wallet
    const tx = await connection.getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0 });
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 400 });

    const claimerWallet = tx.transaction.message.accountKeys[0].pubkey.toString();

    // Store in Supabase
    const supabase = getServiceClient();
    const { error } = await supabase.from('day_claims').upsert(
      {
        epoch_day: epochDay,
        claimer_wallet: claimerWallet,
        link_url: linkUrl,
        farcaster_username: farcasterUsername || null,
        farcaster_pfp_url: farcasterPfpUrl || null,
        farcaster_fid: farcasterFid || null,
        claimed_at: new Date().toISOString(),
      },
      { onConflict: 'epoch_day' }
    );

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: 'Failed to store claim' }, { status: 500 });
    }

    return NextResponse.json({ success: true, epochDay });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
