-- SmartFuel OS — Complete Seed Data (Run in Supabase SQL Editor)
-- Includes 30 days of historical sales for realistic charts

-- 1. Branch
INSERT INTO branches (id, name, location, contact_number)
VALUES ('b1111111-1111-1111-1111-111111111111', 'SmartFuel Main Hub', 'Downtown Station, Mumbai', '+91 9876543210')
ON CONFLICT (id) DO NOTHING;

-- 2. Employees
INSERT INTO employees (id, branch_id, first_name, last_name, designation, base_salary, joined_at)
VALUES 
  ('e1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Rajesh', 'Kumar', 'Station Manager', 45000, '2023-01-15'),
  ('e2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'Amit', 'Singh', 'Cashier', 25000, '2023-03-10'),
  ('e3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'Priya', 'Sharma', 'Pump Attendant', 18000, '2023-06-01'),
  ('e4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', 'Vikram', 'Das', 'Pump Attendant', 18000, '2023-06-15'),
  ('e5555555-5555-5555-5555-555555555555', 'b1111111-1111-1111-1111-111111111111', 'Sunita', 'Rao', 'Security', 15000, '2024-01-10')
ON CONFLICT (id) DO NOTHING;

UPDATE branches SET manager_id = 'e1111111-1111-1111-1111-111111111111' WHERE id = 'b1111111-1111-1111-1111-111111111111';

-- 3. Fuel Stock (Tanks)
INSERT INTO fuel_stock (id, branch_id, fuel_type, capacity, current_stock, min_alert_level)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'petrol', 20000, 16500, 3000),
  ('f2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'diesel', 20000, 12000, 3000),
  ('f3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'premium_petrol', 10000, 1500, 2000),
  ('f4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', 'cng', 5000, 4200, 1000)
ON CONFLICT (id) DO NOTHING;

-- 4. Alerts
INSERT INTO alerts (branch_id, type, message, severity, is_resolved)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Stock Alert', 'Premium petrol tank critical (15%). Immediate refill required.', 'high', false),
  ('b1111111-1111-1111-1111-111111111111', 'Maintenance', 'Nozzle 4 maintenance due in 2 days.', 'medium', false),
  ('b1111111-1111-1111-1111-111111111111', 'Revenue', 'Night shift revenue 23% below monthly average.', 'low', false)
ON CONFLICT DO NOTHING;

-- 5. Today's Attendance
INSERT INTO attendance (employee_id, date, status, login_time)
VALUES
  ('e1111111-1111-1111-1111-111111111111', CURRENT_DATE, 'present', NOW() - INTERVAL '5 hours'),
  ('e2222222-2222-2222-2222-222222222222', CURRENT_DATE, 'present', NOW() - INTERVAL '4 hours'),
  ('e3333333-3333-3333-3333-333333333333', CURRENT_DATE, 'late', NOW() - INTERVAL '1 hour'),
  ('e4444444-4444-4444-4444-444444444444', CURRENT_DATE, 'absent', NULL),
  ('e5555555-5555-5555-5555-555555555555', CURRENT_DATE, 'present', NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;

-- 6. Today's Expenses
INSERT INTO expenses (branch_id, category, amount, description, date)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Electricity', 4500.00, 'Monthly electricity bill portion', CURRENT_DATE),
  ('b1111111-1111-1111-1111-111111111111', 'Maintenance', 1800.00, 'Nozzle calibration service', CURRENT_DATE),
  ('b1111111-1111-1111-1111-111111111111', 'Cleaning', 600.00, 'Forecourt cleaning supplies', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- 7. Today's Sales
INSERT INTO sales (branch_id, employee_id, fuel_type, volume, price_per_unit, total_amount, payment_method)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 'petrol', 15.5, 106.03, 1643.46, 'upi'),
  ('b1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'diesel', 45.0, 94.27, 4242.15, 'card'),
  ('b1111111-1111-1111-1111-111111111111', 'e4444444-4444-4444-4444-444444444444', 'premium_petrol', 20.0, 110.50, 2210.00, 'cash'),
  ('b1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 'petrol', 8.0, 106.03, 848.24, 'upi'),
  ('b1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'diesel', 100.0, 94.27, 9427.00, 'card'),
  ('b1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 'petrol', 25.0, 106.03, 2650.75, 'cash'),
  ('b1111111-1111-1111-1111-111111111111', 'e5555555-5555-5555-5555-555555555555', 'cng', 12.0, 85.00, 1020.00, 'upi')
ON CONFLICT DO NOTHING;

-- 8. Historical Sales (last 30 days for Reports page charts)
DO $$
DECLARE
  i INT;
  sale_date TIMESTAMP;
  fuel_types TEXT[] := ARRAY['petrol', 'diesel', 'premium_petrol', 'cng'];
  pay_methods TEXT[] := ARRAY['cash', 'upi', 'card'];
  ft TEXT;
  pm TEXT;
  vol DECIMAL;
  ppu DECIMAL;
BEGIN
  FOR i IN 1..30 LOOP
    sale_date := (CURRENT_DATE - i) + TIME '08:00:00';
    -- 5-8 transactions per day
    FOR j IN 1..6 LOOP
      ft := fuel_types[1 + floor(random() * 4)::INT];
      pm := pay_methods[1 + floor(random() * 3)::INT];
      vol := ROUND((10 + random() * 90)::NUMERIC, 2);
      ppu := CASE ft 
        WHEN 'petrol' THEN 106.03 
        WHEN 'diesel' THEN 94.27 
        WHEN 'premium_petrol' THEN 110.50 
        ELSE 85.00 END;
      INSERT INTO sales (branch_id, employee_id, fuel_type, volume, price_per_unit, total_amount, payment_method, created_at)
      VALUES (
        'b1111111-1111-1111-1111-111111111111',
        'e2222222-2222-2222-2222-222222222222',
        ft, vol, ppu, ROUND(vol * ppu, 2), pm,
        sale_date + (j * INTERVAL '90 minutes')
      );
    END LOOP;
  END LOOP;
END $$;

-- 9. Activity Logs
INSERT INTO activity_logs (action, entity_type, created_at)
VALUES
  ('Employee Rajesh Kumar checked in', 'attendance', NOW() - INTERVAL '5 hours'),
  ('Sale: Rs.4242 via card (diesel)', 'sales', NOW() - INTERVAL '3 hours'),
  ('Expense logged: Electricity Rs.4500', 'expenses', NOW() - INTERVAL '2 hours'),
  ('Sale: Rs.2210 via cash (premium_petrol)', 'sales', NOW() - INTERVAL '1 hour'),
  ('Fuel alert: Premium petrol below threshold', 'alerts', NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;
