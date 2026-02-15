import { NextRequest } from 'next/server';
import { getConnection, getServerKeypair } from '@/lib/solana';
import { getServiceClient } from '@/lib/supabase';
import { PublicKey, SystemProgram, Transaction, sendAndConfirmRawTransaction } from '@solana/web3.js';

function html(title: string, message: string, color: string) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
    <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0c0a1a;color:white">
      <div style="text-align:center;max-width:400px;padding:40px">
        <div style="font-size:48px;margin-bottom:16px">${color === 'green' ? '&#9989;' : color === 'red' ? '&#10060;' : '&#9888;'}</div>
        <h1 style="color:${color === 'green' ? '#22c55e' : color === 'red' ? '#ef4444' : '#eab308'};margin-bottom:8px">${title}</h1>
        <p style="color:#a1a1aa;font-size:14px">${message}</p>
        <a href="/" style="display:inline-block;margin-top:24px;color:#8b5cf6;text-decoration:none;font-size:14px">&larr; Back to Sigil</a>
      </div>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const epochDay = Number(searchParams.get('day'));
  const action = searchParams.get('action');

  // Validate admin secret
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    return html('Unauthorized', 'Invalid admin secret.', 'yellow');
  }

  if (!epochDay || !['approve', 'deny'].includes(action || '')) {
    return html('Bad Request', 'Missing day or action parameter.', 'yellow');
  }

  const supabase = getServiceClient();

  // Fetch the claim
  const { data: claim, error: fetchError } = await supabase
    .from('day_claims')
    .select('*')
    .eq('epoch_day', epochDay)
    .single();

  if (fetchError || !claim) {
    return html('Not Found', `No claim found for epoch day ${epochDay}.`, 'yellow');
  }

  if (claim.moderation_status === action + 'd') {
    return html('Already Done', `This claim was already ${action}d.`, 'yellow');
  }

  if (action === 'approve') {
    const { error } = await supabase
      .from('day_claims')
      .update({ moderation_status: 'approved' })
      .eq('epoch_day', epochDay);

    if (error) {
      return html('Error', `Failed to approve: ${error.message}`, 'red');
    }

    const date = new Date(epochDay * 86400 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return html('Approved', `Billboard for ${date} is now live.`, 'green');
  }

  if (action === 'deny') {
    // 1. Update status
    const { error: updateError } = await supabase
      .from('day_claims')
      .update({ moderation_status: 'denied' })
      .eq('epoch_day', epochDay);

    if (updateError) {
      return html('Error', `Failed to deny: ${updateError.message}`, 'red');
    }

    // 2. Delete the uploaded image from storage
    if (claim.image_url) {
      try {
        const filename = claim.image_url.split('/').pop();
        if (filename) {
          await supabase.storage.from('day-images').remove([filename]);
        }
      } catch {
        // Non-critical
      }
    }

    // 3. Refund incentive to claimer
    let refundTx = '';
    const incentiveLamports = claim.incentive_lamports || 0;
    if (incentiveLamports > 0 && claim.claimer_wallet) {
      try {
        const connection = getConnection();
        const serverKeypair = getServerKeypair();
        const claimerPubkey = new PublicKey(claim.claimer_wallet);

        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: serverKeypair.publicKey,
            toPubkey: claimerPubkey,
            lamports: incentiveLamports,
          })
        );
        tx.feePayer = serverKeypair.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.sign(serverKeypair);

        refundTx = await sendAndConfirmRawTransaction(connection, tx.serialize(), {
          commitment: 'confirmed',
        });

        // Record refund in reward_ledger
        await supabase.from('reward_ledger').insert({
          epoch_day: epochDay,
          wallet: claim.claimer_wallet,
          amount_lamports: incentiveLamports,
          tx_signature: refundTx,
          status: 'sent',
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Refund error:', err);
        const date = new Date(epochDay * 86400 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        return html(
          'Denied (Refund Failed)',
          `Billboard for ${date} denied. Image removed. Refund failed: ${(err as Error).message}. Manual refund needed: ${incentiveLamports} lamports to ${claim.claimer_wallet}.`,
          'yellow'
        );
      }
    }

    const date = new Date(epochDay * 86400 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const refundSol = (incentiveLamports / 1e9).toFixed(4);
    return html(
      'Denied & Refunded',
      `Billboard for ${date} denied. Image removed. ${refundSol} SOL refunded to ${claim.claimer_wallet.slice(0, 8)}...${refundTx ? ` (TX: ${refundTx.slice(0, 12)}...)` : ''}`,
      'red'
    );
  }

  return html('Unknown Action', 'Action must be approve or deny.', 'yellow');
}
