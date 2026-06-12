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

    // Even when there are no orphans we still run a consolidation pass
    // so any earlier-created same-route or along-the-way deliveries get merged.
    if (!orphans || orphans.length === 0) {
      let mergedSameRoute = 0;
      let absorbedAlongWay = 0;
      const warningsOnlyConsolidation: string[] = [];
      try {
        const consolidation = await AutoAssignmentService.consolidateForDate(deliveryDate);
        mergedSameRoute = consolidation.mergedSameRoute;
        absorbedAlongWay = consolidation.absorbedAlongWay;
        if (consolidation.warnings.length > 0) warningsOnlyConsolidation.push(...consolidation.warnings);
      } catch (e: any) {
        warningsOnlyConsolidation.push(`איחוד משלוחים נכשל: ${e.message}`);
      }
      return NextResponse.json({
        success: true,
        assignedCount: 0,
        mergedSameRoute,
        absorbedAlongWay,
        warnings: warningsOnlyConsolidation,
      });
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

    // Final consolidation pass — merge same-route deliveries and absorb stops along the way
    let mergedSameRoute = 0;
    let absorbedAlongWay = 0;
    try {
      const consolidation = await AutoAssignmentService.consolidateForDate(deliveryDate);
      mergedSameRoute = consolidation.mergedSameRoute;
      absorbedAlongWay = consolidation.absorbedAlongWay;
      if (consolidation.warnings.length > 0) warnings.push(...consolidation.warnings);
    } catch (e: any) {
      warnings.push(`איחוד משלוחים נכשל: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      assignedCount,
      totalOrphans: orphans.length,
      mergedSameRoute,
      absorbedAlongWay,
      warnings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
