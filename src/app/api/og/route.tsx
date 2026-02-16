import { ImageResponse } from 'next/og';
import { getServiceClient } from '@/lib/supabase';
import { getCurrentEpochDay } from '@/lib/solana';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = getCurrentEpochDay();
  const supabase = getServiceClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.sigil.bond';

  let advertiser = 'No one yet';
  let pfpUrl = '';
  let checkInCount = 0;
  let billboardImageUrl = '';
  let incentiveSol = '0';
  let totalClaims = 0;

  try {
    const { data: claim } = await supabase
      .from('day_claims')
      .select('*')
      .eq('epoch_day', today)
      .eq('moderation_status', 'approved')
      .single();

    if (claim) {
      advertiser = claim.farcaster_username || claim.claimer_wallet?.slice(0, 8) + '...';
      pfpUrl = claim.farcaster_pfp_url || '';
      // Use storage URL pattern (claim.image_url returns null from Supabase JS client)
      billboardImageUrl = `${supabaseUrl}/storage/v1/object/public/day-images/day-${today}.png`;
      incentiveSol = ((claim.incentive_lamports || 0) / 1e9).toFixed(2);
    }

    const { count: ciCount } = await supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('epoch_day', today);
    checkInCount = ciCount ?? 0;

    const { count: claimCount } = await supabase
      .from('day_claims')
      .select('*', { count: 'exact', head: true });
    totalClaims = claimCount || 0;
  } catch { /* defaults */ }

  let fontData: ArrayBuffer | null = null;
  try {
    const fontRes = await fetch(
      'https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsjNsFjTDJK.woff'
    );
    if (fontRes.ok) fontData = await fontRes.arrayBuffer();
  } catch { /* fallback */ }

  const fontFamily = fontData ? 'Space Grotesk' : 'sans-serif';
  const dateStr = new Date(today * 86400 * 1000).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // 1200x630 — optimal for Twitter/FB/Discord/Farcaster
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0f1a 0%, #1a1040 40%, #0d1225 100%)',
          fontFamily,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background: faded claim image */}
        {billboardImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={billboardImageUrl}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              objectFit: 'cover',
              opacity: 0.1,
            }}
          />
        )}
        {/* Inner wrapper — centered with explicit margins */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 60,
            marginRight: 60,
          }}
        >
          {/* Left: Billboard image or glyph */}
          <div
            style={{
              width: 380,
              height: 380,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 32,
              overflow: 'hidden',
              flexShrink: 0,
              border: '3px solid rgba(167, 139, 250, 0.3)',
            }}
          >
            {billboardImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={billboardImageUrl}
                alt=""
                style={{
                  width: 380,
                  height: 380,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 380,
                  height: 380,
                  background: 'radial-gradient(circle at center, rgba(139,92,246,0.15) 0%, transparent 70%)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${baseUrl}/sigil.png`}
                  alt=""
                  style={{ width: 200, height: 200, borderRadius: 32, opacity: 0.6 }}
                />
                <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>
                  No billboard today
                </span>
              </div>
            )}
          </div>

          {/* Right: Info panel */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingLeft: 48,
              maxWidth: 640,
            }}
          >
            {/* Logo + title */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${baseUrl}/sigil.png`}
                alt=""
                style={{ width: 52, height: 52, borderRadius: 14, marginRight: 16 }}
              />
              <span style={{ fontSize: 56, fontWeight: 800, color: '#a78bfa', letterSpacing: -2 }}>
                SIGIL
              </span>
            </div>
            <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.35)', marginBottom: 24, display: 'flex' }}>
              Billboard That Pays Rent
            </span>

            {/* Advertiser card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(167, 139, 250, 0.08)',
                border: '2px solid rgba(167, 139, 250, 0.2)',
                borderRadius: 20,
                padding: '18px 24px',
                marginBottom: 20,
              }}
            >
              {pfpUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pfpUrl}
                  alt=""
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    marginRight: 20,
                    border: '3px solid rgba(167, 139, 250, 0.4)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    marginRight: 20,
                    backgroundColor: 'rgba(167, 139, 250, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    color: 'rgba(167, 139, 250, 0.6)',
                  }}
                >
                  ?
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                  {dateStr} — Today&apos;s Advertiser
                </span>
                <span style={{ fontSize: 32, fontWeight: 700 }}>{advertiser}</span>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 160,
                  padding: '10px 8px',
                  backgroundColor: 'rgba(167, 139, 250, 0.06)',
                  borderRadius: 14,
                  border: '1px solid rgba(167, 139, 250, 0.12)',
                }}
              >
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>Check-ins</span>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#a78bfa' }}>{checkInCount}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 160,
                  padding: '10px 8px',
                  backgroundColor: 'rgba(167, 139, 250, 0.06)',
                  borderRadius: 14,
                  border: '1px solid rgba(167, 139, 250, 0.12)',
                }}
              >
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>Pool</span>
                <span style={{ fontSize: 28, fontWeight: 600 }}>{incentiveSol} SOL</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 160,
                  padding: '10px 8px',
                  backgroundColor: 'rgba(167, 139, 250, 0.06)',
                  borderRadius: 14,
                  border: '1px solid rgba(167, 139, 250, 0.12)',
                }}
              >
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>Days Sold</span>
                <span style={{ fontSize: 28, fontWeight: 600 }}>{totalClaims}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.2)', marginTop: 16 }}>
              10,000 NFTs &middot; Solana &middot; sigil.bond
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
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
