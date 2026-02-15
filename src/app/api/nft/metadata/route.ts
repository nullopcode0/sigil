import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentEpochDay } from '@/lib/solana';

export async function GET() {
  try {
    const today = getCurrentEpochDay();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Look up today's claim
    const { data: claim } = await supabase
      .from('day_claims')
      .select('*')
      .eq('epoch_day', today)
      .single();

    // Count clicks for today
    const { count: clickCount } = await supabase
      .from('clicks')
      .select('*', { count: 'exact', head: true })
      .eq('epoch_day', today);

    const controller = claim?.farcaster_username || 'No one yet';

    return NextResponse.json(
      {
        name: 'Sigil',
        symbol: 'SIGIL',
        description: `A living NFT. Today's controller: ${controller}. ${clickCount || 0} clicks so far.`,
        image: `${baseUrl}/api/nft/image`,
        external_url: `${baseUrl}/api/redirect?d=${today}`,
        attributes: [
          { trait_type: 'Type', value: 'Living NFT' },
          { trait_type: 'Supply', value: '1000' },
          { trait_type: 'Controller', value: controller },
          { trait_type: 'Clicks Today', value: String(clickCount || 0) },
          { trait_type: 'Epoch Day', value: String(today) },
        ],
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Metadata error:', error);
    return NextResponse.json(
      {
        name: 'Sigil',
        symbol: 'SIGIL',
        description: 'A living NFT that updates daily.',
        image: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/nft/image`,
        attributes: [{ trait_type: 'Type', value: 'Living NFT' }],
      },
      { status: 200 }
    );
  }
}
