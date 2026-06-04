import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// PATCH — update produced_quantity for a specific production plan item
export async function PATCH(request: NextRequest) {
  try {
    const { planItemId, producedQuantity } = await request.json();

    if (!planItemId || producedQuantity === undefined || producedQuantity === null) {
      return NextResponse.json({ error: 'נדרש מזהה פריט וכמות שיוצרה' }, { status: 400 });
    }

    if (typeof producedQuantity !== 'number' || producedQuantity < 0) {
      return NextResponse.json({ error: 'כמות לא תקינה' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('production_plan_items')
      .update({ produced_quantity: producedQuantity })
      .eq('plan_item_id', planItemId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, planItemId, producedQuantity: data.produced_quantity });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאה בעדכון כמות ייצור' }, { status: 500 });
  }
}
