-- Dr. Pita ERP — Database Schema (from approved ERD)

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
