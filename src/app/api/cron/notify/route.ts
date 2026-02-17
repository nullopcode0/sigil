import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEpochDay } from '@/lib/solana';
import { supabase } from '@/lib/supabase';
import { cast } from '@/lib/neynar';
import { postToChannel } from '@/lib/telegram';
import { postToBluesky } from '@/lib/bluesky';
import { postToLens } from '@/lib/lens';
import { postToDiscordSubscribers } from '@/lib/discord';

const LAMPORTS_PER_SOL = 1_000_000_000;

/** Post to Farcaster, Telegram, Bluesky, Lens, and Discord in parallel. */
async function broadcast(text: string, embeds?: { url: string }[]): Promise<{
  posted: boolean;
  platforms: Record<string, boolean>;
  errors: Record<string, string>;
}> {
  const errors: Record<string, string> = {};

  const [fcResult, tgResult, bskyResult, lensResult, discordResult] = await Promise.all([
    cast({ text, embeds }).catch((e) => { errors.farcaster = String(e); return { success: false }; }),
    postToChannel(text).catch((e) => { errors.telegram = String(e); return false; }),
    postToBluesky(text).catch((e) => { errors.bluesky = String(e); return false; }),
    postToLens(text).catch((e) => { errors.lens = String(e); return false; }),
    postToDiscordSubscribers(text).catch((e) => { errors.discord = String(e); return false; }),
  ]);

  const platforms = {
    farcaster: fcResult.success,
    telegram: tgResult as boolean,
    bluesky: bskyResult as boolean,
    lens: lensResult as boolean,
    discord: discordResult as boolean,
  };

  // Log errors for platforms that returned false without throwing
  if (!platforms.bluesky && !errors.bluesky) errors.bluesky = 'returned false (check env vars or API)';
  if (!platforms.lens && !errors.lens) errors.lens = 'returned false (check env vars or API)';
  if (!platforms.discord && !errors.discord) errors.discord = 'returned false (no subscriptions or env missing)';
  if (!platforms.telegram && !errors.telegram) errors.telegram = 'returned false (check TELEGRAM_CHANNEL_ID)';

  console.log('Broadcast results:', platforms, 'errors:', errors);
  return { posted: Object.values(platforms).some(Boolean), platforms, errors };
}

/**
 * Notification cron — runs daily (or on demand).
 * Checks for notable events and broadcasts to all platforms.
 *
 * Trigger: Vercel cron (GET) or manual POST with CRON_SECRET
 */
// Vercel crons invoke GET
export async function GET(request: NextRequest) {
  return handleNotify(request);
}

export async function POST(request: NextRequest) {
  return handleNotify(request);
}

async function handleNotify(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = getCurrentEpochDay();
  const yesterday = today - 1;
  const posted: string[] = [];
  const platformResults: Record<string, Record<string, boolean>> = {};
  const platformErrors: Record<string, Record<string, string>> = {};

  try {
    // 1. Day flip — announce yesterday's billboard + today is open
    const { data: yesterdayClaim } = await supabase
      .from('day_claims')
      .select('epoch_day, claimer_wallet, incentive_lamports, farcaster_username, image_url, link_url')
      .eq('epoch_day', yesterday)
      .single();

    if (yesterdayClaim) {
      const sol = (yesterdayClaim.incentive_lamports / LAMPORTS_PER_SOL).toFixed(2);
      const who = yesterdayClaim.farcaster_username
        ? `@${yesterdayClaim.farcaster_username}`
        : yesterdayClaim.claimer_wallet.slice(0, 8) + '...';

      const embeds: { url: string }[] = [];
      if (yesterdayClaim.link_url) embeds.push({ url: yesterdayClaim.link_url });
      if (yesterdayClaim.image_url) embeds.push({ url: yesterdayClaim.image_url });

      const text = `Day ${yesterday} billboard by ${who} (${sol} SOL incentive).\n\nToday's billboard is open — claim it at sigil.bond`;

      const result = await broadcast(text, embeds);
      platformResults.day_flip = result.platforms;
      if (Object.keys(result.errors).length) platformErrors.day_flip = result.errors;
      if (result.posted) posted.push('day_flip');
    }

    // 2. Largest incentive ever — check if yesterday was a record
    const { data: allClaims } = await supabase
      .from('day_claims')
      .select('epoch_day, incentive_lamports')
      .order('incentive_lamports', { ascending: false })
      .limit(1);

    if (
      allClaims?.[0] &&
      allClaims[0].epoch_day === yesterday &&
      yesterdayClaim &&
      yesterdayClaim.incentive_lamports >= 500_000_000 // only if >= 0.5 SOL
    ) {
      const sol = (yesterdayClaim.incentive_lamports / LAMPORTS_PER_SOL).toFixed(2);
      const text = `New record! Day ${yesterday} set the highest incentive ever on Sigil: ${sol} SOL.\n\nsigil.bond`;
      const result = await broadcast(text);
      platformResults.record_incentive = result.platforms;
      if (Object.keys(result.errors).length) platformErrors.record_incentive = result.errors;
      if (result.posted) posted.push('record_incentive');
    }

    // 3. Mint milestones
    const { count } = await supabase
      .from('nft_mints')
      .select('*', { count: 'exact', head: true });

    const totalMinted = count || 0;
    const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

    for (const m of milestones) {
      if (totalMinted >= m && totalMinted < m + 5) {
        // Check if we already posted this milestone (simple: skip if > 5 past it)
        const text = `${m} Sigils minted! The billboard grows.\n\nMint yours at sigil.bond`;
        const result = await broadcast(text);
        platformResults[`milestone_${m}`] = result.platforms;
        if (Object.keys(result.errors).length) platformErrors[`milestone_${m}`] = result.errors;
        if (result.posted) posted.push(`milestone_${m}`);
        break; // only post one milestone per run
      }
    }

    // 4. High check-in day
    const { data: checkInData } = await supabase
      .from('check_ins')
      .select('epoch_day')
      .eq('epoch_day', yesterday);

    const checkInCount = checkInData?.length || 0;
    if (checkInCount >= 50) {
      const text = `${checkInCount} holders checked in on Day ${yesterday}. The Sigil community is active.\n\nsigil.bond`;
      const result = await broadcast(text);
      platformResults.high_checkins = result.platforms;
      if (Object.keys(result.errors).length) platformErrors.high_checkins = result.errors;
      if (result.posted) posted.push('high_checkins');
    }

    return NextResponse.json({
      ok: true, posted, platforms: platformResults,
      ...(Object.keys(platformErrors).length ? { errors: platformErrors } : {}),
      today, yesterday,
    });
  } catch (error) {
    console.error('Notify cron error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
