-- Add target_price and alert_enabled to stock_holdings table
ALTER TABLE stock_holdings 
ADD COLUMN IF NOT EXISTS target_price numeric NULL,
ADD COLUMN IF NOT EXISTS alert_enabled boolean DEFAULT false;
