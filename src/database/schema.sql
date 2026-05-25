-- SmartFuel OS Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist to avoid 'already exists' errors
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ai_logs CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS fuel_readings CASCADE;
DROP TABLE IF EXISTS nozzles CASCADE;
DROP TABLE IF EXISTS fuel_stock CASCADE;
DROP TABLE IF EXISTS salaries CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- 1. Branches Table
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location TEXT NOT NULL,
  contact_number VARCHAR(20),
  manager_id UUID, -- References employees later
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users Table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'owner', 'manager', 'accountant', 'employee', 'auditor')),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Employees Table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  designation VARCHAR(100),
  base_salary DECIMAL(10, 2) DEFAULT 0,
  joined_at DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for branch manager
ALTER TABLE branches ADD CONSTRAINT fk_manager FOREIGN KEY (manager_id) REFERENCES employees(id);

-- 4. Shifts Table
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Attendance Table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id),
  date DATE NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE,
  logout_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Leave Requests Table
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Salaries Table
CREATE TABLE salaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- Stored as YYYY-MM-01
  base_amount DECIMAL(10, 2) NOT NULL,
  overtime_amount DECIMAL(10, 2) DEFAULT 0,
  bonus DECIMAL(10, 2) DEFAULT 0,
  deductions DECIMAL(10, 2) DEFAULT 0,
  net_salary DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Fuel Stock Table (Tanks)
CREATE TABLE fuel_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'premium_petrol', 'cng', 'ev')),
  capacity DECIMAL(10, 2) NOT NULL,
  current_stock DECIMAL(10, 2) NOT NULL,
  min_alert_level DECIMAL(10, 2) NOT NULL,
  last_refill_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Nozzles Table
CREATE TABLE nozzles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  tank_id UUID REFERENCES fuel_stock(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Fuel Readings Table
CREATE TABLE fuel_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nozzle_id UUID REFERENCES nozzles(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id),
  employee_id UUID REFERENCES employees(id),
  reading_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opening_reading DECIMAL(12, 2) NOT NULL,
  closing_reading DECIMAL(12, 2) NOT NULL,
  total_dispensed DECIMAL(12, 2) GENERATED ALWAYS AS (closing_reading - opening_reading) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Sales Table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  nozzle_id UUID REFERENCES nozzles(id),
  employee_id UUID REFERENCES employees(id),
  fuel_type VARCHAR(50) NOT NULL,
  volume DECIMAL(10, 2) NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'upi', 'credit')),
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Expenses Table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Alerts Table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. AI Logs Table
CREATE TABLE ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id),
  insight_type VARCHAR(100) NOT NULL,
  insight_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Reports Table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  generated_by UUID REFERENCES users(id),
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Activity Logs Table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Settings Table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, key)
);

-- Disable RLS by default for a flawless client review and local preview
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE salaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE nozzles DISABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
-- More RLS policies can be found and loaded from rls_policies.sql when deploying to live production.

