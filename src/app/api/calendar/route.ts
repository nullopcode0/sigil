import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentEpochDay } from '@/lib/solana';

export async function GET() {
  try {
    const today = getCurrentEpochDay();
    const windowStart = today;
    const windowEnd = today + 30;

    // Fetch all claims in the 30-day window
    const { data: claims } = await supabase
      .from('day_claims')
      .select('epoch_day, claimer_wallet, farcaster_username, farcaster_pfp_url')
      .gte('epoch_day', windowStart)
      .lte('epoch_day', windowEnd)
      .order('epoch_day', { ascending: true });

    // Build calendar grid
    const days = [];
    for (let d = windowStart; d <= windowEnd; d++) {
      const claim = claims?.find((c) => c.epoch_day === d);
      const date = new Date(d * 86400 * 1000);
      days.push({
        epochDay: d,
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: d === today,
        claimed: !!claim,
        farcasterUsername: claim?.farcaster_username || null,
        farcasterPfp: claim?.farcaster_pfp_url || null,
        wallet: claim?.claimer_wallet || null,
      });
    }

    return NextResponse.json({ days, today });
  } catch (error) {
    console.error('Calendar error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
