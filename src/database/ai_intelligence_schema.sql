-- SmartFuel OS — AI Intelligence & Fraud Detection Schema
-- Run in Supabase SQL Editor

-- 1. AI Insights Table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  insight_type VARCHAR(100) NOT NULL, -- 'sales', 'fuel', 'operational', 'financial'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  metadata JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AI Predictions Table
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  prediction_type VARCHAR(100) NOT NULL, -- 'fuel_demand', 'low_stock', 'sales_forecast', 'profit_trend'
  prediction_value JSONB NOT NULL,
  confidence_score DECIMAL(5, 2) DEFAULT 0,
  target_date DATE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fraud Alerts Table
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  fraud_type VARCHAR(100) NOT NULL, -- 'fuel_loss', 'sales_manipulation', 'attendance_fraud', 'expense_anomaly'
  risk_level VARCHAR(50) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  evidence JSONB,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_investigation', 'resolved', 'false_positive')),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 4. AI Activity Logs
CREATE TABLE IF NOT EXISTS ai_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL, -- 'chat_query', 'insight_generated', 'prediction_updated', 'fraud_detected'
  description TEXT NOT NULL,
  generated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Auth access ai_insights" ON ai_insights FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth access ai_predictions" ON ai_predictions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth access fraud_alerts" ON fraud_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth access ai_activity_logs" ON ai_activity_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE fraud_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_activity_logs;
