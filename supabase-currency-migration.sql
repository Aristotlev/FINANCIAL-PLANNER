-- =====================================================
-- Multi-Currency System Database Migration
-- =====================================================
-- This script adds currency support to all financial tables
-- Run this in your Supabase SQL editor or database client
-- =====================================================

-- Cash Accounts
-- -----------------------------------------------------
ALTER TABLE cash_accounts 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE cash_accounts 
  ADD CONSTRAINT IF NOT EXISTS valid_currency_cash 
  CHECK (currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_cash_accounts_currency 
  ON cash_accounts(currency);

COMMENT ON COLUMN cash_accounts.currency IS 'ISO 4217 currency code (e.g., USD, EUR, GBP)';


-- Savings Accounts
-- -----------------------------------------------------
ALTER TABLE savings_accounts 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE savings_accounts 
  ADD CONSTRAINT IF NOT EXISTS valid_currency_savings 
  CHECK (currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_savings_accounts_currency 
  ON savings_accounts(currency);

COMMENT ON COLUMN savings_accounts.currency IS 'ISO 4217 currency code (e.g., USD, EUR, GBP)';


-- Trading Accounts
-- -----------------------------------------------------
ALTER TABLE trading_accounts 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE trading_accounts 
  ADD CONSTRAINT IF NOT EXISTS valid_currency_trading 
  CHECK (currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_trading_accounts_currency 
  ON trading_accounts(currency);

COMMENT ON COLUMN trading_accounts.currency IS 'ISO 4217 currency code (e.g., USD, EUR, GBP)';


-- Real Estate
-- -----------------------------------------------------
ALTER TABLE real_estate 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE real_estate 
  ADD CONSTRAINT IF NOT EXISTS valid_currency_realestate 
  CHECK (currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_real_estate_currency 
  ON real_estate(currency);

COMMENT ON COLUMN real_estate.currency IS 'ISO 4217 currency code (e.g., USD, EUR, GBP)';


-- Valuable Items
-- -----------------------------------------------------
ALTER TABLE valuable_items 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE valuable_items 
  ADD CONSTRAINT IF NOT EXISTS valid_currency_valuable 
  CHECK (currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_valuable_items_currency 
  ON valuable_items(currency);

COMMENT ON COLUMN valuable_items.currency IS 'ISO 4217 currency code (e.g., USD, EUR, GBP)';


-- Stock Holdings (if not using external API prices)
-- -----------------------------------------------------
-- Note: Stock prices are usually fetched from APIs in USD
-- This is for manual entries or custom stocks
ALTER TABLE stock_holdings 
  ADD COLUMN IF NOT EXISTS price_currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE stock_holdings 
  ADD CONSTRAINT IF NOT EXISTS valid_currency_stocks 
  CHECK (price_currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_stock_holdings_currency 
  ON stock_holdings(price_currency);

COMMENT ON COLUMN stock_holdings.price_currency IS 'Currency of the share price';


-- Crypto Holdings (if not using external API prices)
-- -----------------------------------------------------
-- Note: Crypto prices are usually fetched from APIs in USD
-- This is for manual entries or custom coins
ALTER TABLE crypto_holdings 
  ADD COLUMN IF NOT EXISTS price_currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE crypto_holdings 
  ADD CONSTRAINT IF NOT EXISTS valid_currency_crypto 
  CHECK (price_currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_crypto_holdings_currency 
  ON crypto_holdings(price_currency);

COMMENT ON COLUMN crypto_holdings.price_currency IS 'Currency of the crypto price';


-- Expense Categories
-- -----------------------------------------------------
ALTER TABLE expense_categories 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE expense_categories 
  ADD CONSTRAINT IF NOT EXISTS valid_currency_expenses 
  CHECK (currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_expense_categories_currency 
  ON expense_categories(currency);

COMMENT ON COLUMN expense_categories.currency IS 'Currency of the expense amounts';


-- Income Sources
-- -----------------------------------------------------
ALTER TABLE income_sources 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE income_sources 
  ADD CONSTRAINT IF NOT EXISTS valid_currency_income 
  CHECK (currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS idx_income_sources_currency 
  ON income_sources(currency);

COMMENT ON COLUMN income_sources.currency IS 'Currency of the income amounts';


-- Tax Profiles
-- -----------------------------------------------------
-- Tax profiles already have country-specific currencies
-- Add a display currency field for converting calculations
ALTER TABLE tax_profiles 
  ADD COLUMN IF NOT EXISTS display_currency VARCHAR(3) DEFAULT NULL;

ALTER TABLE tax_profiles 
  ADD CONSTRAINT IF NOT EXISTS valid_display_currency 
  CHECK (display_currency IS NULL OR display_currency ~ '^[A-Z]{3}$');

COMMENT ON COLUMN tax_profiles.display_currency IS 'Optional: Override currency for displaying tax calculations';


-- =====================================================
-- Supported Currencies Reference Table (Optional)
-- =====================================================
-- Create a reference table for all supported currencies
-- This is optional but useful for validation and dropdowns

CREATE TABLE IF NOT EXISTS supported_currencies (
  code VARCHAR(3) PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  flag VARCHAR(10) NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE supported_currencies IS 'Reference table for all supported currencies';

-- Insert supported currencies
INSERT INTO supported_currencies (code, symbol, name, flag, decimal_places) VALUES
  ('USD', '$', 'US Dollar', '🇺🇸', 2),
  ('EUR', '€', 'Euro', '🇪🇺', 2),
  ('GBP', '£', 'British Pound', '🇬🇧', 2),
  ('JPY', '¥', 'Japanese Yen', '🇯🇵', 0),
  ('CHF', 'CHF', 'Swiss Franc', '🇨🇭', 2),
  ('CAD', 'C$', 'Canadian Dollar', '🇨🇦', 2),
  ('AUD', 'A$', 'Australian Dollar', '🇦🇺', 2),
  ('CNY', '¥', 'Chinese Yuan', '🇨🇳', 2),
  ('INR', '₹', 'Indian Rupee', '🇮🇳', 2),
  ('BRL', 'R$', 'Brazilian Real', '🇧🇷', 2),
  ('MXN', 'MX$', 'Mexican Peso', '🇲🇽', 2),
  ('ZAR', 'R', 'South African Rand', '🇿🇦', 2),
  ('SGD', 'S$', 'Singapore Dollar', '🇸🇬', 2),
  ('HKD', 'HK$', 'Hong Kong Dollar', '🇭🇰', 2),
  ('SEK', 'kr', 'Swedish Krona', '🇸🇪', 2),
  ('NOK', 'kr', 'Norwegian Krone', '🇳🇴', 2),
  ('DKK', 'kr', 'Danish Krone', '🇩🇰', 2),
  ('NZD', 'NZ$', 'New Zealand Dollar', '🇳🇿', 2),
  ('KRW', '₩', 'South Korean Won', '🇰🇷', 0),
  ('TRY', '₺', 'Turkish Lira', '🇹🇷', 2),
  ('RUB', '₽', 'Russian Ruble', '🇷🇺', 2),
  ('PLN', 'zł', 'Polish Zloty', '🇵🇱', 2),
  ('THB', '฿', 'Thai Baht', '🇹🇭', 2),
  ('IDR', 'Rp', 'Indonesian Rupiah', '🇮🇩', 0),
  ('MYR', 'RM', 'Malaysian Ringgit', '🇲🇾', 2),
  ('PHP', '₱', 'Philippine Peso', '🇵🇭', 2),
  ('CZK', 'Kč', 'Czech Koruna', '🇨🇿', 2),
  ('ILS', '₪', 'Israeli Shekel', '🇮🇱', 2),
  ('AED', 'د.إ', 'UAE Dirham', '🇦🇪', 2),
  ('SAR', '﷼', 'Saudi Riyal', '🇸🇦', 2)
ON CONFLICT (code) DO NOTHING;


-- =====================================================
-- Exchange Rates History Table (Optional)
-- =====================================================
-- Store historical exchange rates for analytics and tracking
-- This is optional but useful for trend analysis

CREATE TABLE IF NOT EXISTS exchange_rates_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  target_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(20, 8) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_rate_per_day UNIQUE (base_currency, target_currency, date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
  ON exchange_rates_history(date DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies 
  ON exchange_rates_history(base_currency, target_currency);

COMMENT ON TABLE exchange_rates_history IS 'Historical exchange rates for analytics';


-- =====================================================
-- User Currency Preferences Table (Optional)
-- =====================================================
-- Store user's currency preferences
-- This is optional as preferences are stored in localStorage

CREATE TABLE IF NOT EXISTS user_currency_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  main_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  secondary_currencies VARCHAR(3)[] DEFAULT ARRAY['EUR', 'GBP'],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_main_currency CHECK (main_currency ~ '^[A-Z]{3}$')
);

COMMENT ON TABLE user_currency_preferences IS 'User currency preferences (optional backup to localStorage)';


-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
-- Enable RLS on new tables if using multi-tenant setup

ALTER TABLE supported_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_currency_preferences ENABLE ROW LEVEL SECURITY;

-- Public read access for supported currencies
CREATE POLICY "Anyone can view supported currencies"
  ON supported_currencies FOR SELECT
  USING (true);

-- Users can view exchange rate history
CREATE POLICY "Anyone can view exchange rates"
  ON exchange_rates_history FOR SELECT
  USING (true);

-- Users can manage their own currency preferences
CREATE POLICY "Users can manage own currency preferences"
  ON user_currency_preferences
  USING (auth.uid() = user_id);


-- =====================================================
-- Helper Functions (Optional)
-- =====================================================

-- Function to get the latest exchange rate
CREATE OR REPLACE FUNCTION get_latest_exchange_rate(
  p_base_currency VARCHAR(3),
  p_target_currency VARCHAR(3)
)
RETURNS DECIMAL(20, 8) AS $$
BEGIN
  RETURN (
    SELECT rate
    FROM exchange_rates_history
    WHERE base_currency = p_base_currency
      AND target_currency = p_target_currency
    ORDER BY date DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_latest_exchange_rate IS 'Get the most recent exchange rate between two currencies';


-- Function to convert amount between currencies
CREATE OR REPLACE FUNCTION convert_currency(
  p_amount DECIMAL(20, 2),
  p_from_currency VARCHAR(3),
  p_to_currency VARCHAR(3)
)
RETURNS DECIMAL(20, 2) AS $$
DECLARE
  v_rate DECIMAL(20, 8);
BEGIN
  IF p_from_currency = p_to_currency THEN
    RETURN p_amount;
  END IF;
  
  v_rate := get_latest_exchange_rate(p_from_currency, p_to_currency);
  
  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'Exchange rate not found for % to %', p_from_currency, p_to_currency;
  END IF;
  
  RETURN p_amount * v_rate;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION convert_currency IS 'Convert amount from one currency to another using latest exchange rate';


-- =====================================================
-- Migration Complete!
-- =====================================================
-- You can now:
-- 1. Store currency information with all financial data
-- 2. Query and filter by currency
-- 3. Use the reference tables for validation
-- 4. Track exchange rate history (optional)
-- 5. Store user preferences (optional)
-- =====================================================

-- Verify the migration
SELECT 
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE column_name = 'currency'
  AND table_schema = 'public'
ORDER BY table_name;
