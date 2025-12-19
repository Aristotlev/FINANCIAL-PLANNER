-- Add wallet fields to crypto_holdings table

-- Add wallet columns
ALTER TABLE crypto_holdings 
ADD COLUMN IF NOT EXISTS wallet_type TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS wallet_name TEXT,
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Add check constraint for wallet types
ALTER TABLE crypto_holdings
ADD CONSTRAINT check_wallet_type 
CHECK (wallet_type IN ('metamask', 'trust_wallet', 'ledger', 'trezor', 'binance', 'coinbase', 'kraken', 'bybit', 'okx', 'kucoin', 'phantom', 'exodus', 'hardware', 'exchange', 'other'));

-- Create index for wallet queries
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_wallet_type 
  ON crypto_holdings(wallet_type);

CREATE INDEX IF NOT EXISTS idx_crypto_holdings_user_wallet 
  ON crypto_holdings(user_id, wallet_type);

-- Add comments for documentation
COMMENT ON COLUMN crypto_holdings.wallet_type IS 'Type of wallet: DeFi (metamask, trust_wallet, phantom, etc.) or CeFi (binance, coinbase, kraken, etc.)';
COMMENT ON COLUMN crypto_holdings.wallet_name IS 'Custom name for the wallet (e.g., "Main Wallet", "Trading Wallet")';
COMMENT ON COLUMN crypto_holdings.wallet_address IS 'Wallet address or identifier (optional)';

-- Update RLS policies if needed (they should still work with the new columns)
