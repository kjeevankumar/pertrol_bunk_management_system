-- ============================================================
-- SMARTFUEL OS — PRODUCTION HARDENING MIGRATION
-- ============================================================

-- 1. Performance Indexing
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_fuel_stock_type ON fuel_stock(fuel_type);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 2. Data Integrity Constraints (if not already present)
ALTER TABLE sales ADD CONSTRAINT positive_volume CHECK (volume > 0);
ALTER TABLE sales ADD CONSTRAINT positive_amount CHECK (total_amount > 0);
ALTER TABLE fuel_stock ADD CONSTRAINT non_negative_stock CHECK (current_stock >= 0);

-- 3. Security (Final RLS Audit)
-- Ensure all tables have RLS enabled
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- 4. Automation & Intelligence cleanup
-- Ensure default severity for insights
ALTER TABLE ai_insights ALTER COLUMN severity SET DEFAULT 'info';
ALTER TABLE fraud_alerts ALTER COLUMN risk_level SET DEFAULT 'medium';
ALTER TABLE fraud_alerts ALTER COLUMN status SET DEFAULT 'pending';

-- 5. Trigger for updated_at (Standardization)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public') LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_ %I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t, t);
    END LOOP;
END $$;
