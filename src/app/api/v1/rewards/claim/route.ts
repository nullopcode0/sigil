import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { withCors, optionsResponse } from '@/lib/cors';
import { verifyWalletSignature } from '@/lib/verify-wallet-signature';
import { getConnection, getServerKeypair, getCurrentEpochDay, pollConfirmation } from '@/lib/solana';
import { getServiceClient } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rl = rateLimit(`v1-claim:${ip}`, { limit: 3, windowMs: 60_000 });
    if (!rl.allowed) {
      return withCors(NextResponse.json({ error: 'Too many requests' }, { status: 429 }));
    }

    const { wallet, signature, message } = await request.json();
    if (!wallet || !signature || !message) {
      return withCors(NextResponse.json({ error: 'Missing required fields: wallet, signature, message' }, { status: 400 }));
    }

    const match = message.match(/^Sigil claim rewards: (\d+):(\d+)$/);
    if (!match) {
      return withCors(NextResponse.json({ error: 'Invalid message format. Expected: Sigil claim rewards: {epochDay}:{timestamp}' }, { status: 400 }));
    }
    const msgDay = parseInt(match[1], 10);
    const msgTimestamp = parseInt(match[2], 10);
    if (msgDay !== getCurrentEpochDay()) {
      return withCors(NextResponse.json({ error: 'Invalid or expired claim message' }, { status: 400 }));
    }
    if (Math.abs(Date.now() - msgTimestamp) > 5 * 60 * 1000) {
      return withCors(NextResponse.json({ error: 'Message expired, please try again' }, { status: 400 }));
    }

    if (!verifyWalletSignature(wallet, signature, message)) {
      return withCors(NextResponse.json({ error: 'Invalid signature' }, { status: 400 }));
    }

    const supabase = getServiceClient();

    const { data: checkIns } = await supabase
      .from('check_ins')
      .select('epoch_day, weight')
      .eq('wallet', wallet);

    if (!checkIns || checkIns.length === 0) {
      return withCors(NextResponse.json({ error: 'No check-ins found' }, { status: 400 }));
    }

    const epochDays = checkIns.map((c) => c.epoch_day);
    const { data: claims } = await supabase
      .from('day_claims')
      .select('epoch_day, incentive_lamports, total_weight')
      .in('epoch_day', epochDays)
      .gt('total_weight', 0);

    const { data: distributed } = await supabase
      .from('reward_ledger')
      .select('epoch_day, amount_lamports')
      .eq('wallet', wallet)
      .in('status', ['sent', 'pending']);

    const distributedByDay = new Map<number, number>();
    (distributed || []).forEach((r) => {
      distributedByDay.set(r.epoch_day, (distributedByDay.get(r.epoch_day) || 0) + r.amount_lamports);
    });

    let totalPending = 0;
    const pendingDays: { epochDay: number; amount: number }[] = [];

    for (const claim of claims || []) {
      const checkIn = checkIns.find((c) => c.epoch_day === claim.epoch_day);
      if (!checkIn || claim.total_weight === 0) continue;

      const earned = Math.floor((checkIn.weight / claim.total_weight) * claim.incentive_lamports);
      const paid = distributedByDay.get(claim.epoch_day) || 0;
      const pending = Math.max(0, earned - paid);

      if (pending > 0) {
        totalPending += pending;
        pendingDays.push({ epochDay: claim.epoch_day, amount: pending });
      }
    }

    if (totalPending === 0) {
      return withCors(NextResponse.json({ error: 'No pending rewards' }, { status: 400 }));
    }

    // Send SOL from server keypair to holder
    const connection = getConnection();
    const serverKeypair = getServerKeypair();
    const publicKey = new PublicKey(wallet);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: serverKeypair.publicKey,
        toPubkey: publicKey,
        lamports: totalPending,
      })
    );
    tx.feePayer = serverKeypair.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(serverKeypair);

    const txSig = await connection.sendRawTransaction(tx.serialize());
    await pollConfirmation(connection, txSig);

    for (const day of pendingDays) {
      await supabase.from('reward_ledger').insert({
        epoch_day: day.epochDay,
        wallet,
        amount_lamports: day.amount,
        tx_signature: txSig,
        status: 'sent',
      });
    }

    return withCors(
      NextResponse.json({
        success: true,
        totalLamports: totalPending,
        totalSol: totalPending / 1e9,
        txSignature: txSig,
        daysSettled: pendingDays.length,
      })
    );
  } catch (error) {
    console.error('Reward claim v1 error:', error);
    return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
  }
}
