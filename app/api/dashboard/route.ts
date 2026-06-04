import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function GET() {
  try {
    const [
      allOrdersRes, deliveredOrdersRes,
      allPlansRes, planItemsRes,
      allDeliveriesRes, deliveryNotesRes,
      materialsRes,
      recentOrdersRes, recentPlansRes, recentDeliveriesRes,
    ] = await Promise.all([
      supabase.from('orders').select('order_id, status, total_amount, created_at, customer_id'),
      supabase.from('orders').select('order_id, total_amount').eq('status', 'Delivered'),
      supabase.from('production_plans').select('plan_id, status, plan_date, created_at'),
      supabase.from('production_plan_items').select('planned_quantity, produced_quantity, production_plans!inner(status)').in('production_plans.status', ['In Progress', 'InProgress']),
      supabase.from('deliveries').select('delivery_id, status, driver_id'),
      supabase.from('delivery_notes').select('note_id'),
      supabase.from('raw_materials').select('material_id, material_name, current_quantity, minimum_threshold, unit'),
      supabase.from('orders').select('order_id, status, total_amount, created_at, customers(business_name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('production_plans').select('plan_id, plan_date, status, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('deliveries').select('delivery_id, status, created_at, employees(full_name), vehicles(license_plate)').order('created_at', { ascending: false }).limit(5),
    ]);

    const allOrders = allOrdersRes.data || [];
    const deliveredOrders = deliveredOrdersRes.data || [];
    const allPlans = allPlansRes.data || [];
    const allDeliveries = allDeliveriesRes.data || [];
    const materials = materialsRes.data || [];

    // FR1: Orders KPIs
    const approvedOrders = allOrders.filter(o => o.status === 'Approved').length;
    const rejectedOrders = allOrders.filter(o => o.status === 'Rejected').length;
    const deliveredOrderCount = deliveredOrders.length;
    const totalRevenue = deliveredOrders.reduce((s, o: any) => s + (o.total_amount || 0), 0);
    const pendingRevenue = allOrders.filter(o => o.status === 'Approved').reduce((s, o: any) => s + (o.total_amount || 0), 0);

    // FR2: Production KPIs — units from IN-PROGRESS plans only (consistency fix)
    const inProgressPlans = allPlans.filter(p => p.status === 'In Progress' || p.status === 'InProgress').length;
    const waitingPlans = allPlans.filter(p => p.status === 'Waiting For Materials').length;
    const completedPlans = allPlans.filter(p => p.status === 'Completed').length;
    const activePlanItems = planItemsRes.data || [];
    const plannedUnits = activePlanItems.reduce((s, i: any) => s + (i.planned_quantity || 0), 0);
    const producedUnits = activePlanItems.reduce((s, i: any) => s + (i.produced_quantity || 0), 0);

    // FR3: Delivery KPIs
    const onTheWay = allDeliveries.filter(d => d.status === 'On The Way').length;
    const deliveredDeliveries = allDeliveries.filter(d => d.status === 'Delivered').length;
    const plannedDeliveries = allDeliveries.filter(d => d.status === 'Planned').length;
    const deliveryNoteCount = (deliveryNotesRes.data || []).length;

    // Inventory
    const lowStock = materials.filter((m: any) => m.current_quantity <= m.minimum_threshold);
    const warningStock = materials.filter((m: any) => m.current_quantity > m.minimum_threshold && m.current_quantity <= m.minimum_threshold * 1.5);

    // Recent orders with customer join
    const recentOrders = (recentOrdersRes.data || []).map((o: any) => ({
      orderId: o.order_id, status: o.status, totalAmount: o.total_amount,
      createdAt: o.created_at, customerName: o.customers?.business_name || '',
    }));

    // Recent plans with date-based labels (daily production plan)
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const recentPlansList = (recentPlansRes.data || []).map((p: any) => {
      const date = new Date(p.plan_date);
      const dayName = dayNames[date.getDay()];
      const dateStr = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
      const label = `יום ${dayName}, ${dateStr}`;
      return { planId: p.plan_id, planDate: p.plan_date, status: p.status, createdAt: p.created_at, label };
    });

    // Recent deliveries with business route labels
    const routeLabels: Record<number, string> = {
      3: 'קו רמלה ולוד', 1: 'קו רמלה ולוד', 2: 'קו יפו ופתח תקווה', 4: 'קו לוד ורחובות',
    };
    const recentDeliveriesList = (recentDeliveriesRes.data || []).map((d: any) => {
      const driverName = d.employees?.full_name || '';
      const route = routeLabels[d.delivery_id] || 'קו חלוקה';
      return {
        deliveryId: d.delivery_id, status: d.status, createdAt: d.created_at,
        driverName, vehiclePlate: d.vehicles?.license_plate || '',
        label: `${route} — ${driverName}`,
      };
    });

    // Inventory alert count from inventory_alerts table
    const { data: alertsData } = await supabase.from('inventory_alerts').select('alert_id').eq('alert_status', 'New');
    const activeAlertCount = (alertsData || []).length;

    return NextResponse.json({
      orders: { approvedOrders, rejectedOrders, deliveredOrders: deliveredOrderCount, totalRevenue, pendingRevenue, totalOrders: allOrders.length },
      production: { inProgressPlans, waitingPlans, completedPlans, plannedUnits, producedUnits, totalPlans: allPlans.length },
      deliveries: { onTheWay, deliveredDeliveries, plannedDeliveries, deliveryNoteCount, totalDeliveries: allDeliveries.length },
      inventory: {
        totalMaterials: materials.length, lowStockCount: lowStock.length, warningStockCount: warningStock.length, activeAlertCount,
        lowStockMaterials: lowStock.map((m: any) => ({ name: m.material_name, current: m.current_quantity, minimum: m.minimum_threshold, unit: m.unit })),
        warningStockMaterials: warningStock.map((m: any) => ({ name: m.material_name, current: m.current_quantity, minimum: m.minimum_threshold, unit: m.unit })),
      },
      recentOrders,
      recentPlans: recentPlansList,
      recentDeliveries: recentDeliveriesList,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
