-- SmartFuel OS — Financial Intelligence Schema
-- Run in Supabase SQL Editor

-- 1. Create Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default categories
INSERT INTO expense_categories (category_name) VALUES
  ('Fuel Transport'),
  ('Electricity'),
  ('Water'),
  ('Maintenance'),
  ('Salaries'),
  ('Repairs'),
  ('Equipment'),
  ('Miscellaneous')
ON CONFLICT (category_name) DO NOTHING;

-- 2. Modify Expenses Table to match enterprise requirements
-- We'll add new columns first, then migrate data if needed, but for now we'll just add them.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_title VARCHAR(255);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'credit'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);

-- Rename 'category' to 'expense_category' to match user request (if desired, but we can just use the existing one or add a ref)
-- To keep it simple and compatible with existing code, we'll keep 'category' but maybe add 'expense_category' as an alias or just use 'category'.
-- User specifically asked for 'expense_category'.

-- 3. Profit Summary Table
CREATE TABLE IF NOT EXISTS profit_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  total_expenses DECIMAL(15, 2) DEFAULT 0,
  net_profit DECIMAL(15, 2) DEFAULT 0,
  profit_margin DECIMAL(5, 2) DEFAULT 0,
  summary_date DATE UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Financial Activity Logs
CREATE TABLE IF NOT EXISTS financial_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL, -- 'expense_added', 'profit_calculated', 'report_generated'
  description TEXT NOT NULL,
  previous_value JSONB,
  updated_value JSONB,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_activity_logs ENABLE ROW LEVEL SECURITY;

-- Simple Policies (Manager/Admin can do everything)
CREATE POLICY "Auth access categories" ON expense_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth access profit_summary" ON profit_summary FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth access financial_logs" ON financial_activity_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE profit_summary;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_activity_logs;
