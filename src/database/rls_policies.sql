-- ============================================================
-- SMARTFUEL OS — RLS POLICIES FIX
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- -----------------------------------------------
-- EMPLOYEES TABLE
-- -----------------------------------------------
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to insert employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to update employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to delete employees" ON employees;

CREATE POLICY "Allow authenticated users to view employees"
  ON employees FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert employees"
  ON employees FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update employees"
  ON employees FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete employees"
  ON employees FOR DELETE
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------
-- BRANCHES TABLE
-- -----------------------------------------------
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view branches" ON branches;
DROP POLICY IF EXISTS "Allow authenticated users to insert branches" ON branches;
DROP POLICY IF EXISTS "Allow authenticated users to update branches" ON branches;

CREATE POLICY "Allow authenticated users to view branches"
  ON branches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert branches"
  ON branches FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update branches"
  ON branches FOR UPDATE
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------
-- ATTENDANCE TABLE
-- -----------------------------------------------
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view attendance" ON attendance;
DROP POLICY IF EXISTS "Allow authenticated users to insert attendance" ON attendance;
DROP POLICY IF EXISTS "Allow authenticated users to update attendance" ON attendance;
DROP POLICY IF EXISTS "Allow authenticated users to delete attendance" ON attendance;

CREATE POLICY "Allow authenticated users to view attendance"
  ON attendance FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert attendance"
  ON attendance FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update attendance"
  ON attendance FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete attendance"
  ON attendance FOR DELETE
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------
-- ACTIVITY LOGS TABLE
-- -----------------------------------------------
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert activity_logs" ON activity_logs;

CREATE POLICY "Allow authenticated users to view activity_logs"
  ON activity_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert activity_logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- -----------------------------------------------
-- FUEL STOCK TABLE
-- -----------------------------------------------
ALTER TABLE fuel_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view fuel_stock" ON fuel_stock;
DROP POLICY IF EXISTS "Allow authenticated users to insert fuel_stock" ON fuel_stock;
DROP POLICY IF EXISTS "Allow authenticated users to update fuel_stock" ON fuel_stock;

CREATE POLICY "Allow authenticated users to view fuel_stock"
  ON fuel_stock FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert fuel_stock"
  ON fuel_stock FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update fuel_stock"
  ON fuel_stock FOR UPDATE
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------
-- SALES TABLE
-- -----------------------------------------------
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view sales" ON sales;
DROP POLICY IF EXISTS "Allow authenticated users to insert sales" ON sales;

CREATE POLICY "Allow authenticated users to view sales"
  ON sales FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert sales"
  ON sales FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- -----------------------------------------------
-- EXPENSES TABLE
-- -----------------------------------------------
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to insert expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to update expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to delete expenses" ON expenses;

CREATE POLICY "Allow authenticated users to view expenses"
  ON expenses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update expenses"
  ON expenses FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete expenses"
  ON expenses FOR DELETE
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------
-- ALERTS TABLE
-- -----------------------------------------------
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view alerts" ON alerts;
DROP POLICY IF EXISTS "Allow authenticated users to insert alerts" ON alerts;
DROP POLICY IF EXISTS "Allow authenticated users to update alerts" ON alerts;

CREATE POLICY "Allow authenticated users to view alerts"
  ON alerts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert alerts"
  ON alerts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update alerts"
  ON alerts FOR UPDATE
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------
-- SALARIES TABLE
-- -----------------------------------------------
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view salaries" ON salaries;
DROP POLICY IF EXISTS "Allow authenticated users to insert salaries" ON salaries;
DROP POLICY IF EXISTS "Allow authenticated users to update salaries" ON salaries;

CREATE POLICY "Allow authenticated users to view salaries"
  ON salaries FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert salaries"
  ON salaries FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update salaries"
  ON salaries FOR UPDATE
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------
-- FUEL READINGS TABLE
-- -----------------------------------------------
ALTER TABLE fuel_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view fuel_readings" ON fuel_readings;
DROP POLICY IF EXISTS "Allow authenticated users to insert fuel_readings" ON fuel_readings;

CREATE POLICY "Allow authenticated users to view fuel_readings"
  ON fuel_readings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert fuel_readings"
  ON fuel_readings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- -----------------------------------------------
-- USERS TABLE
-- -----------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to view own profile" ON users;
DROP POLICY IF EXISTS "Allow service role full access to users" ON users;

CREATE POLICY "Allow users to view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to users"
  ON users FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------
-- INTELLIGENCE & AUTOMATION TABLES
-- -----------------------------------------------

-- AI Insights
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view ai_insights" ON ai_insights FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert ai_insights" ON ai_insights FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Fraud Alerts
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view fraud_alerts" ON fraud_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert fraud_alerts" ON fraud_alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update fraud_alerts" ON fraud_alerts FOR UPDATE USING (auth.role() = 'authenticated');

-- AI Predictions
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view ai_predictions" ON ai_predictions FOR SELECT USING (auth.role() = 'authenticated');

-- Alert Rules
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view alert_rules" ON alert_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update alert_rules" ON alert_rules FOR UPDATE USING (auth.role() = 'authenticated');

-- Automation Logs
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view automation_logs" ON automation_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view notifications" ON notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update notifications" ON notifications FOR UPDATE USING (auth.role() = 'authenticated');

-- -----------------------------------------------
-- FINANCIAL & LOGGING TABLES
-- -----------------------------------------------

-- Daily Closing
ALTER TABLE daily_closing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view daily_closing" ON daily_closing FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert daily_closing" ON daily_closing FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Fuel Refills
ALTER TABLE fuel_refills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view fuel_refills" ON fuel_refills FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert fuel_refills" ON fuel_refills FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Fuel Activity Logs
ALTER TABLE fuel_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view fuel_activity_logs" ON fuel_activity_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert fuel_activity_logs" ON fuel_activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
