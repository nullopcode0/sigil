import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getConnection, getCurrentEpochDay, DAILY_BONUS_THRESHOLD } from '@/lib/solana';
import { getServiceClient } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per minute per IP
    const ip = getClientIp(request.headers);
    const rl = rateLimit(`checkin:${ip}`, { limit: 5, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { wallet, signature, message } = await request.json();
    if (!wallet || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const today = getCurrentEpochDay();

    // Validate message: "Sigil check-in: {epochDay}:{timestamp}"
    // Timestamp must be within 5 minutes
    const match = message.match(/^Sigil check-in: (\d+):(\d+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    const msgDay = parseInt(match[1], 10);
    const msgTimestamp = parseInt(match[2], 10);
    if (msgDay !== today) {
      return NextResponse.json({ error: 'Invalid or expired check-in message' }, { status: 400 });
    }
    if (Math.abs(Date.now() - msgTimestamp) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Message expired, please try again' }, { status: 400 });
    }

    // Verify signature
    const publicKey = new PublicKey(wallet);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Verify NFT holder
    const connection = getConnection();
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });
    const holdsNft = tokenAccounts.value.some((acc) => {
      const info = acc.account.data.parsed.info;
      return info.tokenAmount.uiAmount === 1 && info.tokenAmount.decimals === 0;
    });
    if (!holdsNft) {
      return NextResponse.json({ error: 'Must hold a Sigil NFT to check in' }, { status: 403 });
    }

    const supabase = getServiceClient();

    // Count today's check-ins so far to determine weight
    const { count: checkInCount } = await supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('epoch_day', today);

    const position = (checkInCount ?? 0) + 1;
    const weight = position <= DAILY_BONUS_THRESHOLD ? 2 : 1;

    // Insert check-in (UNIQUE constraint prevents double check-in)
    const { error } = await supabase.from('check_ins').insert({
      epoch_day: today,
      wallet,
      weight,
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already checked in today' }, { status: 409 });
      }
      console.error('Check-in error:', error);
      return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      position,
      totalCheckedIn: position,
      weight,
      bonusEarned: weight === 2,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
