import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
    }

    // Get all claims by this wallet
    const { data: claims } = await supabase
      .from('day_claims')
      .select('epoch_day, claimed_at, farcaster_username')
      .eq('claimer_wallet', wallet)
      .order('epoch_day', { ascending: false });

    if (!claims || claims.length === 0) {
      return NextResponse.json({ claims: [], totalClicks: 0 });
    }

    // Get click counts for each claimed day
    const epochDays = claims.map((c) => c.epoch_day);
    const { data: clicks } = await supabase
      .from('clicks')
      .select('epoch_day')
      .in('epoch_day', epochDays);

    // Count clicks per day
    const clickCounts: Record<number, number> = {};
    clicks?.forEach((c) => {
      clickCounts[c.epoch_day] = (clickCounts[c.epoch_day] || 0) + 1;
    });

    const enrichedClaims = claims.map((c) => ({
      epochDay: c.epoch_day,
      claimedAt: c.claimed_at,
      farcasterUsername: c.farcaster_username,
      clicks: clickCounts[c.epoch_day] || 0,
      date: new Date(c.epoch_day * 86400 * 1000).toISOString().split('T')[0],
    }));

    const totalClicks = Object.values(clickCounts).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      claims: enrichedClaims,
      totalClicks,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
