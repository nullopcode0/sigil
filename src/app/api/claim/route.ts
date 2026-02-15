import { NextRequest, NextResponse } from 'next/server';
import { getConnection, pollConfirmation } from '@/lib/solana';
import { getServiceClient } from '@/lib/supabase';

async function sendModerationEmail(epochDay: number, claimerWallet: string, imageUrl: string | null, linkUrl: string | null, incentiveSol: string, farcasterUsername: string | null) {
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminSecret = process.env.ADMIN_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sigil.bond';
  if (!resendKey || !adminEmail || !adminSecret) return;

  const date = new Date(epochDay * 86400 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const approveUrl = `${baseUrl}/api/admin/review?secret=${adminSecret}&day=${epochDay}&action=approve`;
  const denyUrl = `${baseUrl}/api/admin/review?secret=${adminSecret}&day=${epochDay}&action=deny`;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h2 style="color:#8b5cf6;margin-bottom:4px">Sigil Billboard Claim</h2>
      <p style="color:#666;font-size:14px;margin-top:0">${date} (epoch ${epochDay})</p>
      <table style="width:100%;font-size:14px;margin:16px 0">
        <tr><td style="color:#888;padding:4px 0">Wallet</td><td style="font-family:monospace;font-size:12px">${claimerWallet.slice(0, 8)}...${claimerWallet.slice(-6)}</td></tr>
        <tr><td style="color:#888;padding:4px 0">Incentive</td><td>${incentiveSol} SOL</td></tr>
        ${farcasterUsername ? `<tr><td style="color:#888;padding:4px 0">Farcaster</td><td>${farcasterUsername}</td></tr>` : ''}
        ${linkUrl ? `<tr><td style="color:#888;padding:4px 0">Link</td><td><a href="${linkUrl}">${linkUrl}</a></td></tr>` : ''}
      </table>
      ${imageUrl ? `<div style="margin:16px 0"><img src="${imageUrl}" alt="Billboard" style="max-width:100%;border-radius:12px;border:1px solid #ddd" /></div>` : '<p style="color:#888;font-style:italic">No image uploaded</p>'}
      <div style="margin:24px 0;display:flex;gap:12px">
        <a href="${approveUrl}" style="display:inline-block;padding:12px 32px;background:#22c55e;color:white;text-decoration:none;border-radius:8px;font-weight:600">Approve</a>
        <a href="${denyUrl}" style="display:inline-block;padding:12px 32px;background:#ef4444;color:white;text-decoration:none;border-radius:8px;font-weight:600">Deny &amp; Refund</a>
      </div>
      <p style="color:#aaa;font-size:11px">Platform fee is non-refundable. Deny refunds incentive only.</p>
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Sigil <onboarding@resend.dev>',
        to: adminEmail,
        subject: `Billboard review: ${date} — ${incentiveSol} SOL`,
        html,
      }),
    });
  } catch (err) {
    console.error('Failed to send moderation email:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const txSignature = formData.get('txSignature') as string;
    const epochDay = Number(formData.get('epochDay'));
    const incentiveLamports = Number(formData.get('incentiveLamports'));
    const linkUrl = (formData.get('linkUrl') as string) || null;
    const farcasterUsername = (formData.get('farcasterUsername') as string) || null;
    const imageFile = formData.get('image') as File | null;

    if (!txSignature || !epochDay) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Confirm the on-chain transaction
    const connection = getConnection();
    await pollConfirmation(connection, txSignature);

    // Parse the TX to extract claimer wallet
    const tx = await connection.getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0 });
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 400 });

    const claimerWallet = tx.transaction.message.accountKeys[0].pubkey.toString();

    const supabase = getServiceClient();
    let imageUrl: string | null = null;

    // Upload image to Supabase Storage if provided
    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
      const storagePath = `day-${epochDay}.${ext}`;
      const buffer = Buffer.from(await imageFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from('day-images')
        .upload(storagePath, buffer, {
          contentType: imageFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        imageUrl = `${baseUrl}/storage/v1/object/public/day-images/${storagePath}`;
      }
    }

    // Resolve Farcaster PFP if username provided
    let farcasterPfpUrl: string | null = null;
    let farcasterFid: number | null = null;
    if (farcasterUsername) {
      try {
        const neynarKey = process.env.NEYNAR_API_KEY;
        if (neynarKey) {
          const username = farcasterUsername.replace(/^@/, '');
          const res = await fetch(
            `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(username)}&limit=1`,
            { headers: { accept: 'application/json', api_key: neynarKey } }
          );
          const data = await res.json();
          const user = data?.result?.users?.[0];
          if (user) {
            farcasterPfpUrl = user.pfp_url || null;
            farcasterFid = user.fid || null;
          }
        }
      } catch {
        // Non-critical
      }
    }

    // Determine moderation status: images need review, no-image claims auto-approve
    const moderationStatus = imageUrl ? 'pending' : 'approved';

    // Store in Supabase
    const { error } = await supabase.from('day_claims').upsert(
      {
        epoch_day: epochDay,
        claimer_wallet: claimerWallet,
        link_url: linkUrl,
        image_url: imageUrl,
        incentive_lamports: incentiveLamports || 0,
        farcaster_username: farcasterUsername,
        farcaster_pfp_url: farcasterPfpUrl,
        farcaster_fid: farcasterFid,
        moderation_status: moderationStatus,
        claimed_at: new Date().toISOString(),
      },
      { onConflict: 'epoch_day' }
    );

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: `Failed to store claim: ${error.message}` }, { status: 500 });
    }

    // Send moderation email if pending review
    if (moderationStatus === 'pending') {
      const incentiveSol = (incentiveLamports / 1e9).toFixed(2);
      sendModerationEmail(epochDay, claimerWallet, imageUrl, linkUrl, incentiveSol, farcasterUsername);
    }

    return NextResponse.json({ success: true, epochDay, imageUrl, moderationStatus });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
