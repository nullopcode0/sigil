import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getCurrentEpochDay } from '@/lib/solana';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const today = getCurrentEpochDay();

    // Get all check-ins for this wallet
    const { data: checkIns } = await supabase
      .from('check_ins')
      .select('epoch_day, weight')
      .eq('wallet', wallet);

    if (!checkIns || checkIns.length === 0) {
      // No check-ins — check if there's a claimable day today
      const { data: todayClaim } = await supabase
        .from('day_claims')
        .select('incentive_lamports')
        .eq('epoch_day', today)
        .maybeSingle();

      return NextResponse.json({
        pendingLamports: 0,
        pendingSol: 0,
        daysCheckedIn: 0,
        bonusDays: 0,
        dayBreakdown: [],
        todayEstimate: null,
        todayPool: todayClaim ? todayClaim.incentive_lamports / 1e9 : 0,
      });
    }

    // Get settled days that this wallet checked into
    // Fetch by epoch_day, then filter total_weight > 0 in JS
    const epochDays = checkIns.map((c) => c.epoch_day);
    const { data: allClaims } = await supabase
      .from('day_claims')
      .select('epoch_day, incentive_lamports, total_weight')
      .in('epoch_day', epochDays);
    const claims = (allClaims || []).filter((c) => c.total_weight > 0);

    // Get already-distributed rewards
    const { data: distributed } = await supabase
      .from('reward_ledger')
      .select('epoch_day, amount_lamports')
      .eq('wallet', wallet)
      .in('status', ['sent', 'pending']);

    const distributedByDay = new Map<number, number>();
    (distributed || []).forEach((r) => {
      distributedByDay.set(r.epoch_day, (distributedByDay.get(r.epoch_day) || 0) + r.amount_lamports);
    });

    // Calculate pending per settled day
    const dayBreakdown: { epochDay: number; weight: number; totalWeight: number; incentiveLamports: number; earnedLamports: number; paidLamports: number; pendingLamports: number }[] = [];
    let totalPending = 0;

    for (const claim of (claims || [])) {
      const checkIn = checkIns.find((c) => c.epoch_day === claim.epoch_day);
      if (!checkIn || claim.total_weight === 0) continue;

      const earned = Math.floor((checkIn.weight / claim.total_weight) * claim.incentive_lamports);
      const paid = distributedByDay.get(claim.epoch_day) || 0;
      const pending = Math.max(0, earned - paid);

      dayBreakdown.push({
        epochDay: claim.epoch_day,
        weight: checkIn.weight,
        totalWeight: claim.total_weight,
        incentiveLamports: claim.incentive_lamports,
        earnedLamports: earned,
        paidLamports: paid,
        pendingLamports: pending,
      });

      totalPending += pending;
    }

    // Calculate estimated rewards for today (unsettled)
    let todayEstimate = null;
    let todayPool = 0;
    const todayCheckIn = checkIns.find((c) => c.epoch_day === today);

    const { data: todayClaim } = await supabase
      .from('day_claims')
      .select('incentive_lamports, total_weight')
      .eq('epoch_day', today)
      .maybeSingle();

    if (todayCheckIn && todayClaim && todayClaim.total_weight === 0) {
      // Unsettled — calculate estimate from current check-ins
      const { data: todayCheckins } = await supabase
        .from('check_ins')
        .select('weight')
        .eq('epoch_day', today);
      const currentTotalWeight = (todayCheckins || []).reduce((sum, row) => sum + row.weight, 0);
      if (currentTotalWeight > 0) {
        const estimated = Math.floor((todayCheckIn.weight / currentTotalWeight) * todayClaim.incentive_lamports);
        todayEstimate = {
          epochDay: today,
          weight: todayCheckIn.weight,
          currentTotalWeight,
          incentiveLamports: todayClaim.incentive_lamports,
          estimatedLamports: estimated,
          estimatedSol: estimated / 1e9,
        };
      }
    }

    if (!todayCheckIn && todayClaim) {
      todayPool = todayClaim.incentive_lamports / 1e9;
    }

    return NextResponse.json({
      pendingLamports: totalPending,
      pendingSol: totalPending / 1e9,
      daysCheckedIn: checkIns.length,
      bonusDays: checkIns.filter((c) => c.weight === 2).length,
      dayBreakdown,
      todayEstimate,
      todayPool,
    });
  } catch (error) {
    console.error('Rewards error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}