-- =============================================
-- Dr. Pita ERP — FULL DATABASE SETUP
-- Run this entire script in Supabase SQL Editor
-- =============================================

-- PART 1: SCHEMA (17 tables)

CREATE TABLE roles (
    role_id       SERIAL PRIMARY KEY,
    role_name     VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE employees (
    employee_id   SERIAL PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    role          VARCHAR(50) NOT NULL,
    license_type  VARCHAR(20),
    is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    role_id       INT REFERENCES roles(role_id),
    employee_id   INT REFERENCES employees(employee_id)
);

CREATE TABLE customers (
    customer_id      SERIAL PRIMARY KEY,
    business_name    VARCHAR(200) NOT NULL,
    phone            VARCHAR(20),
    email            VARCHAR(100),
    address          TEXT,
    credit_limit     NUMERIC(12,2) NOT NULL DEFAULT 0,
    current_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
    status           VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE products (
    product_id    SERIAL PRIMARY KEY,
    product_name  VARCHAR(100) NOT NULL,
    base_price    NUMERIC(10,2) NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE suppliers (
    supplier_id    SERIAL PRIMARY KEY,
    supplier_name  VARCHAR(200) NOT NULL,
    phone          VARCHAR(20),
    email          VARCHAR(100)
);

CREATE TABLE raw_materials (
    material_id        SERIAL PRIMARY KEY,
    material_name      VARCHAR(100) NOT NULL,
    unit               VARCHAR(20) NOT NULL,
    current_quantity   NUMERIC(12,2) NOT NULL DEFAULT 0,
    minimum_threshold  NUMERIC(12,2) NOT NULL DEFAULT 0,
    supplier_id        INT REFERENCES suppliers(supplier_id)
);

CREATE TABLE bill_of_materials (
    bom_id          SERIAL PRIMARY KEY,
    product_id      INT NOT NULL REFERENCES products(product_id),
    material_id     INT NOT NULL REFERENCES raw_materials(material_id),
    required_amount NUMERIC(10,4) NOT NULL,
    unit            VARCHAR(20) NOT NULL
);

CREATE TABLE vehicles (
    vehicle_id     SERIAL PRIMARY KEY,
    license_plate  VARCHAR(20) NOT NULL UNIQUE,
    max_capacity   NUMERIC(10,2),
    is_available   BOOLEAN DEFAULT TRUE
);

CREATE TABLE deliveries (
    delivery_id     SERIAL PRIMARY KEY,
    driver_id       INT REFERENCES employees(employee_id),
    vehicle_id      INT REFERENCES vehicles(vehicle_id),
    departure_time  TIMESTAMP,
    arrival_time    TIMESTAMP,
    status          VARCHAR(20) DEFAULT 'Planned',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    order_id               SERIAL PRIMARY KEY,
    customer_id            INT NOT NULL REFERENCES customers(customer_id),
    delivery_id            INT REFERENCES deliveries(delivery_id),
    order_date             TIMESTAMP NOT NULL DEFAULT NOW(),
    required_delivery_date TIMESTAMP,
    status                 VARCHAR(20) DEFAULT 'Draft',
    total_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at             TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    order_item_id      SERIAL PRIMARY KEY,
    order_id           INT NOT NULL REFERENCES orders(order_id),
    product_id         INT NOT NULL REFERENCES products(product_id),
    quantity           INT NOT NULL,
    unit_price_at_sale NUMERIC(10,2) NOT NULL
);

CREATE TABLE production_plans (
    plan_id      SERIAL PRIMARY KEY,
    plan_date    DATE NOT NULL,
    status       VARCHAR(30) DEFAULT 'Draft',
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE production_plan_items (
    plan_item_id      SERIAL PRIMARY KEY,
    plan_id           INT NOT NULL REFERENCES production_plans(plan_id),
    product_id        INT NOT NULL REFERENCES products(product_id),
    planned_quantity  INT NOT NULL,
    produced_quantity INT DEFAULT 0
);

CREATE TABLE delivery_notes (
    note_id            SERIAL PRIMARY KEY,
    delivery_id        INT NOT NULL REFERENCES deliveries(delivery_id),
    created_at         TIMESTAMP DEFAULT NOW(),
    digital_signature  TEXT,
    sent_to_email      BOOLEAN DEFAULT FALSE
);

CREATE TABLE inventory_alerts (
    alert_id       SERIAL PRIMARY KEY,
    material_id    INT REFERENCES raw_materials(material_id),
    created_at     TIMESTAMP DEFAULT NOW(),
    alert_message  TEXT,
    alert_status   VARCHAR(20) DEFAULT 'New'
);

CREATE TABLE purchase_order_items (
    purchase_item_id  SERIAL PRIMARY KEY,
    material_id       INT REFERENCES raw_materials(material_id),
    quantity          NUMERIC(10,2),
    order_date        TIMESTAMP DEFAULT NOW()
);

-- PART 2: SEED DATA

INSERT INTO roles (role_name) VALUES ('Manager'), ('ProductionWorker'), ('WarehouseWorker'), ('Driver');

INSERT INTO employees (full_name, role, license_type, is_active) VALUES
('אבי כהן', 'Manager', NULL, true),
('דני כהן', 'Manager', NULL, true),
('מוחמד סעיד', 'Driver', 'C1', true),
('יוסי לוי', 'Driver', 'C', true),
('אחמד חסן', 'ProductionWorker', NULL, true),
('רונן דוד', 'WarehouseWorker', NULL, true);

INSERT INTO users (username, password_hash, is_active, role_id, employee_id) VALUES
('avi',    'hashed_password_here', true, 1, 1),
('dani',   'hashed_password_here', true, 1, 2),
('mohamad','hashed_password_here', true, 4, 3),
('yossi',  'hashed_password_here', true, 4, 4),
('ahmad',  'hashed_password_here', true, 2, 5),
('ronen',  'hashed_password_here', true, 3, 6);

INSERT INTO customers (business_name, phone, email, address, credit_limit, current_balance, status) VALUES
('סופר יהודה - רמלה',   '08-9221234', 'orders@yehuda.co.il',  'רח׳ הרצל 45, רמלה',   50000, 12000, 'Active'),
('מאפיית הטאבון הזהב',  '08-9335566', 'tabun@gold.co.il',     'שד׳ ויצמן 12, רחובות', 30000, 28000, 'Active'),
('רשת חנויות פרש',      '03-6781234', 'purchasing@fresh.co.il','אזור תעשייה, לוד',     80000, 15000, 'Active');

INSERT INTO products (product_name, base_price, is_active) VALUES
('פיתה לבנה רגילה',      2.50, true),
('פיתה מקמח מלא',        3.00, true),
('פיתה טאבון גדולה',     4.50, true),
('לאפה עיראקית',         3.50, true),
('פיתה מיני (אירוח)',    1.80, true);

INSERT INTO suppliers (supplier_name, phone, email) VALUES
('טחנות קמח הצפון',  '04-6521234', 'sales@flour-north.co.il'),
('שמרים ישראל בע"מ', '03-5541234', 'orders@yeast.co.il');

INSERT INTO raw_materials (material_name, unit, current_quantity, minimum_threshold, supplier_id) VALUES
('קמח לבן 0',     'kg', 500, 100, 1),
('קמח מלא',       'kg', 200,  80, 1),
('שמרים יבשים',   'kg',  30,  10, 2),
('מלח',           'kg',  50,  15, 1),
('שמן זית',       'liters', 40, 10, 1),
('מים',           'liters', 9999, 100, NULL);

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

INSERT INTO vehicles (license_plate, max_capacity, is_available) VALUES
('12-345-67', 2000, true),
('89-012-34', 1500, true);

INSERT INTO deliveries (driver_id, vehicle_id, status) VALUES
(3, 1, 'OnTheWay'),
(4, 2, 'Planned');

INSERT INTO orders (customer_id, delivery_id, order_date, required_delivery_date, status, total_amount) VALUES
(1, 1, NOW() - INTERVAL '2 hours', NOW(), 'Approved', 2500),
(3, 1, NOW() - INTERVAL '1 hour',  NOW(), 'Approved', 4500);

INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_sale) VALUES
(1, 1, 500, 2.50),
(1, 3, 200, 4.50),
(2, 1, 1000, 2.50),
(2, 2, 300, 3.00),
(2, 4, 200, 3.50);

-- PART 3: VERIFICATION
SELECT 'TABLES CREATED: ' || count(*)::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT 'USERS: ' || count(*)::text FROM users;
SELECT 'CUSTOMERS: ' || count(*)::text FROM customers;
SELECT 'PRODUCTS: ' || count(*)::text FROM products;
SELECT 'ORDERS: ' || count(*)::text FROM orders;
