/**
 * Create the Sigil collection NFT on devnet.
 * Run: npx tsx --skip-project scripts/create-collection.ts
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, keypairIdentity, percentAmount } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const keypairStr = process.env.SOLANA_KEYPAIR;
  if (!keypairStr) throw new Error('Set SOLANA_KEYPAIR env var');

  const solanaKeypair = Keypair.fromSecretKey(bs58.decode(keypairStr));
  console.log('Authority:', solanaKeypair.publicKey.toString());

  const umi = createUmi(rpc)
    .use(mplTokenMetadata())
    .use(irysUploader());

  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(solanaKeypair.secretKey);
  umi.use(keypairIdentity(umiKeypair));

  // Upload collection metadata
  const metadata = {
    name: 'Sigil Collection',
    symbol: 'SIGIL',
    description: 'A living NFT collection. 1000 editions that update daily.',
    image: '', // Will be set after image upload
    external_url: 'https://sigil.bond',
  };

  // Check if there's a logo to upload
  const logoPath = path.join(__dirname, '..', 'public', 'sigil-logo.png');
  if (fs.existsSync(logoPath)) {
    console.log('Uploading logo...');
    const logoBuffer = fs.readFileSync(logoPath);
    const [imageUri] = await umi.uploader.upload([
      {
        buffer: logoBuffer,
        fileName: 'sigil-logo.png',
        displayName: 'Sigil Logo',
        uniqueName: 'sigil-logo',
        contentType: 'image/png',
        extension: 'png',
        tags: [],
      } as any,
    ]);
    metadata.image = imageUri;
    console.log('Logo URI:', imageUri);
  } else {
    console.log('No logo found at public/sigil-logo.png, using placeholder');
    metadata.image = 'https://arweave.net/placeholder';
  }

  const metadataUri = await umi.uploader.uploadJson(metadata);
  console.log('Metadata URI:', metadataUri);

  // Create collection NFT
  const collectionMint = generateSigner(umi);
  console.log('Collection mint:', collectionMint.publicKey.toString());

  const { signature } = await createNft(umi, {
    mint: collectionMint,
    name: 'Sigil Collection',
    symbol: 'SIGIL',
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  }).sendAndConfirm(umi);

  console.log('\n=== Collection Created ===');
  console.log('Collection Mint:', collectionMint.publicKey.toString());
  console.log('Signature:', bs58.encode(signature));
  console.log('\nAdd to .env.local:');
  console.log(`NEXT_PUBLIC_COLLECTION_MINT=${collectionMint.publicKey.toString()}`);
}

main().catch(console.error);
