-- SmartFuel OS — Notification, Alert & Automation Schema
-- Run in Supabase SQL Editor

-- 1. Alert Rules Table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  trigger_condition JSONB NOT NULL, -- e.g. { "type": "fuel_threshold", "value": 20 }
  severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default rules
INSERT INTO alert_rules (rule_name, trigger_condition, severity) VALUES
  ('Critical Fuel Level', '{"type": "fuel_threshold", "percent": 15}', 'critical'),
  ('Daily Sales Drop', '{"type": "sales_drop", "percent": 20}', 'high'),
  ('Excessive Overtime', '{"type": "ot_threshold", "hours": 4}', 'medium'),
  ('Suspicious Fuel Variance', '{"type": "fuel_variance", "threshold": 0.5}', 'high')
ON CONFLICT DO NOTHING;

-- 2. Enhanced Notifications Table (Updating existing one if needed)
-- We'll assume the one in schema.sql is basic, so we add columns or create a new one.
-- Let's add columns to the existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity VARCHAR(50) DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_module VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. Automation Logs Table
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  automation_type VARCHAR(100) NOT NULL, -- 'daily_summary', 'refill_order', 'threshold_alert'
  action_performed TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'success',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Auth access alert_rules" ON alert_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth access automation_logs" ON automation_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE automation_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_rules;
