import { ImageResponse } from 'next/og';
import { getServiceClient } from '@/lib/supabase';
import { getCurrentEpochDay } from '@/lib/solana';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = getCurrentEpochDay();
  const supabase = getServiceClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sigil.bond';

  let advertiser = 'No one yet';
  let pfpUrl = '';
  let checkInCount = 0;
  let billboardImageUrl = '';
  let incentiveSol = '0';
  let linkUrl = '';
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
      billboardImageUrl = claim.image_url || '';
      incentiveSol = ((claim.incentive_lamports || 0) / 1e9).toFixed(2);
      linkUrl = claim.link_url || '';
    }

    const { count } = await supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('epoch_day', today);
    checkInCount = count || 0;

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

  // 1200x630 — optimal for Twitter/FB/Discord/iMessage
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #0a0f1a 0%, #1a1040 40%, #0d1225 100%)',
          fontFamily,
          color: 'white',
        }}
      >
        {/* Left: Billboard image or glyph */}
        <div
          style={{
            width: 420,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {billboardImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={billboardImageUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
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
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle at center, rgba(139,92,246,0.15) 0%, transparent 70%)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${baseUrl}/sigil.png`}
                alt=""
                style={{ width: 200, height: 200, borderRadius: 32, opacity: 0.6 }}
              />
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>
                No billboard today
              </span>
            </div>
          )}

          {/* Gradient overlay on image edge */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 80,
              height: '100%',
              background: 'linear-gradient(to right, transparent, #0d1225)',
              display: 'flex',
            }}
          />
        </div>

        {/* Right: Info panel */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '40px 48px 40px 24px',
          }}
        >
          {/* Logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/sigil.png`}
              alt=""
              style={{ width: 40, height: 40, borderRadius: 10, marginRight: 14 }}
            />
            <span style={{ fontSize: 42, fontWeight: 800, color: '#a78bfa', letterSpacing: -1 }}>
              SIGIL
            </span>
          </div>
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', marginBottom: 28, display: 'flex' }}>
            Billboard That Pays Rent
          </span>

          {/* Advertiser card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(167, 139, 250, 0.08)',
              border: '1px solid rgba(167, 139, 250, 0.2)',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 20,
            }}
          >
            {pfpUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pfpUrl}
                alt=""
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  marginRight: 16,
                  border: '2px solid rgba(167, 139, 250, 0.4)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  marginRight: 16,
                  backgroundColor: 'rgba(167, 139, 250, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: 'rgba(167, 139, 250, 0.6)',
                }}
              >
                ?
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                {dateStr} — Today&apos;s Advertiser
              </span>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{advertiser}</span>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                padding: '12px 8px',
                backgroundColor: 'rgba(167, 139, 250, 0.06)',
                borderRadius: 12,
                border: '1px solid rgba(167, 139, 250, 0.12)',
              }}
            >
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Check-ins</span>
              <span style={{ fontSize: 26, fontWeight: 700, color: '#a78bfa' }}>{checkInCount}</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                padding: '12px 8px',
                backgroundColor: 'rgba(167, 139, 250, 0.06)',
                borderRadius: 12,
                border: '1px solid rgba(167, 139, 250, 0.12)',
              }}
            >
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Pool</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{incentiveSol} SOL</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                padding: '12px 8px',
                backgroundColor: 'rgba(167, 139, 250, 0.06)',
                borderRadius: 12,
                border: '1px solid rgba(167, 139, 250, 0.12)',
              }}
            >
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Days Sold</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{totalClaims}</span>
            </div>
          </div>

          {/* Link preview if advertiser has one */}
          {linkUrl && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 14px',
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                borderRadius: 10,
                border: '1px solid rgba(34, 197, 94, 0.2)',
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 12, color: 'rgba(34, 197, 94, 0.8)', marginRight: 6 }}>
                &#8599;
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.5)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 400,
                }}
              >
                {linkUrl.replace(/^https?:\/\//, '').slice(0, 50)}
              </span>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            10,000 NFTs &middot; Solana &middot; sigil.bond
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
