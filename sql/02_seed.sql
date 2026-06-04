-- Roles
INSERT INTO roles (role_name) VALUES ('Manager'), ('ProductionWorker'), ('WarehouseWorker'), ('Driver');

-- Employees
INSERT INTO employees (full_name, role, license_type, is_active) VALUES
('אבי כהן', 'Manager', NULL, true),
('דני כהן', 'Manager', NULL, true),
('מוחמד סעיד', 'Driver', 'C1', true),
('יוסי לוי', 'Driver', 'C', true),
('אחמד חסן', 'ProductionWorker', NULL, true),
('רונן דוד', 'WarehouseWorker', NULL, true);

-- Users (login credentials, simple hash for demo)
INSERT INTO users (username, password_hash, is_active, role_id, employee_id) VALUES
('avi',    'hashed_password_here', true, 1, 1),
('dani',   'hashed_password_here', true, 1, 2),
('mohamad','hashed_password_here', true, 4, 3),
('yossi',  'hashed_password_here', true, 4, 4),
('ahmad',  'hashed_password_here', true, 2, 5),
('ronen',  'hashed_password_here', true, 3, 6);

-- Customers
INSERT INTO customers (business_name, phone, email, address, credit_limit, current_balance, status) VALUES
('סופר יהודה - רמלה',   '08-9221234', 'orders@yehuda.co.il',  'רח׳ הרצל 45, רמלה',   50000, 12000, 'Active'),
('מאפיית הטאבון הזהב',  '08-9335566', 'tabun@gold.co.il',     'שד׳ ויצמן 12, רחובות', 30000, 28000, 'Active'),
('רשת חנויות פרש',      '03-6781234', 'purchasing@fresh.co.il','אזור תעשייה, לוד',     80000, 15000, 'Active');

-- Products
INSERT INTO products (product_name, base_price, is_active) VALUES
('פיתה לבנה רגילה',      2.50, true),
('פיתה מקמח מלא',        3.00, true),
('פיתה טאבון גדולה',     4.50, true),
('לאפה עיראקית',         3.50, true),
('פיתה מיני (אירוח)',    1.80, true);

-- Suppliers
INSERT INTO suppliers (supplier_name, phone, email) VALUES
('טחנות קמח הצפון',  '04-6521234', 'sales@flour-north.co.il'),
('שמרים ישראל בע"מ', '03-5541234', 'orders@yeast.co.il');

-- Raw Materials
INSERT INTO raw_materials (material_name, unit, current_quantity, minimum_threshold, supplier_id) VALUES
('קמח לבן 0',     'kg', 500, 100, 1),
('קמח מלא',       'kg', 200,  80, 1),
('שמרים יבשים',   'kg',  30,  10, 2),
('מלח',           'kg',  50,  15, 1),
('שמן זית',       'liters', 40, 10, 1),
('מים',           'liters', 9999, 100, NULL);

-- Bill of Materials (recipes)
INSERT INTO bill_of_materials (product_id, material_id, required_amount, unit) VALUES
(1, 1, 0.15, 'kg'),
(1, 3, 0.003, 'kg'),
(1, 4, 0.003, 'kg'),
(1, 6, 0.08, 'liters'),
(2, 2, 0.15, 'kg'),
(2, 3, 0.003, 'kg'),
(2, 4, 0.003, 'kg'),
(2, 6, 0.08, 'liters'),
(3, 1, 0.25, 'kg'),
(3, 3, 0.005, 'kg'),
(3, 5, 0.01, 'liters'),
(3, 6, 0.12, 'liters');

-- Vehicles
INSERT INTO vehicles (license_plate, max_capacity, is_available) VALUES
('12-345-67', 2000, true),
('89-012-34', 1500, true);

-- Deliveries (pre-seeded for FR3 demo)
INSERT INTO deliveries (driver_id, vehicle_id, status) VALUES
(3, 1, 'OnTheWay'),
(4, 2, 'Planned');

-- Pre-seeded approved orders (for FR2 + FR3 demos)
INSERT INTO orders (customer_id, delivery_id, order_date, required_delivery_date, status, total_amount) VALUES
(1, 1, NOW() - INTERVAL '2 hours', NOW(), 'Approved', 2500),
(3, 1, NOW() - INTERVAL '1 hour',  NOW(), 'Approved', 4500);

INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
(1, 1, 500, 2.50),
(1, 3, 200, 4.50),
(2, 1, 1000, 2.50),
(2, 2, 300, 3.00),
(2, 4, 200, 3.50);
