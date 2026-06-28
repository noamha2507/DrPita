import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const report = searchParams.get('type') || 'summary';

    if (report === 'summary') {
      // Overall business summary
      const [ordersRes, plansRes, deliveriesRes, materialsRes] = await Promise.all([
        supabase.from('orders').select('order_id, status, total_amount, created_at'),
        supabase.from('production_plans').select('plan_id, status, plan_date'),
        supabase.from('deliveries').select('delivery_id, status'),
        // מים מוסתרים מדוח חומרי הגלם (מגיעים מהברז; נשארים ב-BOM לחישוב FR2)
        supabase.from('raw_materials').select('material_id, material_name, current_quantity, minimum_threshold, unit').neq('material_name', 'מים'),
      ]);

      const orders = ordersRes.data || [];
      const totalRevenue = orders.filter(o => o.status === 'Delivered').reduce((s, o) => s + (o.total_amount || 0), 0);
      const pendingRevenue = orders.filter(o => o.status === 'Approved').reduce((s, o) => s + (o.total_amount || 0), 0);
      const rejectedTotal = orders.filter(o => o.status === 'Rejected').reduce((s, o) => s + (o.total_amount || 0), 0);

      const ordersByStatus: Record<string, number> = {};
      orders.forEach(o => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });

      const plansByStatus: Record<string, number> = {};
      (plansRes.data || []).forEach(p => { plansByStatus[p.status] = (plansByStatus[p.status] || 0) + 1; });

      const deliveriesByStatus: Record<string, number> = {};
      (deliveriesRes.data || []).forEach(d => { deliveriesByStatus[d.status] = (deliveriesByStatus[d.status] || 0) + 1; });

      const lowStockMaterials = (materialsRes.data || []).filter(m => m.current_quantity <= m.minimum_threshold * 1.5);

      return NextResponse.json({
        type: 'summary',
        orders: { total: orders.length, byStatus: ordersByStatus, totalRevenue, pendingRevenue, rejectedTotal },
        production: { total: (plansRes.data || []).length, byStatus: plansByStatus },
        deliveries: { total: (deliveriesRes.data || []).length, byStatus: deliveriesByStatus },
        inventory: { totalMaterials: (materialsRes.data || []).length, lowStock: lowStockMaterials.length, materials: materialsRes.data },
      });
    }

    if (report === 'sales') {
      // Sales by customer and product
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, unit_price_at_sale, products(product_name), orders(status, total_amount, customer_id, customers(business_name))');

      // Aggregate by product
      const byProduct: Record<string, { name: string; quantity: number; revenue: number; orders: number }> = {};
      const byCustomer: Record<string, { name: string; revenue: number; orders: Set<number> }> = {};

      for (const item of (orderItems || [])) {
        const order = item.orders as any;
        if (!order || order.status === 'Rejected') continue;

        const productName = (item.products as any)?.product_name || 'לא ידוע';
        const customerName = order.customers?.business_name || 'לא ידוע';
        const lineTotal = item.quantity * item.unit_price_at_sale;

        if (!byProduct[productName]) byProduct[productName] = { name: productName, quantity: 0, revenue: 0, orders: 0 };
        byProduct[productName].quantity += item.quantity;
        byProduct[productName].revenue += lineTotal;
        byProduct[productName].orders++;

        if (!byCustomer[customerName]) byCustomer[customerName] = { name: customerName, revenue: 0, orders: new Set() };
        byCustomer[customerName].revenue += lineTotal;
        byCustomer[customerName].orders.add(order.customer_id);
      }

      const productsList = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);
      const customersList = Object.values(byCustomer)
        .map(c => ({ name: c.name, revenue: c.revenue, orderCount: c.orders.size }))
        .sort((a, b) => b.revenue - a.revenue);

      return NextResponse.json({ type: 'sales', byProduct: productsList, byCustomer: customersList });
    }

    if (report === 'production') {
      // Production efficiency
      const { data: planItems } = await supabase
        .from('production_plan_items')
        .select('planned_quantity, produced_quantity, products(product_name), production_plans(plan_id, plan_date, status)');

      const byPlan: Record<number, { planId: number; date: string; status: string; planned: number; produced: number; items: any[] }> = {};

      for (const item of (planItems || [])) {
        const plan = item.production_plans as any;
        if (!plan) continue;
        if (!byPlan[plan.plan_id]) {
          byPlan[plan.plan_id] = { planId: plan.plan_id, date: plan.plan_date, status: plan.status, planned: 0, produced: 0, items: [] };
        }
        byPlan[plan.plan_id].planned += item.planned_quantity;
        byPlan[plan.plan_id].produced += item.produced_quantity;
        byPlan[plan.plan_id].items.push({
          productName: (item.products as any)?.product_name || '',
          planned: item.planned_quantity,
          produced: item.produced_quantity,
          efficiency: item.planned_quantity > 0 ? Math.round((item.produced_quantity / item.planned_quantity) * 100) : 0,
        });
      }

      const plans = Object.values(byPlan).map(p => ({
        ...p,
        efficiency: p.planned > 0 ? Math.round((p.produced / p.planned) * 100) : 0,
      })).sort((a, b) => b.planId - a.planId);

      return NextResponse.json({ type: 'production', plans });
    }

    return NextResponse.json({ error: 'סוג דוח לא מוכר' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
