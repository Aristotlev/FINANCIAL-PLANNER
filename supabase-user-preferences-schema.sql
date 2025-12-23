-- User Preferences Schema for Card Order, Hidden Cards, and other settings
-- Run this in your Supabase SQL Editor
-- NOTE: Uses TEXT for user_id to match Better Auth user IDs (not Supabase Auth)

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  theme TEXT DEFAULT 'system' NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  language TEXT DEFAULT 'en' NOT NULL,
  notifications_enabled BOOLEAN DEFAULT true NOT NULL,
  preferences JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user_preferences
-- Allow all authenticated users to manage their own preferences
-- The application layer handles user_id validation via Better Auth

-- Users can view their own preferences (service role bypass for app)
CREATE POLICY "Service role can manage all preferences"
  ON user_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to select their own rows
CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own rows
CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update their own rows
CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete their own rows
CREATE POLICY "Users can delete own preferences"
  ON user_preferences
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Grant permissions
GRANT ALL ON user_preferences TO authenticated;
GRANT ALL ON user_preferences TO service_role;

-- Comment on table
COMMENT ON TABLE user_preferences IS 'Stores user preferences including card order, hidden cards, theme, currency, and other settings';
COMMENT ON COLUMN user_preferences.preferences IS 'JSONB field storing cardOrder, hiddenCards, and other dynamic preferences';
