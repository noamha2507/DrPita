import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// GET — list all raw materials with supplier info
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*, suppliers(supplier_name, phone)')
      // מים מגיעים מהברז ואינם פריט מלאי נרכש/נספר — מוסתרים ממסך המלאי (נשארים במתכון/BOM לצורך FR2)
      .neq('material_name', 'מים')
      .order('material_id', { ascending: true });
    if (error) throw error;

    const materials = (data || []).map((m: any) => ({
      materialId: m.material_id,
      materialName: m.material_name,
      unit: m.unit,
      currentQuantity: m.current_quantity,
      minimumThreshold: m.minimum_threshold,
      supplierName: m.suppliers?.supplier_name || null,
      supplierPhone: m.suppliers?.phone || null,
      isLow: m.current_quantity <= m.minimum_threshold * 1.5,
      isCritical: m.current_quantity <= m.minimum_threshold,
    }));

    // Open shortage alerts raised when a production plan couldn't proceed
    // for lack of materials — surfaces exactly what's missing and how much
    // to reorder, right on the inventory screen.
    const { data: alertsData } = await supabase
      .from('inventory_alerts')
      .select('*, raw_materials(material_name, unit)')
      .eq('alert_status', 'New')
      .order('created_at', { ascending: false });

    const alerts = (alertsData || []).map((a: any) => ({
      alertId: a.alert_id,
      materialId: a.material_id,
      materialName: a.raw_materials?.material_name || '',
      unit: a.raw_materials?.unit || '',
      message: a.alert_message,
      createdAt: a.created_at,
    }));

    return NextResponse.json({ materials, alerts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — update stock quantity (receive materials from supplier)
export async function PATCH(request: NextRequest) {
  try {
    const { materialId, addQuantity } = await request.json();
    if (!materialId || addQuantity === undefined) {
      return NextResponse.json({ error: 'נדרש מזהה חומר וכמות' }, { status: 400 });
    }

    // Get current quantity
    const { data: current, error: getErr } = await supabase
      .from('raw_materials')
      .select('current_quantity')
      .eq('material_id', materialId)
      .single();
    if (getErr) throw getErr;

    const newQty = (current.current_quantity || 0) + addQuantity;

    const { error } = await supabase
      .from('raw_materials')
      .update({ current_quantity: newQty })
      .eq('material_id', materialId);
    if (error) throw error;

    return NextResponse.json({ success: true, materialId, newQuantity: newQty });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
