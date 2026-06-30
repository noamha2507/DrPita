import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// GET — warehouse-worker home dashboard.
// The warehouse worker owns raw-material stock: monitoring levels against the
// minimum threshold, reordering from suppliers, and receiving shipments.
// Water is excluded (comes from the tap, not a counted stock item — same rule
// as the inventory screen).

// Stock status, consistent with the inventory screen:
//   current <= minimum         → קריטי (critical)
//   current <= minimum * 1.5   → נמוך (low / warning)
//   otherwise                  → תקין (ok)
function statusOf(current: number, minimum: number): 'critical' | 'low' | 'ok' {
  if (current <= minimum) return 'critical';
  if (current <= minimum * 1.5) return 'low';
  return 'ok';
}

const rank: Record<string, number> = { critical: 0, low: 1, ok: 2 };

export async function GET() {
  try {
    const [matRes, alertsRes] = await Promise.all([
      supabase
        .from('raw_materials')
        .select('material_id, material_name, unit, current_quantity, minimum_threshold, suppliers(supplier_name, phone)')
        .neq('material_name', 'מים')
        .order('material_id', { ascending: true }),
      supabase
        .from('inventory_alerts')
        .select('alert_id, alert_message, alert_status, created_at, raw_materials(material_name)')
        .eq('alert_status', 'New')
        .order('created_at', { ascending: false }),
    ]);

    const rawMaterials = matRes.data || [];

    const materials = rawMaterials.map((m: any) => {
      const current = m.current_quantity || 0;
      const minimum = m.minimum_threshold || 0;
      const status = statusOf(current, minimum);
      return {
        materialId: m.material_id,
        name: m.material_name,
        unit: m.unit || '',
        current,
        minimum,
        // "Recommended" headroom for the gauge — 3× the minimum, same framing the
        // inventory screen uses.
        recommended: minimum * 3,
        ratio: minimum > 0 ? Math.round((current / minimum) * 100) / 100 : 0,
        coverage: minimum > 0 ? Math.round((current / minimum) * 100) : 100,
        status,
        supplierName: m.suppliers?.supplier_name || null,
        supplierPhone: m.suppliers?.phone || null,
      };
    });

    // Most urgent first (lowest stock relative to its minimum)
    const byUrgency = (a: any, b: any) => rank[a.status] - rank[b.status] || a.coverage - b.coverage;
    const sorted = [...materials].sort(byUrgency);

    const criticalCount = materials.filter(m => m.status === 'critical').length;
    const lowCount = materials.filter(m => m.status === 'low').length;
    const okCount = materials.filter(m => m.status === 'ok').length;

    // Materials that need reordering, with their supplier (most urgent first)
    const reorder = sorted.filter(m => m.status !== 'ok');

    // Focus material for the hero — the tightest one
    const focus = sorted[0] || null;

    const alerts = (alertsRes.data || []).map((a: any) => ({
      alertId: a.alert_id,
      message: a.alert_message,
      materialName: a.raw_materials?.material_name || null,
      status: a.alert_status,
      createdAt: a.created_at,
    }));

    return NextResponse.json({
      materials: sorted,
      focus,
      reorder,
      alerts,
      summary: {
        total: materials.length,
        okCount,
        lowCount,
        criticalCount,
        alertCount: alerts.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
