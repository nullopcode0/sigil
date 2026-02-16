import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { withCors, optionsResponse } from '@/lib/cors';
import { getConnection } from '@/lib/solana';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return optionsResponse();
}

async function checkNftEligibility(wallet: string, supabase: ReturnType<typeof getServiceClient>): Promise<boolean> {
  try {
    const publicKey = new PublicKey(wallet);
    const connection = getConnection();
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });
    const nftMints = tokenAccounts.value
      .filter((acc) => {
        const info = acc.account.data.parsed.info;
        return info.tokenAmount.uiAmount === 1 && info.tokenAmount.decimals === 0;
      })
      .map((acc) => acc.account.data.parsed.info.mint as string);

    if (nftMints.length === 0) return false;

    const { count } = await supabase
      .from('nft_mints')
      .select('*', { count: 'exact', head: true })
      .in('mint_address', nftMints);

    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  const epochDay = Number(request.nextUrl.searchParams.get('epochDay'));

  if (!wallet || !epochDay) {
    return withCors(NextResponse.json({ checkedIn: false, totalCheckedIn: 0, eligible: false }));
  }

  const supabase = getServiceClient();

  const [eligible, checkInResult, countResult] = await Promise.all([
    checkNftEligibility(wallet, supabase),
    supabase
      .from('check_ins')
      .select('weight')
      .eq('epoch_day', epochDay)
      .eq('wallet', wallet)
      .single(),
    supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('epoch_day', epochDay),
  ]);

  const totalCheckedIn = countResult.count ?? 0;

  if (checkInResult.data) {
    return withCors(
      NextResponse.json({
        checkedIn: true,
        weight: checkInResult.data.weight,
        totalCheckedIn,
        eligible,
      })
    );
  }

  return withCors(NextResponse.json({ checkedIn: false, totalCheckedIn, eligible }));
}
