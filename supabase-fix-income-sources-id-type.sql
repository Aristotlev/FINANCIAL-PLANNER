-- Fix Income Sources Table ID Type
-- The user_id column needs to be TEXT to support Better Auth IDs (which are strings, not UUIDs)

-- Drop the table if it exists (to recreate with correct schema)
DROP TABLE IF EXISTS income_sources;

-- Recreate income_sources table with user_id as TEXT
CREATE TABLE income_sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed from UUID to TEXT to support Better Auth IDs
  name TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'bi-weekly', 'monthly', 'yearly', 'one-time')),
  category TEXT NOT NULL CHECK (category IN ('salary', 'side-hustle', 'freelance', 'passive', 'bonus', 'other')),
  connected_account TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  next_payment_date DATE,
  notes TEXT,
  color TEXT NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_is_recurring ON income_sources(is_recurring);
CREATE INDEX IF NOT EXISTS idx_income_sources_category ON income_sources(category);

-- Enable Row Level Security
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Note: We cast auth.uid() to text to match the column type, although with Better Auth + Service Role, 
-- the RLS might be bypassed by the API route anyway. But good to have for direct access.
CREATE POLICY "Users can view their own income sources"
  ON income_sources FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own income sources"
  ON income_sources FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own income sources"
  ON income_sources FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own income sources"
  ON income_sources FOR DELETE
  USING (auth.uid()::text = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_income_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_income_sources_timestamp ON income_sources;
CREATE TRIGGER update_income_sources_timestamp
  BEFORE UPDATE ON income_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_income_sources_updated_at();
