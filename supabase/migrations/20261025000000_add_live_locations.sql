-- Create live_locations table for mobile app live tracking
CREATE TABLE IF NOT EXISTS live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_live_location UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert/update their own live location
CREATE POLICY "Users can manage their own live location"
  ON live_locations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Trusted contacts can view live location
CREATE POLICY "Trusted contacts can view live location"
  ON live_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.user_id = live_locations.user_id
      AND contacts.trusted = true
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_live_locations_user_id ON live_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_updated_at ON live_locations(updated_at DESC);

-- Create contacts table if it doesn't exist (for trusted contacts)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'accepted',
  trusted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own contacts
CREATE POLICY "Users can manage their own contacts"
  ON contacts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_trusted ON contacts(user_id, trusted) WHERE trusted = true;
