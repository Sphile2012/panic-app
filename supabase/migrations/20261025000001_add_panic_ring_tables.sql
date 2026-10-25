-- Notes table for private encrypted notes
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at DESC);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Safety plans table
CREATE TABLE IF NOT EXISTS safety_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  trusted_people TEXT,
  safe_places TEXT,
  emergency_numbers TEXT,
  important_documents TEXT,
  transport TEXT,
  things_to_remember TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS safety_plans_user_id_idx ON safety_plans(user_id);

-- Enable RLS
ALTER TABLE safety_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for safety_plans
CREATE POLICY "Users can view their own safety plan"
  ON safety_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own safety plan"
  ON safety_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own safety plan"
  ON safety_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own safety plan"
  ON safety_plans FOR DELETE
  USING (auth.uid() = user_id);

-- SOS alerts table
CREATE TABLE IF NOT EXISTS sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  shared_location BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sos_alerts_user_id_idx ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS sos_alerts_created_at_idx ON sos_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS sos_alerts_status_idx ON sos_alerts(status);

-- Enable RLS
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sos_alerts
CREATE POLICY "Users can view their own alerts"
  ON sos_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
  ON sos_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON sos_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Alert deliveries table
CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sending',
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alert_deliveries_alert_id_idx ON alert_deliveries(alert_id);
CREATE INDEX IF NOT EXISTS alert_deliveries_contact_id_idx ON alert_deliveries(contact_id);
CREATE INDEX IF NOT EXISTS alert_deliveries_status_idx ON alert_deliveries(status);

-- Enable RLS
ALTER TABLE alert_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_deliveries
CREATE POLICY "Users can view deliveries for their alerts"
  ON alert_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sos_alerts
      WHERE sos_alerts.id = alert_deliveries.alert_id
      AND sos_alerts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert deliveries for their alerts"
  ON alert_deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sos_alerts
      WHERE sos_alerts.id = alert_deliveries.alert_id
      AND sos_alerts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deliveries for their alerts"
  ON alert_deliveries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sos_alerts
      WHERE sos_alerts.id = alert_deliveries.alert_id
      AND sos_alerts.user_id = auth.uid()
    )
  );
