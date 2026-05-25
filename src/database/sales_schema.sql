-- ================================================================
-- SMARTFUEL OS — SALES EXTENDED SCHEMA
-- Run in Supabase SQL Editor AFTER schema.sql
-- ================================================================

CREATE TABLE IF NOT EXISTS daily_closing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance DECIMAL(12, 2) DEFAULT 0,
  closing_balance DECIMAL(12, 2) DEFAULT 0,
  total_sales DECIMAL(12, 2) DEFAULT 0,
  total_cash DECIMAL(12, 2) DEFAULT 0,
  total_upi DECIMAL(12, 2) DEFAULT 0,
  total_card DECIMAL(12, 2) DEFAULT 0,
  total_credit DECIMAL(12, 2) DEFAULT 0,
  expected_cash DECIMAL(12, 2) DEFAULT 0,
  actual_cash DECIMAL(12, 2) DEFAULT 0,
  variance DECIMAL(12, 2) DEFAULT 0,
  total_expenses DECIMAL(12, 2) DEFAULT 0,
  profit DECIMAL(12, 2) DEFAULT 0,
  ai_summary TEXT,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_closing_date ON daily_closing(closing_date);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_fuel_type ON sales(fuel_type);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

ALTER TABLE daily_closing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users view daily_closing" ON daily_closing FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users insert daily_closing" ON daily_closing FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users update daily_closing" ON daily_closing FOR UPDATE USING (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE daily_closing;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
