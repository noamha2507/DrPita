import { NextRequest, NextResponse } from 'next/server';
import { InventoryAlert } from '@/lib/models/InventoryAlert';

// PATCH — mark a shortage alert as resolved (e.g. after reordering the material)
export async function PATCH(request: NextRequest) {
  try {
    const { alertId } = await request.json();
    if (!alertId) {
      return NextResponse.json({ error: 'נדרש מזהה התראה' }, { status: 400 });
    }

    await new InventoryAlert({ alertId }).resolveAlert();
    return NextResponse.json({ success: true, alertId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאה בעדכון ההתראה' }, { status: 500 });
  }
}
