-- ================================================================
-- SMARTFUEL OS — ENTERPRISE SECURITY SCHEMA
-- Run in Supabase SQL Editor
-- ================================================================

-- 1. Audit Logs — immutable record of every system action
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL,   -- 'login', 'logout', 'create', 'update', 'delete', 'export', 'ai_query'
  module_name VARCHAR(100),            -- 'employees', 'sales', 'fuel', 'payroll', etc.
  description TEXT NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  performed_by_email VARCHAR(255),
  previous_data JSONB,
  updated_data JSONB,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Failed Login Attempts — brute-force detection
CREATE TABLE IF NOT EXISTS failed_logins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason VARCHAR(255)
);

-- 3. Security Alerts — intelligent security event tracking
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  alert_type VARCHAR(100) NOT NULL,    -- 'failed_login', 'suspicious_activity', 'unauthorized_access', 'anomaly'
  severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  performed_by_email VARCHAR(255),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_failed_logins_email ON failed_logins(email);
CREATE INDEX IF NOT EXISTS idx_failed_logins_time ON failed_logins(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at DESC);

-- 5. RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- audit_logs: readable by authenticated, insertable by authenticated
DROP POLICY IF EXISTS "Auth select audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Auth insert audit_logs" ON audit_logs;
CREATE POLICY "Auth select audit_logs" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert audit_logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Audit logs are IMMUTABLE — no update/delete policy

-- failed_logins: service role only for writes, auth for reads
DROP POLICY IF EXISTS "Auth select failed_logins" ON failed_logins;
DROP POLICY IF EXISTS "Service insert failed_logins" ON failed_logins;
CREATE POLICY "Auth select failed_logins" ON failed_logins FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service insert failed_logins" ON failed_logins FOR INSERT WITH CHECK (true); -- Allow from anon for pre-auth logging

-- security_alerts: full CRUD for authenticated
DROP POLICY IF EXISTS "Auth select security_alerts" ON security_alerts;
DROP POLICY IF EXISTS "Auth insert security_alerts" ON security_alerts;
DROP POLICY IF EXISTS "Auth update security_alerts" ON security_alerts;
CREATE POLICY "Auth select security_alerts" ON security_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert security_alerts" ON security_alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update security_alerts" ON security_alerts FOR UPDATE USING (auth.role() = 'authenticated');

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE security_alerts;

-- 7. Seed initial security alerts
INSERT INTO security_alerts (alert_type, severity, title, description, is_resolved)
VALUES
  ('failed_login', 'medium', 'Multiple Failed Login Attempts', '3 failed login attempts detected from unknown IP in the last hour.', false),
  ('anomaly', 'high', 'Unusual Fuel Stock Reduction', 'Premium petrol stock dropped 8% without matching sales records. Possible measurement error.', false)
ON CONFLICT DO NOTHING;
