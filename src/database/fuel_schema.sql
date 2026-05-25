-- ================================================================
-- SMARTFUEL OS — FUEL MANAGEMENT EXTENDED SCHEMA
-- Run this in Supabase SQL Editor AFTER running schema.sql
-- ================================================================

-- 1. Fuel Refills Table (tracks every delivery)
CREATE TABLE IF NOT EXISTS fuel_refills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  tank_id UUID REFERENCES fuel_stock(id) ON DELETE SET NULL,
  fuel_type VARCHAR(50) NOT NULL,
  refill_amount DECIMAL(10, 2) NOT NULL,
  supplier_name VARCHAR(200),
  cost DECIMAL(12, 2),
  invoice_number VARCHAR(100),
  refill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fuel Activity Logs (audit trail for all fuel operations)
CREATE TABLE IF NOT EXISTS fuel_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,  -- 'refill', 'dispense', 'adjustment', 'alert'
  description TEXT,
  previous_value DECIMAL(12, 2),
  updated_value DECIMAL(12, 2),
  fuel_type VARCHAR(50),
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fuel_refills_branch ON fuel_refills(branch_id);
CREATE INDEX IF NOT EXISTS idx_fuel_refills_date ON fuel_refills(refill_date);
CREATE INDEX IF NOT EXISTS idx_fuel_activity_logs_branch ON fuel_activity_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_fuel_activity_logs_created ON fuel_activity_logs(created_at);

-- 4. RLS Policies
ALTER TABLE fuel_refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_activity_logs ENABLE ROW LEVEL SECURITY;

-- fuel_refills policies
DROP POLICY IF EXISTS "Auth users can view fuel_refills" ON fuel_refills;
DROP POLICY IF EXISTS "Auth users can insert fuel_refills" ON fuel_refills;
DROP POLICY IF EXISTS "Auth users can update fuel_refills" ON fuel_refills;

CREATE POLICY "Auth users can view fuel_refills"
  ON fuel_refills FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can insert fuel_refills"
  ON fuel_refills FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users can update fuel_refills"
  ON fuel_refills FOR UPDATE USING (auth.role() = 'authenticated');

-- fuel_activity_logs policies
DROP POLICY IF EXISTS "Auth users can view fuel_activity_logs" ON fuel_activity_logs;
DROP POLICY IF EXISTS "Auth users can insert fuel_activity_logs" ON fuel_activity_logs;

CREATE POLICY "Auth users can view fuel_activity_logs"
  ON fuel_activity_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can insert fuel_activity_logs"
  ON fuel_activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE fuel_refills;
ALTER PUBLICATION supabase_realtime ADD TABLE fuel_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE fuel_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE nozzles;
