-- Add target_amount column to cash_accounts table
ALTER TABLE cash_accounts 
ADD COLUMN IF NOT EXISTS target_amount numeric DEFAULT NULL;

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload config';
