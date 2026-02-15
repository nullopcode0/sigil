import { NextRequest, NextResponse } from 'next/server';
import { supabase, getServiceClient } from '@/lib/supabase';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const epochDay = parseInt(searchParams.get('d') || '0', 10);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  if (!epochDay) {
    return NextResponse.redirect(baseUrl);
  }

  try {
    // Look up the claim for this day
    const { data: claim } = await supabase
      .from('day_claims')
      .select('link_url')
      .eq('epoch_day', epochDay)
      .single();

    if (!claim?.link_url) {
      return NextResponse.redirect(baseUrl);
    }

    // Log click
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex');
    const referrer = request.headers.get('referer') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const serviceClient = getServiceClient();
    await serviceClient.from('clicks').insert({
      epoch_day: epochDay,
      timestamp: new Date().toISOString(),
      referrer,
      user_agent: userAgent,
      ip_hash: ipHash,
    });

    // 302 redirect to the claimer's link
    return NextResponse.redirect(claim.link_url, 302);
  } catch (error) {
    console.error('Redirect error:', error);
    return NextResponse.redirect(baseUrl);
  }
}
