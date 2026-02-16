import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  const epochDay = Number(request.nextUrl.searchParams.get('epochDay'));

  if (!wallet || !epochDay) {
    return NextResponse.json({ checkedIn: false, totalCheckedIn: 0 });
  }

  const supabase = getServiceClient();

  // Fetch all check-ins for this day (small dataset, avoids PostgREST count bug)
  const { data: dayCheckIns } = await supabase
    .from('check_ins')
    .select('wallet, weight, checked_in_at')
    .eq('epoch_day', epochDay)
    .order('checked_in_at', { ascending: true });

  const all = dayCheckIns || [];
  const totalCheckedIn = all.length;
  const myCheckIn = all.find((c) => c.wallet === wallet);

  if (myCheckIn) {
    const position = all.indexOf(myCheckIn) + 1;
    return NextResponse.json({
      checkedIn: true,
      weight: myCheckIn.weight,
      position,
      totalCheckedIn,
    });
  }

  return NextResponse.json({
    checkedIn: false,
    totalCheckedIn,
  });
}