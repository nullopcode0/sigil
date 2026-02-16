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
    // Note: .eq('wallet', wallet) alone returns empty due to PostgREST bug,
    // so we fetch all and filter in JS (table is small)
    const { data: allCheckIns } = await supabase
      .from('check_ins')
      .select('epoch_day, weight, wallet');
    const checkIns = (allCheckIns || []).filter((c) => c.wallet === wallet);

    if (!checkIns || checkIns.length === 0) {
      // No check-ins — check if there's a claimable day today
      const { data: todayClaim } = await supabase
        .from('day_claims')
        .select('incentive_lamports')
        .eq('epoch_day', today)
        .single();

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

    // Get settled days (total_weight > 0) that this wallet checked into
    const epochDays = checkIns.map((c) => c.epoch_day);
    const { data: claims } = await supabase
      .from('day_claims')
      .select('epoch_day, incentive_lamports, total_weight')
      .in('epoch_day', epochDays)
      .gt('total_weight', 0);

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
    const todayCheckIn = checkIns.find((c) => c.epoch_day === today);
    if (todayCheckIn) {
      // Get today's claim
      const { data: todayClaim } = await supabase
        .from('day_claims')
        .select('incentive_lamports, total_weight')
        .eq('epoch_day', today)
        .single();

      if (todayClaim && todayClaim.total_weight === 0) {
        // Unsettled — calculate estimate from current check-ins (reuse allCheckIns)
        const todayWeights = (allCheckIns || []).filter((c) => c.epoch_day === today);
        const currentTotalWeight = todayWeights.reduce((sum, row) => sum + row.weight, 0);
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
    }

    // Get today's pool size regardless
    let todayPool = 0;
    if (!todayCheckIn) {
      const { data: todayClaim } = await supabase
        .from('day_claims')
        .select('incentive_lamports')
        .eq('epoch_day', today)
        .single();
      todayPool = todayClaim ? todayClaim.incentive_lamports / 1e9 : 0;
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