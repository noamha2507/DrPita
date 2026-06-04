import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function POST() {
  try {
    const log: string[] = [];

    // =============================================
    // STEP 1: Clear all data (reverse FK order)
    // =============================================
    const tables = [
      'purchase_order_items', 'inventory_alerts', 'delivery_notes',
      'order_items', 'orders', 'production_plan_items', 'production_plans',
      'deliveries', 'vehicles', 'bill_of_materials', 'raw_materials',
      'suppliers', 'products', 'users', 'customers', 'employees', 'roles'
    ];
    // Tables already truncated via SQL Editor before calling this API
    log.push('Cleared all tables');

    // =============================================
    // STEP 2: Roles
    // =============================================
    const { error: rolesErr } = await supabase.from('roles').insert([
      { role_name: 'Manager' },
      { role_name: 'ProductionWorker' },
      { role_name: 'WarehouseWorker' },
      { role_name: 'Driver' },
    ]);
    if (rolesErr) throw new Error('Roles: ' + rolesErr.message);
    log.push('Roles: 4');

    // =============================================
    // STEP 3: Employees
    // =============================================
    const { error: empErr } = await supabase.from('employees').insert([
      { full_name: 'אבי כהן', role: 'Manager', license_type: null, is_active: true },
      { full_name: 'דני לוי', role: 'Manager', license_type: null, is_active: true },
      { full_name: 'מוחמד סעיד', role: 'Driver', license_type: 'C1', is_active: true },
      { full_name: 'יוסי מזרחי', role: 'Driver', license_type: 'C', is_active: true },
      { full_name: 'אחמד חסן', role: 'ProductionWorker', license_type: null, is_active: true },
      { full_name: 'רונן דוד', role: 'WarehouseWorker', license_type: null, is_active: true },
      { full_name: 'סמיר נאסר', role: 'ProductionWorker', license_type: null, is_active: true },
      { full_name: 'עמית ברק', role: 'ProductionWorker', license_type: null, is_active: true },
    ]);
    if (empErr) throw new Error('Employees: ' + empErr.message);
    log.push('Employees: 8');

    // =============================================
    // STEP 4: Users
    // =============================================
    const { error: usersErr } = await supabase.from('users').insert([
      { username: 'avi', password_hash: 'hashed_password_here', is_active: true, role_id: 1, employee_id: 1 },
      { username: 'dani', password_hash: 'hashed_password_here', is_active: true, role_id: 1, employee_id: 2 },
      { username: 'mohamad', password_hash: 'hashed_password_here', is_active: true, role_id: 4, employee_id: 3 },
      { username: 'yossi', password_hash: 'hashed_password_here', is_active: true, role_id: 4, employee_id: 4 },
      { username: 'ahmad', password_hash: 'hashed_password_here', is_active: true, role_id: 2, employee_id: 5 },
      { username: 'ronen', password_hash: 'hashed_password_here', is_active: true, role_id: 3, employee_id: 6 },
      { username: 'samir', password_hash: 'hashed_password_here', is_active: true, role_id: 2, employee_id: 7 },
      { username: 'amit', password_hash: 'hashed_password_here', is_active: true, role_id: 2, employee_id: 8 },
    ]);
    if (usersErr) throw new Error('Users: ' + usersErr.message);
    log.push('Users: 8');

    // =============================================
    // STEP 5: Customers
    // =============================================
    const { error: custErr } = await supabase.from('customers').insert([
      { business_name: 'סופר יהודה - סניף רמלה', phone: '08-922-1234', email: 'orders@yehuda.co.il', address: 'רחוב הרצל 45, רמלה', credit_limit: 50000, current_balance: 18500, status: 'Active' },
      { business_name: 'מאפיית הטאבון הזהב', phone: '08-933-5566', email: 'tabun@gold.co.il', address: 'שדרות ויצמן 12, רחובות', credit_limit: 30000, current_balance: 12000, status: 'Active' },
      { business_name: 'רשת פרש מרקט', phone: '03-678-1234', email: 'purchasing@freshmarket.co.il', address: 'אזור תעשייה הצפוני, לוד', credit_limit: 100000, current_balance: 35000, status: 'Active' },
      { business_name: 'מסעדת אבו חסן - יפו', phone: '03-681-4432', email: 'orders@abuhassan.co.il', address: 'רחוב הדולפין 1, נמל יפו', credit_limit: 25000, current_balance: 8000, status: 'Active' },
      { business_name: 'קייטרינג שמחות', phone: '052-888-9900', email: 'events@smachot-catering.co.il', address: 'רחוב ז׳בוטינסקי 88, פתח תקווה', credit_limit: 60000, current_balance: 22000, status: 'Active' },
      { business_name: 'מכולת אבו מארון - לוד', phone: '08-924-3311', email: 'abu.maroun@gmail.com', address: 'רחוב הנשיא 14, לוד', credit_limit: 15000, current_balance: 3500, status: 'Active' },
    ]);
    if (custErr) throw new Error('Customers: ' + custErr.message);
    log.push('Customers: 6');

    // =============================================
    // STEP 6: Products
    // =============================================
    const { error: prodErr } = await supabase.from('products').insert([
      { product_name: 'פיתה רגילה', base_price: 2.50, is_active: true },
    ]);
    if (prodErr) throw new Error('Products: ' + prodErr.message);
    log.push('Products: 1');

    // =============================================
    // STEP 7: Suppliers
    // =============================================
    const { error: supErr } = await supabase.from('suppliers').insert([
      { supplier_name: 'טחנות קמח הצפון', phone: '04-652-1234', email: 'sales@flour-north.co.il' },
      { supplier_name: 'שמרים ישראל בע״מ', phone: '03-554-1234', email: 'orders@yeast-il.co.il' },
    ]);
    if (supErr) throw new Error('Suppliers: ' + supErr.message);
    log.push('Suppliers: 3');

    // =============================================
    // STEP 8: Raw Materials
    // =============================================
    const { error: matErr } = await supabase.from('raw_materials').insert([
      { material_name: 'קמח', unit: 'ק״ג', current_quantity: 480, minimum_threshold: 100, supplier_id: 1 },
      { material_name: 'שמרים', unit: 'ק״ג', current_quantity: 25, minimum_threshold: 10, supplier_id: 2 },
      { material_name: 'מלח', unit: 'ק״ג', current_quantity: 45, minimum_threshold: 15, supplier_id: 1 },
      { material_name: 'מים', unit: 'ליטר', current_quantity: 9999, minimum_threshold: 100, supplier_id: null },
    ]);
    if (matErr) throw new Error('Materials: ' + matErr.message);
    log.push('Raw Materials: 6');

    // =============================================
    // STEP 9: Bill of Materials (recipes)
    // =============================================
    const bomEntries = [
      // פיתה רגילה — מתכון ליחידה אחת
      { product_id: 1, material_id: 1, required_amount: 0.15, unit: 'ק״ג' },   // קמח
      { product_id: 1, material_id: 2, required_amount: 0.003, unit: 'ק״ג' },  // שמרים
      { product_id: 1, material_id: 3, required_amount: 0.003, unit: 'ק״ג' },  // מלח
      { product_id: 1, material_id: 4, required_amount: 0.08, unit: 'ליטר' },  // מים
    ];
    const { error: bomErr } = await supabase.from('bill_of_materials').insert(bomEntries);
    if (bomErr) throw new Error('BOM: ' + bomErr.message);
    log.push('BOM: ' + bomEntries.length);

    // =============================================
    // STEP 10: Vehicles
    // =============================================
    const { error: vehErr } = await supabase.from('vehicles').insert([
      { license_plate: '12-345-67', max_capacity: 2000, is_available: true },
      { license_plate: '89-012-34', max_capacity: 1500, is_available: true },
      { license_plate: '56-789-01', max_capacity: 800, is_available: true },
    ]);
    if (vehErr) throw new Error('Vehicles: ' + vehErr.message);
    log.push('Vehicles: 3');

    // =============================================
    // STEP 11: Deliveries
    // =============================================
    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

    const { error: delErr } = await supabase.from('deliveries').insert([
      { driver_id: 3, vehicle_id: 1, departure_time: hoursAgo(26), arrival_time: hoursAgo(24), status: 'Delivered', created_at: hoursAgo(28) },
      { driver_id: 4, vehicle_id: 2, departure_time: hoursAgo(1), arrival_time: null, status: 'On The Way', created_at: hoursAgo(3) },
      { driver_id: 3, vehicle_id: 3, departure_time: null, arrival_time: null, status: 'Planned', created_at: hoursAgo(0.5) },
      { driver_id: 4, vehicle_id: 1, departure_time: hoursAgo(50), arrival_time: hoursAgo(48), status: 'Delivered', created_at: hoursAgo(52) },
    ]);
    if (delErr) throw new Error('Deliveries: ' + delErr.message);
    log.push('Deliveries: 4');

    // =============================================
    // STEP 12: Orders
    // =============================================
    // All orders are for פיתה רגילה at 2.50 ₪ per unit
    const { error: ordErr } = await supabase.from('orders').insert([
      { customer_id: 1, delivery_id: 1, order_date: hoursAgo(28), required_delivery_date: hoursAgo(24), status: 'Delivered', total_amount: 2500, created_at: hoursAgo(28) },   // 1000 פיתות
      { customer_id: 3, delivery_id: 1, order_date: hoursAgo(27), required_delivery_date: hoursAgo(24), status: 'Delivered', total_amount: 5000, created_at: hoursAgo(27) },   // 2000 פיתות
      { customer_id: 4, delivery_id: 2, order_date: hoursAgo(4), required_delivery_date: now.toISOString(), status: 'Approved', total_amount: 1575, created_at: hoursAgo(4) },  // 630 פיתות
      { customer_id: 5, delivery_id: 2, order_date: hoursAgo(3), required_delivery_date: now.toISOString(), status: 'Approved', total_amount: 3960, created_at: hoursAgo(3) },  // 1584 פיתות
      { customer_id: 1, delivery_id: 3, order_date: hoursAgo(2), required_delivery_date: new Date(now.getTime() + 4 * 3600000).toISOString(), status: 'Approved', total_amount: 1900, created_at: hoursAgo(2) },  // 760 פיתות
      { customer_id: 6, delivery_id: null, order_date: hoursAgo(1), required_delivery_date: new Date(now.getTime() + 6 * 3600000).toISOString(), status: 'Approved', total_amount: 875, created_at: hoursAgo(1) },   // 350 פיתות
      { customer_id: 2, delivery_id: null, order_date: hoursAgo(0.75), required_delivery_date: null, status: 'Rejected', total_amount: 22500, created_at: hoursAgo(0.75) },  // 9000 פיתות (חריגת אשראי)
      { customer_id: 3, delivery_id: 4, order_date: hoursAgo(52), required_delivery_date: hoursAgo(48), status: 'Delivered', total_amount: 5000, created_at: hoursAgo(52) },  // 2000 פיתות
    ]);
    if (ordErr) throw new Error('Orders: ' + ordErr.message);
    log.push('Orders: 8');

    // =============================================
    // STEP 13: Order Items
    // =============================================
    // All orders contain only פיתה רגילה (product_id: 1) at 2.50 ₪
    const orderItems = [
      { order_id: 1, product_id: 1, quantity: 1000, unit_price_at_sale: 2.50 },  // סופר יהודה — 2,500 ₪
      { order_id: 2, product_id: 1, quantity: 2000, unit_price_at_sale: 2.50 },  // רשת פרש — 5,000 ₪
      { order_id: 3, product_id: 1, quantity: 630,  unit_price_at_sale: 2.50 },  // מסעדת אבו חסן — 1,575 ₪
      { order_id: 4, product_id: 1, quantity: 1584, unit_price_at_sale: 2.50 },  // קייטרינג שמחות — 3,960 ₪
      { order_id: 5, product_id: 1, quantity: 760,  unit_price_at_sale: 2.50 },  // סופר יהודה — 1,900 ₪
      { order_id: 6, product_id: 1, quantity: 350,  unit_price_at_sale: 2.50 },  // מכולת אבו מארון — 875 ₪
      { order_id: 7, product_id: 1, quantity: 9000, unit_price_at_sale: 2.50 },  // מאפיית הטאבון (rejected) — 22,500 ₪
      { order_id: 8, product_id: 1, quantity: 2000, unit_price_at_sale: 2.50 },  // רשת פרש — 5,000 ₪
    ];
    const { error: oiErr } = await supabase.from('order_items').insert(orderItems);
    if (oiErr) throw new Error('Order Items: ' + oiErr.message);
    log.push('Order Items: ' + orderItems.length);

    // =============================================
    // STEP 14: Production Plans
    // =============================================
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 3600000).toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 3600000).toISOString().split('T')[0];

    const { error: ppErr } = await supabase.from('production_plans').insert([
      { plan_date: yesterday, status: 'Completed', created_at: hoursAgo(26) },
      { plan_date: today, status: 'In Progress', created_at: hoursAgo(5) },
      { plan_date: tomorrow, status: 'Waiting For Materials', created_at: hoursAgo(0.5) },
    ]);
    if (ppErr) throw new Error('Plans: ' + ppErr.message);
    log.push('Production Plans: 3');

    // =============================================
    // STEP 15: Production Plan Items
    // =============================================
    // All plans produce only פיתה רגילה (product_id: 1)
    const planItems = [
      // Plan 1 (completed) — 3,000 פיתות
      { plan_id: 1, product_id: 1, planned_quantity: 3000, produced_quantity: 3000 },
      // Plan 2 (in progress) — 2,214 פיתות (for orders #3+#4)
      { plan_id: 2, product_id: 1, planned_quantity: 2214, produced_quantity: 1400 },
      // Plan 3 (waiting for materials) — 1,110 פיתות (for orders #5+#6)
      { plan_id: 3, product_id: 1, planned_quantity: 1110, produced_quantity: 0 },
    ];
    const { error: piErr } = await supabase.from('production_plan_items').insert(planItems);
    if (piErr) throw new Error('Plan Items: ' + piErr.message);
    log.push('Plan Items: ' + planItems.length);

    // =============================================
    // STEP 16: Delivery Notes
    // =============================================
    const { error: dnErr } = await supabase.from('delivery_notes').insert([
      { delivery_id: 1, created_at: hoursAgo(24), digital_signature: 'data:image/png;base64,sig1', sent_to_email: true },
      { delivery_id: 4, created_at: hoursAgo(48), digital_signature: 'data:image/png;base64,sig4', sent_to_email: true },
    ]);
    if (dnErr) throw new Error('Delivery Notes: ' + dnErr.message);
    log.push('Delivery Notes: 2');

    // =============================================
    // STEP 17: Inventory Alerts
    // =============================================
    const { error: iaErr } = await supabase.from('inventory_alerts').insert([
      { material_id: 1, alert_message: 'מלאי קמח מתקרב לסף מינימום (480 ק״ג)', alert_status: 'New' },
    ]);
    if (iaErr) throw new Error('Alerts: ' + iaErr.message);
    log.push('Alerts: 2');

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
