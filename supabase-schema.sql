-- Sigil Supabase Schema
-- Run this in the Supabase SQL editor

-- Day claims table
CREATE TABLE IF NOT EXISTS day_claims (
  epoch_day INTEGER PRIMARY KEY,
  claimer_wallet TEXT NOT NULL,
  link_url TEXT NOT NULL,
  farcaster_username TEXT,
  farcaster_pfp_url TEXT,
  farcaster_fid INTEGER,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Click tracking table
CREATE TABLE IF NOT EXISTS clicks (
  id BIGSERIAL PRIMARY KEY,
  epoch_day INTEGER NOT NULL REFERENCES day_claims(epoch_day),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT NOT NULL
);

-- NFT mints table
CREATE TABLE IF NOT EXISTS nft_mints (
  mint_address TEXT PRIMARY KEY,
  owner_wallet TEXT NOT NULL,
  token_id INTEGER NOT NULL UNIQUE,
  minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clicks_epoch_day ON clicks(epoch_day);
CREATE INDEX IF NOT EXISTS idx_day_claims_wallet ON day_claims(claimer_wallet);
CREATE INDEX IF NOT EXISTS idx_nft_mints_owner ON nft_mints(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_nft_mints_token_id ON nft_mints(token_id);

-- Enable RLS
ALTER TABLE day_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_mints ENABLE ROW LEVEL SECURITY;

-- Read-only policies for anon key (public reads)
CREATE POLICY "Public read day_claims" ON day_claims FOR SELECT USING (true);
CREATE POLICY "Public read clicks count" ON clicks FOR SELECT USING (true);
CREATE POLICY "Public read nft_mints" ON nft_mints FOR SELECT USING (true);

-- Service key can do everything (writes come from server API routes)
