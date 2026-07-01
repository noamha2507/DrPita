-- =============================================
-- Dr. Pita ERP — REALISTIC SEED DATA
-- Run this in Supabase SQL Editor
-- Clears existing data and inserts fresh, realistic data
-- =============================================

-- STEP 1: Clear all existing data (order matters for FK constraints)
TRUNCATE TABLE purchase_order_items, inventory_alerts, delivery_notes,
  order_items, orders, production_plan_items, production_plans,
  deliveries, vehicles, bill_of_materials, raw_materials, suppliers,
  products, users, customers, employees, roles
  RESTART IDENTITY CASCADE;

-- =============================================
-- STEP 2: BASE DATA
-- =============================================

-- Roles (matching Class Diagram: EmployeeRole enum)
INSERT INTO roles (role_name) VALUES
  ('Manager'),
  ('ProductionWorker'),
  ('WarehouseWorker'),
  ('Driver');

-- Employees — realistic Israeli names
INSERT INTO employees (full_name, role, license_type, is_active) VALUES
  ('אבי כהן',      'Manager',          NULL, true),    -- 1
  ('דני לוי',       'Manager',          NULL, true),    -- 2
  ('מוחמד סעיד',   'Driver',           'C1', true),    -- 3
  ('יוסי מזרחי',   'Driver',           'C',  true),    -- 4
  ('אחמד חסן',     'ProductionWorker',  NULL, true),    -- 5
  ('רונן דוד',      'WarehouseWorker',  NULL, true),    -- 6
  ('סמיר נאסר',    'ProductionWorker',  NULL, true),    -- 7
  ('עמית ברק',     'ProductionWorker',  NULL, true);    -- 8

-- Users — password "1234" accepted by demo logic
INSERT INTO users (username, password_hash, is_active, role_id, employee_id) VALUES
  ('avi',     'hashed_password_here', true, 1, 1),
  ('dani',    'hashed_password_here', true, 1, 2),
  ('mohamad', 'hashed_password_here', true, 4, 3),
  ('yossi',   'hashed_password_here', true, 4, 4),
  ('ahmad',   'hashed_password_here', true, 2, 5),
  ('ronen',   'hashed_password_here', true, 3, 6),
  ('samir',   'hashed_password_here', true, 2, 7),
  ('amit',    'hashed_password_here', true, 2, 8);

-- =============================================
-- STEP 3: CUSTOMERS — 6 realistic bakery clients
-- =============================================
INSERT INTO customers (business_name, phone, email, address, credit_limit, current_balance, status) VALUES
  ('סופר יהודה — סניף רמלה',       '08-922-1234', 'orders@yehuda.co.il',        'רח׳ הרצל 45, רמלה',           50000,  18500, 'Active'),
  ('מאפיית הטאבון הזהב',           '08-933-5566', 'tabun@gold.co.il',           'שד׳ ויצמן 12, רחובות',        30000,  12000, 'Active'),
  ('רשת פרש מרקט',                  '03-678-1234', 'purchasing@freshmarket.co.il','אזור תעשייה הצפוני, לוד',     100000, 35000, 'Active'),
  ('מסעדת אבו חסן — יפו',          '03-681-4432', 'orders@abuhassan.co.il',     'רח׳ הדולפין 1, נמל יפו',      25000,  8000,  'Active'),
  ('קייטרינג שמחות',                '052-888-9900', 'events@smachot-catering.co.il','רח׳ ז׳בוטינסקי 88, פ״ת',    60000,  22000, 'Active'),
  ('מכולת אבו מארון — לוד',        '08-924-3311', 'abu.maroun@gmail.com',        'רח׳ הנשיא 14, לוד',           15000,  3500,  'Active');

-- =============================================
-- STEP 4: PRODUCTS — 5 types of pita
-- =============================================
INSERT INTO products (product_name, base_price, is_active) VALUES
  ('פיתה לבנה רגילה',    2.50,  true),   -- 1
  ('פיתה מקמח מלא',      3.00,  true),   -- 2
  ('פיתה טאבון גדולה',   4.50,  true),   -- 3
  ('לאפה עיראקית',       3.50,  true),   -- 4
  ('פיתה מיני (אירוח)',  1.80,  true);   -- 5

-- =============================================
-- STEP 5: SUPPLIERS — 3 suppliers
-- =============================================
INSERT INTO suppliers (supplier_name, phone, email) VALUES
  ('טחנות קמח הצפון',       '04-652-1234', 'sales@flour-north.co.il'),   -- 1
  ('שמרים ישראל בע״מ',      '03-554-1234', 'orders@yeast-il.co.il'),     -- 2
  ('שמן הבוטיק — גליל',    '04-699-8877', 'oil@boutique-galil.co.il');   -- 3

-- =============================================
-- STEP 6: RAW MATERIALS — 6 materials with realistic stock
-- =============================================
INSERT INTO raw_materials (material_name, unit, current_quantity, minimum_threshold, supplier_id) VALUES
  ('קמח לבן 0',     'ק״ג',    480,  100, 1),   -- 1 — slightly below optimal
  ('קמח מלא',       'ק״ג',    180,   80, 1),   -- 2
  ('שמרים יבשים',   'ק״ג',     25,   10, 2),   -- 3
  ('מלח',           'ק״ג',     45,   15, 1),   -- 4
  ('שמן זית',       'ליטר',    35,   10, 3),   -- 5
  ('מים',           'ליטר', 9999,  100, NULL);   -- 6 — unlimited

-- =============================================
-- STEP 7: BILL OF MATERIALS — recipes per product
-- =============================================
-- Product 1: פיתה לבנה רגילה
INSERT INTO bill_of_materials (product_id, material_id, required_amount, unit) VALUES
  (1, 1, 0.1500, 'ק״ג'),    -- קמח לבן
  (1, 3, 0.0030, 'ק״ג'),    -- שמרים
  (1, 4, 0.0030, 'ק״ג'),    -- מלח
  (1, 6, 0.0800, 'ליטר');    -- מים

-- Product 2: פיתה מקמח מלא
INSERT INTO bill_of_materials (product_id, material_id, required_amount, unit) VALUES
  (2, 2, 0.1500, 'ק״ג'),    -- קמח מלא
  (2, 3, 0.0030, 'ק״ג'),    -- שמרים
  (2, 4, 0.0030, 'ק״ג'),    -- מלח
  (2, 6, 0.0800, 'ליטר');    -- מים

-- Product 3: פיתה טאבון גדולה
INSERT INTO bill_of_materials (product_id, material_id, required_amount, unit) VALUES
  (3, 1, 0.2500, 'ק״ג'),    -- קמח לבן (יותר)
  (3, 3, 0.0050, 'ק״ג'),    -- שמרים
  (3, 5, 0.0100, 'ליטר'),    -- שמן זית
  (3, 6, 0.1200, 'ליטר');    -- מים

-- Product 4: לאפה עיראקית
INSERT INTO bill_of_materials (product_id, material_id, required_amount, unit) VALUES
  (4, 1, 0.2000, 'ק״ג'),    -- קמח לבן
  (4, 3, 0.0040, 'ק״ג'),    -- שמרים
  (4, 4, 0.0030, 'ק״ג'),    -- מלח
  (4, 5, 0.0050, 'ליטר'),    -- שמן זית
  (4, 6, 0.1000, 'ליטר');    -- מים

-- Product 5: פיתה מיני (אירוח)
INSERT INTO bill_of_materials (product_id, material_id, required_amount, unit) VALUES
  (5, 1, 0.0800, 'ק״ג'),    -- קמח לבן (קטנה)
  (5, 3, 0.0020, 'ק״ג'),    -- שמרים
  (5, 4, 0.0020, 'ק״ג'),    -- מלח
  (5, 6, 0.0500, 'ליטר');    -- מים

-- =============================================
-- STEP 8: VEHICLES
-- =============================================
INSERT INTO vehicles (license_plate, max_capacity, is_available) VALUES
  ('12-345-67', 2000, true),    -- 1 — משאית גדולה
  ('89-012-34', 1500, true),    -- 2 — משאית בינונית
  ('56-789-01', 800,  true);    -- 3 — טנדר

-- =============================================
-- STEP 9: DELIVERIES — different statuses to demonstrate lifecycle
-- =============================================
INSERT INTO deliveries (driver_id, vehicle_id, departure_time, arrival_time, status, created_at) VALUES
  -- Delivery 1: Delivered yesterday (completed)
  (3, 1, NOW() - INTERVAL '26 hours', NOW() - INTERVAL '24 hours', 'Delivered', NOW() - INTERVAL '28 hours'),
  -- Delivery 2: OnTheWay now (ready for completeDelivery demo)
  (4, 2, NOW() - INTERVAL '1 hour', NULL, 'OnTheWay', NOW() - INTERVAL '3 hours'),
  -- Delivery 3: Planned for today (ready for state transition demo)
  (3, 3, NULL, NULL, 'Planned', NOW() - INTERVAL '30 minutes'),
  -- Delivery 4: Delivered two days ago
  (4, 1, NOW() - INTERVAL '50 hours', NOW() - INTERVAL '48 hours', 'Delivered', NOW() - INTERVAL '52 hours');

-- =============================================
-- STEP 10: ORDERS — realistic order history
-- =============================================
INSERT INTO orders (customer_id, delivery_id, order_date, required_delivery_date, status, total_amount, created_at) VALUES
  -- Order 1: Delivered yesterday with Delivery 1 (סופר יהודה)
  (1, 1, NOW() - INTERVAL '28 hours', NOW() - INTERVAL '24 hours', 'Delivered', 2350, NOW() - INTERVAL '28 hours'),
  -- Order 2: Delivered yesterday with Delivery 1 (רשת פרש)
  (3, 1, NOW() - INTERVAL '27 hours', NOW() - INTERVAL '24 hours', 'Delivered', 4850, NOW() - INTERVAL '27 hours'),
  -- Order 3: OnTheWay now with Delivery 2 (מסעדת אבו חסן)
  (4, 2, NOW() - INTERVAL '4 hours', NOW(), 'Approved', 1575, NOW() - INTERVAL '4 hours'),
  -- Order 4: OnTheWay now with Delivery 2 (קייטרינג שמחות)
  (5, 2, NOW() - INTERVAL '3 hours', NOW(), 'Approved', 3960, NOW() - INTERVAL '3 hours'),
  -- Order 5: Approved, assigned to Delivery 3 (סופר יהודה — new order)
  (1, 3, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 'Approved', 1900, NOW() - INTERVAL '2 hours'),
  -- Order 6: Approved, no delivery yet (מכולת אבו מארון)
  (6, NULL, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '6 hours', 'Approved', 870, NOW() - INTERVAL '1 hour'),
  -- Order 7: Rejected — credit exceeded (מאפיית הטאבון)
  (2, NULL, NOW() - INTERVAL '45 minutes', NULL, 'Rejected', 22500, NOW() - INTERVAL '45 minutes'),
  -- Order 8: Delivered 2 days ago with Delivery 4
  (3, 4, NOW() - INTERVAL '52 hours', NOW() - INTERVAL '48 hours', 'Delivered', 5600, NOW() - INTERVAL '52 hours');

-- =============================================
-- STEP 11: ORDER ITEMS — what each order contains
-- =============================================
-- Order 1: סופר יהודה — 500 פיתה לבנה + 200 מיני
INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
  (1, 1, 500, 2.50),   -- 1,250 ₪
  (1, 5, 500, 1.80),   -- 900 ₪
  (1, 3, 50,  4.00);   -- 200 ₪  (הנחת כמות)

-- Order 2: רשת פרש — הזמנה גדולה מגוונת
INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
  (2, 1, 800, 2.50),   -- 2,000 ₪
  (2, 2, 300, 3.00),   -- 900 ₪
  (2, 4, 200, 3.50),   -- 700 ₪
  (2, 5, 250, 1.00);   -- 250 ₪  (הנחת כמות גדולה)

-- Order 3: מסעדת אבו חסן — לאפה + טאבון
INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
  (3, 4, 300, 3.50),   -- 1,050 ₪
  (3, 3, 100, 4.50),   -- 450 ₪
  (3, 1, 30,  2.50);   -- 75 ₪

-- Order 4: קייטרינג שמחות — אירוע גדול
INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
  (4, 5, 1200, 1.80),  -- 2,160 ₪  (מיני לאירוח)
  (4, 1, 400,  2.50),  -- 1,000 ₪
  (4, 3, 100,  4.50),  -- 450 ₪
  (4, 4, 100,  3.50);  -- 350 ₪

-- Order 5: סופר יהודה — הזמנה נוספת
INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
  (5, 1, 400, 2.50),   -- 1,000 ₪
  (5, 2, 200, 3.00),   -- 600 ₪
  (5, 5, 200, 1.50);   -- 300 ₪

-- Order 6: מכולת אבו מארון — הזמנה קטנה
INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
  (6, 1, 150, 2.50),   -- 375 ₪
  (6, 4, 80,  3.50),   -- 280 ₪
  (6, 3, 30,  4.50),   -- 135 ₪
  (6, 5, 50,  1.60);   -- 80 ₪

-- Order 7: מאפיית הטאבון — נדחתה (חריגת אשראי)
INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
  (7, 1, 5000, 2.50),  -- 12,500 ₪
  (7, 3, 2000, 4.50),  -- 9,000 ₪
  (7, 4, 500,  2.00);  -- 1,000 ₪

-- Order 8: רשת פרש — delivered 2 days ago
INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
  (8, 1, 1000, 2.50),  -- 2,500 ₪
  (8, 2, 500,  3.00),  -- 1,500 ₪
  (8, 4, 400,  3.50),  -- 1,400 ₪
  (8, 5, 100,  2.00);  -- 200 ₪

-- =============================================
-- STEP 12: PRODUCTION PLANS — different statuses
-- =============================================
INSERT INTO production_plans (plan_date, status, created_at) VALUES
  -- Plan 1: Completed yesterday
  (CURRENT_DATE - 1, 'Completed', NOW() - INTERVAL '26 hours'),
  -- Plan 2: In Progress today
  (CURRENT_DATE, 'In Progress', NOW() - INTERVAL '5 hours'),
  -- Plan 3: Waiting For Materials (demonstrates state)
  (CURRENT_DATE + 1, 'Waiting For Materials', NOW() - INTERVAL '30 minutes');

-- =============================================
-- STEP 13: PRODUCTION PLAN ITEMS
-- =============================================
-- Plan 1 (completed yesterday): produced for orders 1+2
INSERT INTO production_plan_items (plan_id, product_id, planned_quantity, produced_quantity) VALUES
  (1, 1, 1300, 1300),   -- פיתה לבנה — completed
  (1, 2, 300,  300),    -- קמח מלא — completed
  (1, 3, 50,   50),     -- טאבון — completed
  (1, 4, 200,  200),    -- לאפה — completed
  (1, 5, 750,  750);    -- מיני — completed

-- Plan 2 (in progress today): for orders 3+4+5
INSERT INTO production_plan_items (plan_id, product_id, planned_quantity, produced_quantity) VALUES
  (2, 1, 830,  500),    -- פיתה לבנה — partially done
  (2, 2, 200,  0),      -- קמח מלא — not started
  (2, 3, 200,  100),    -- טאבון — partially done
  (2, 4, 480,  300),    -- לאפה — partially done
  (2, 5, 1400, 800);    -- מיני — partially done

-- Plan 3 (waiting for materials): for tomorrow
INSERT INTO production_plan_items (plan_id, product_id, planned_quantity, produced_quantity) VALUES
  (3, 1, 550,  0),
  (3, 4, 80,   0),
  (3, 3, 30,   0),
  (3, 5, 250,  0);

-- =============================================
-- STEP 14: DELIVERY NOTES — for completed deliveries
-- =============================================
INSERT INTO delivery_notes (delivery_id, created_at, digital_signature, sent_to_email) VALUES
  (1, NOW() - INTERVAL '24 hours', 'data:image/png;base64,sig_delivery_1', true),
  (4, NOW() - INTERVAL '48 hours', 'data:image/png;base64,sig_delivery_4', true);

-- =============================================
-- STEP 15: INVENTORY ALERTS
-- =============================================
-- None seeded — these are now created for real by
-- AutoAssignmentService.createShortageAlerts() whenever a production plan
-- actually can't proceed for lack of stock, so a hardcoded demo row here
-- would just sit stale and contradict the real (usually healthy) seeded
-- stock levels.

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 'TABLES: ' || count(*)::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT 'Roles: ' || count(*)::text FROM roles;
SELECT 'Employees: ' || count(*)::text FROM employees;
SELECT 'Users: ' || count(*)::text FROM users;
SELECT 'Customers: ' || count(*)::text FROM customers;
SELECT 'Products: ' || count(*)::text FROM products;
SELECT 'Suppliers: ' || count(*)::text FROM suppliers;
SELECT 'Raw Materials: ' || count(*)::text FROM raw_materials;
SELECT 'BOM Entries: ' || count(*)::text FROM bill_of_materials;
SELECT 'Vehicles: ' || count(*)::text FROM vehicles;
SELECT 'Orders: ' || count(*)::text FROM orders;
SELECT 'Order Items: ' || count(*)::text FROM order_items;
SELECT 'Production Plans: ' || count(*)::text FROM production_plans;
SELECT 'Plan Items: ' || count(*)::text FROM production_plan_items;
SELECT 'Deliveries: ' || count(*)::text FROM deliveries;
SELECT 'Delivery Notes: ' || count(*)::text FROM delivery_notes;
SELECT 'Inventory Alerts: ' || count(*)::text FROM inventory_alerts;
