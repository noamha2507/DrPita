import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// Returns rich detail for a specific production plan:
// - Plan info
// - Plan items with product names and quantities
// - Required materials with current stock (from BOM calculation)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({ error: 'נדרש מזהה תוכנית' }, { status: 400 });
    }

    // 1. Get plan info
    const { data: plan, error: planErr } = await supabase
      .from('production_plans')
      .select('*')
      .eq('plan_id', Number(planId))
      .single();
    if (planErr) throw planErr;

    // 2. Get plan items with product names
    const { data: planItems, error: piErr } = await supabase
      .from('production_plan_items')
      .select('*, products(product_name)')
      .eq('plan_id', Number(planId));
    if (piErr) throw piErr;

    const items = (planItems || []).map((pi: any) => ({
      planItemId: pi.plan_item_id,
      productId: pi.product_id,
      productName: pi.products?.product_name || `מוצר #${pi.product_id}`,
      plannedQuantity: pi.planned_quantity,
      producedQuantity: pi.produced_quantity,
      progress: pi.planned_quantity > 0
        ? Math.round((pi.produced_quantity / pi.planned_quantity) * 100)
        : 0,
    }));

    // 3. Calculate required materials from BOM
    const materials: Record<number, { materialName: string; required: number; current: number; unit: string }> = {};

    for (const item of items) {
      const { data: bomEntries } = await supabase
        .from('bill_of_materials')
        .select('*, raw_materials(material_name, current_quantity, unit)')
        .eq('product_id', item.productId);

      for (const bom of (bomEntries || [])) {
        const matId = bom.material_id;
        const needed = bom.required_amount * item.plannedQuantity;
        if (!materials[matId]) {
          materials[matId] = {
            materialName: bom.raw_materials?.material_name || `חומר #${matId}`,
            required: 0,
            current: bom.raw_materials?.current_quantity || 0,
            unit: bom.raw_materials?.unit || '',
          };
        }
        materials[matId].required += needed;
      }
    }

    const materialsList = Object.values(materials).map(m => ({
      ...m,
      required: Math.round(m.required * 100) / 100,
      sufficient: m.current >= m.required,
      shortage: m.current < m.required ? Math.round((m.required - m.current) * 100) / 100 : 0,
    }));

    // 4. Get related approved orders for the plan date
    // Plan date = delivery date (produce overnight, deliver morning)
    const planDate = plan.plan_date;
    const { data: relatedOrders } = await supabase
      .from('orders')
      .select('order_id, customer_id, total_amount, status, required_delivery_date, customers(business_name)')
      .eq('status', 'Approved')
      .gte('required_delivery_date', planDate + 'T00:00:00')
      .lt('required_delivery_date', planDate + 'T23:59:59');

    const orders = (relatedOrders || []).map((o: any) => ({
      orderId: o.order_id,
      customerName: o.customers?.business_name || '',
      totalAmount: o.total_amount,
      status: o.status,
    }));

    return NextResponse.json({
      plan: {
        planId: plan.plan_id,
        planDate: plan.plan_date,
        status: plan.status,
        createdAt: plan.created_at,
      },
      items,
      materials: materialsList,
      relatedOrders: orders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
