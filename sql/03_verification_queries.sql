-- FR1: Show newly created orders
SELECT o.order_id, c.business_name, o.total_amount, o.status, o.created_at
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY o.created_at DESC;

-- FR1: Show order items
SELECT oi.order_item_id, p.product_name, oi.quantity, oi.unit_price_at_sale, o.created_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.created_at > NOW() - INTERVAL '5 minutes';

-- FR2: Show newly created production plan
SELECT pp.plan_id, pp.plan_date, pp.status, pp.created_at
FROM production_plans pp
WHERE pp.created_at > NOW() - INTERVAL '5 minutes';

-- FR2: Show production plan items
SELECT ppi.plan_item_id, p.product_name, ppi.planned_quantity, pp.created_at
FROM production_plan_items ppi
JOIN production_plans pp ON ppi.plan_id = pp.plan_id
JOIN products p ON ppi.product_id = p.product_id
WHERE pp.created_at > NOW() - INTERVAL '5 minutes';

-- FR3: Show updated delivery
SELECT d.delivery_id, e.full_name as driver, d.status, d.arrival_time, d.created_at
FROM deliveries d
JOIN employees e ON d.driver_id = e.employee_id
WHERE d.status = 'Delivered'
ORDER BY d.arrival_time DESC;

-- FR3: Show delivery notes
SELECT dn.note_id, dn.delivery_id, dn.created_at, dn.sent_to_email
FROM delivery_notes dn
WHERE dn.created_at > NOW() - INTERVAL '5 minutes';

-- FR3: Show orders updated to Delivered
SELECT o.order_id, c.business_name, o.status, o.created_at
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.status = 'Delivered'
ORDER BY o.created_at DESC;
