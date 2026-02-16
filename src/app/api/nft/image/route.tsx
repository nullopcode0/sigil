import { ImageResponse } from 'next/og';
import { getServiceClient } from '@/lib/supabase';
import { getCurrentEpochDay } from '@/lib/solana';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = getCurrentEpochDay();
  const supabase = getServiceClient();

  // Get today's claim
  let advertiser = 'No one yet';
  let pfpUrl = '';
  let checkInCount = 0;
  let billboardImageUrl = '';
  let incentiveSol = '0';

  try {
    const { data: claim } = await supabase
      .from('day_claims')
      .select('*')
      .eq('epoch_day', today)
      .eq('moderation_status', 'approved')
      .maybeSingle();

    if (claim) {
      advertiser = claim.farcaster_username || claim.claimer_wallet?.slice(0, 8) + '...';
      pfpUrl = claim.farcaster_pfp_url || '';
      incentiveSol = ((claim.incentive_lamports || 0) / 1e9).toFixed(2);
      // Use image_url from DB, or fall back to Supabase storage path (matches home page)
      billboardImageUrl = claim.image_url || '';
      if (!billboardImageUrl) {
        const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (storageBase) {
          billboardImageUrl = `${storageBase}/storage/v1/object/public/day-images/day-${today}.png`;
        }
      }
    }
  } catch { /* ignore claim errors */ }

  try {
    const { count } = await supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('epoch_day', today);
    checkInCount = count ?? 0;
  } catch { /* ignore count errors */ }

  // If there's an uploaded billboard image, proxy it directly
  // (Solana wallets/NFT renderers don't follow HTTP redirects)
  if (billboardImageUrl) {
    try {
      const imgRes = await fetch(billboardImageUrl);
      if (imgRes.ok) {
        const imgBytes = await imgRes.arrayBuffer();
        return new Response(imgBytes, {
          status: 200,
          headers: {
            'Content-Type': imgRes.headers.get('Content-Type') || 'image/png',
            'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
          },
        });
      }
    } catch { /* fall through to generated image */ }
  }

  // Otherwise generate a default OG image
  let fontData: ArrayBuffer | null = null;
  try {
    const fontRes = await fetch(
      'https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsjNsFjTDJK.woff'
    );
    if (fontRes.ok) fontData = await fontRes.arrayBuffer();
  } catch { /* fallback */ }

  const fontFamily = fontData ? 'Space Grotesk' : 'sans-serif';
  const dateStr = new Date(today * 86400 * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0a0f1a 0%, #1a1040 50%, #0a0f1a 100%)',
          fontFamily,
          color: 'white',
          padding: 60,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          <span style={{ fontSize: 72, fontWeight: 800, color: '#a78bfa', letterSpacing: -2 }}>
            SIGIL
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(167, 139, 250, 0.1)',
            border: '2px solid rgba(167, 139, 250, 0.3)',
            borderRadius: 24,
            padding: '24px 40px',
            marginBottom: 30,
          }}
        >
          {pfpUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pfpUrl}
              alt=""
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                marginRight: 24,
                border: '3px solid rgba(167, 139, 250, 0.5)',
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                marginRight: 24,
                backgroundColor: 'rgba(167, 139, 250, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
              }}
            >
              ?
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              Today&apos;s Advertiser
            </span>
            <span style={{ fontSize: 32, fontWeight: 700 }}>{advertiser}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 40 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 32px',
              backgroundColor: 'rgba(167, 139, 250, 0.08)',
              borderRadius: 16,
              border: '1px solid rgba(167, 139, 250, 0.2)',
            }}
          >
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Check-ins</span>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#a78bfa' }}>{checkInCount}</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 32px',
              backgroundColor: 'rgba(167, 139, 250, 0.08)',
              borderRadius: 16,
              border: '1px solid rgba(167, 139, 250, 0.2)',
            }}
          >
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Pool</span>
            <span style={{ fontSize: 24, fontWeight: 600 }}>{incentiveSol} SOL</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 32px',
              backgroundColor: 'rgba(167, 139, 250, 0.08)',
              borderRadius: 16,
              border: '1px solid rgba(167, 139, 250, 0.2)',
            }}
          >
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Date</span>
            <span style={{ fontSize: 24, fontWeight: 600 }}>{dateStr}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 40,
            fontSize: 16,
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          Billboard NFT &middot; 10,000 editions &middot; sigil.bond
        </div>
      </div>
    ),
    {
      width: 800,
      height: 800,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
      },
      ...(fontData
        ? {
            fonts: [
              {
                name: 'Space Grotesk',
                data: fontData,
                style: 'normal' as const,
                weight: 700 as const,
              },
            ],
          }
        : {}),
    }
  );
}
