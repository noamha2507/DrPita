import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { AutoAssignmentService } from '@/lib/services/AutoAssignmentService';

/**
 * POST — Auto-assign any approved orders for the given delivery date
 * that don't yet have a delivery attached.
 *
 * Re-uses AutoAssignmentService so the same route-grouping and
 * production-plan logic that runs at order creation also runs here.
 * Idempotent — safe to call repeatedly.
 */
export async function POST(request: NextRequest) {
  try {
    const { deliveryDate } = await request.json();
    if (!deliveryDate) {
      return NextResponse.json({ error: 'נדרש תאריך אספקה' }, { status: 400 });
    }

    // Find approved orders for this date with no delivery
    const { data: orphans, error: ordErr } = await supabase
      .from('orders')
      .select('order_id, required_delivery_date')
      .eq('status', 'Approved')
      .is('delivery_id', null)
      .gte('required_delivery_date', deliveryDate + 'T00:00:00')
      .lt('required_delivery_date', deliveryDate + 'T23:59:59');

    if (ordErr) throw ordErr;

    if (!orphans || orphans.length === 0) {
      return NextResponse.json({ success: true, assignedCount: 0 });
    }

    // Run automation for each orphan
    let assignedCount = 0;
    const warnings: string[] = [];
    for (const order of orphans) {
      try {
        const result = await AutoAssignmentService.runAfterOrderCreated(
          order.order_id,
          order.required_delivery_date
        );
        if (result.deliveryId) assignedCount++;
        if (result.warnings.length > 0) warnings.push(...result.warnings);
      } catch (e: any) {
        warnings.push(`הזמנה #${order.order_id}: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      assignedCount,
      totalOrphans: orphans.length,
      warnings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
