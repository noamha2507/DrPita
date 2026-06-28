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
      // מים מוסתרים מתצוגת חומרי הגלם בדשבורד (מגיעים מהברז; נשארים ב-BOM לחישוב FR2)
      supabase.from('raw_materials').select('material_id, material_name, current_quantity, minimum_threshold, unit').neq('material_name', 'מים'),
      supabase.from('orders').select('order_id, status, total_amount, created_at, required_delivery_date, customers(business_name, credit_limit, current_balance)').order('created_at', { ascending: false }).limit(5),
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

    // Recent orders — enrich with quantity, required date, and derived
    // rejection reason. Rejection reason is not persisted, so we reproduce
    // the original validateOrder logic from live credit data.
    const recentOrderIds = (recentOrdersRes.data || []).map((o: any) => o.order_id);
    const { data: recentItemsData } = await supabase
      .from('order_items')
      .select('order_id, quantity')
      .in('order_id', recentOrderIds.length > 0 ? recentOrderIds : [-1]);
    const qtyByOrder: Record<number, number> = {};
    for (const it of recentItemsData || []) {
      qtyByOrder[it.order_id] = (qtyByOrder[it.order_id] || 0) + (it.quantity || 0);
    }

    const recentOrders = (recentOrdersRes.data || []).map((o: any) => {
      let rejectionReason: string | null = null;
      if (o.status === 'Rejected') {
        const limit = o.customers?.credit_limit ?? 0;
        const balance = o.customers?.current_balance ?? 0;
        // Same rule as OrderController.validateOrder
        rejectionReason = (balance + (o.total_amount || 0) > limit)
          ? 'חריגת מסגרת אשראי'
          : 'מלאי לא זמין';
      }
      return {
        orderId: o.order_id, status: o.status, totalAmount: o.total_amount,
        createdAt: o.created_at,
        customerName: o.customers?.business_name || '',
        quantity: qtyByOrder[o.order_id] || 0,
        requiredDeliveryDate: o.required_delivery_date,
        rejectionReason,
      };
    });

    // Recent plans with date-based labels + planned quantity per plan
    const recentPlanIds = (recentPlansRes.data || []).map((p: any) => p.plan_id);
    const { data: recentPlanItemsData } = await supabase
      .from('production_plan_items')
      .select('plan_id, planned_quantity')
      .in('plan_id', recentPlanIds.length > 0 ? recentPlanIds : [-1]);
    const qtyByPlan: Record<number, number> = {};
    for (const it of recentPlanItemsData || []) {
      qtyByPlan[it.plan_id] = (qtyByPlan[it.plan_id] || 0) + (it.planned_quantity || 0);
    }

    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const recentPlansList = (recentPlansRes.data || []).map((p: any) => {
      const date = new Date(p.plan_date);
      const dayName = dayNames[date.getDay()];
      const dateStr = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
      const label = `יום ${dayName}, ${dateStr}`;
      return {
        planId: p.plan_id, planDate: p.plan_date, status: p.status, createdAt: p.created_at, label,
        plannedQuantity: qtyByPlan[p.plan_id] || 0,
      };
    });

    // Recent deliveries — route label derived from first customer address,
    // plus stop count and total value per delivery.
    const { AutoAssignmentService } = await import('@/lib/services/AutoAssignmentService');
    const recentDeliveryIds = (recentDeliveriesRes.data || []).map((d: any) => d.delivery_id);
    const { data: recentDelOrders } = await supabase
      .from('orders')
      .select('delivery_id, total_amount, customers(address)')
      .in('delivery_id', recentDeliveryIds.length > 0 ? recentDeliveryIds : [-1]);
    const delAgg: Record<number, { stops: number; value: number; firstAddress: string }> = {};
    for (const o of recentDelOrders || []) {
      if (!delAgg[o.delivery_id]) delAgg[o.delivery_id] = { stops: 0, value: 0, firstAddress: (o as any).customers?.address || '' };
      delAgg[o.delivery_id].stops++;
      delAgg[o.delivery_id].value += o.total_amount || 0;
    }

    const recentDeliveriesList = (recentDeliveriesRes.data || []).map((d: any) => {
      const driverName = d.employees?.full_name || '';
      const agg = delAgg[d.delivery_id] || { stops: 0, value: 0, firstAddress: '' };
      const route = AutoAssignmentService.getRouteLabel(AutoAssignmentService.getRouteKeyFromAddress(agg.firstAddress));
      return {
        deliveryId: d.delivery_id, status: d.status, createdAt: d.created_at,
        driverName, vehiclePlate: d.vehicles?.license_plate || '',
        routeLabel: route,
        stopCount: agg.stops,
        totalValue: agg.value,
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
