-- Add target_price and alert_enabled to crypto_holdings table
ALTER TABLE crypto_holdings 
ADD COLUMN IF NOT EXISTS target_price numeric NULL,
ADD COLUMN IF NOT EXISTS alert_enabled boolean DEFAULT false;
