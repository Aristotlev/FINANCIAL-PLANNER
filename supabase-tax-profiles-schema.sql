-- Tax Profiles Schema
-- This creates a table to store tax calculation profiles for users

-- Create tax_profiles table
CREATE TABLE IF NOT EXISTS public.tax_profiles (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  company_type TEXT NOT NULL,
  salary_income NUMERIC(15, 2) DEFAULT 0,
  business_income NUMERIC(15, 2) DEFAULT 0,
  capital_gains_short_term NUMERIC(15, 2) DEFAULT 0,
  capital_gains_long_term NUMERIC(15, 2) DEFAULT 0,
  dividends NUMERIC(15, 2) DEFAULT 0,
  rental_income NUMERIC(15, 2) DEFAULT 0,
  crypto_gains NUMERIC(15, 2) DEFAULT 0,
  deductible_expenses NUMERIC(15, 2) DEFAULT 0,
  custom_income_sources JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_tax_profiles_user_id ON public.tax_profiles(user_id);

-- Create index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_tax_profiles_is_active ON public.tax_profiles(is_active);

-- Create GIN index on custom_income_sources JSONB column for efficient queries
CREATE INDEX IF NOT EXISTS idx_tax_profiles_custom_income ON public.tax_profiles USING GIN (custom_income_sources);

-- Enable Row Level Security
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own tax profiles
CREATE POLICY "Users can view their own tax profiles"
ON public.tax_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own tax profiles
CREATE POLICY "Users can insert their own tax profiles"
ON public.tax_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tax profiles
CREATE POLICY "Users can update their own tax profiles"
ON public.tax_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tax profiles
CREATE POLICY "Users can delete their own tax profiles"
ON public.tax_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_tax_profiles_updated_at ON public.tax_profiles;
CREATE TRIGGER update_tax_profiles_updated_at
  BEFORE UPDATE ON public.tax_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.tax_profiles TO authenticated;
GRANT ALL ON public.tax_profiles TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.tax_profiles IS 'Stores tax calculation profiles for users with income sources and deductions';
COMMENT ON COLUMN public.tax_profiles.id IS 'Unique identifier for the tax profile';
COMMENT ON COLUMN public.tax_profiles.user_id IS 'Foreign key to auth.users - the owner of this tax profile';
COMMENT ON COLUMN public.tax_profiles.name IS 'User-defined name for the tax profile (e.g., "2024 Tax Profile")';
COMMENT ON COLUMN public.tax_profiles.country IS 'Country code for tax calculation (USA, UK, Canada, etc.)';
COMMENT ON COLUMN public.tax_profiles.company_type IS 'Type of company/employment (individual, sole_proprietor, llc, corporation, etc.)';
COMMENT ON COLUMN public.tax_profiles.salary_income IS 'Annual salary or wages income';
COMMENT ON COLUMN public.tax_profiles.business_income IS 'Annual business income';
COMMENT ON COLUMN public.tax_profiles.capital_gains_short_term IS 'Capital gains from assets held less than 1 year';
COMMENT ON COLUMN public.tax_profiles.capital_gains_long_term IS 'Capital gains from assets held 1 year or more';
COMMENT ON COLUMN public.tax_profiles.dividends IS 'Annual dividend income';
COMMENT ON COLUMN public.tax_profiles.rental_income IS 'Annual rental income';
COMMENT ON COLUMN public.tax_profiles.crypto_gains IS 'Cryptocurrency gains';
COMMENT ON COLUMN public.tax_profiles.deductible_expenses IS 'Total deductible business expenses';
COMMENT ON COLUMN public.tax_profiles.custom_income_sources IS 'JSONB array of custom income sources with id, label, amount, incomeType, taxTreatment, and notes';
COMMENT ON COLUMN public.tax_profiles.notes IS 'Optional notes about this tax profile';
COMMENT ON COLUMN public.tax_profiles.is_active IS 'Whether this is the currently active tax profile for the user';

