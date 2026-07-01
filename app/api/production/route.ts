import { NextRequest, NextResponse } from 'next/server';
import { ProductionController } from '@/lib/controllers/ProductionController';
import { ProductionPlan } from '@/lib/models/ProductionPlan';
import { ProductionPlanStatus } from '@/lib/enums';
import { AutoAssignmentService } from '@/lib/services/AutoAssignmentService';

export async function POST(request: NextRequest) {
  try {
    const { targetDate } = await request.json();

    if (!targetDate) {
      return NextResponse.json({ error: 'נדרש תאריך יעד' }, { status: 400 });
    }

    const result = await ProductionController.generatePlan(targetDate);
    if (result.status === 'Waiting For Materials') {
      await AutoAssignmentService.createShortageAlerts(targetDate, result.missingMaterials);
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאה בהפקת תוכנית ייצור' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const plans = await ProductionPlan.findAll();
    return NextResponse.json(plans);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — update production plan status
// State Diagram transitions:
//   WaitingForMaterials → InProgress (restockMaterials)
//   WaitingForMaterials → Cancelled (cancelPlan)
//   InProgress → Completed (finishProduction)
//   InProgress → Cancelled (cancelPlan)
export async function PATCH(request: NextRequest) {
  try {
    const { planId, newStatus } = await request.json();

    if (!planId || !newStatus) {
      return NextResponse.json({ error: 'נדרש מזהה תוכנית וסטטוס חדש' }, { status: 400 });
    }

    // Validate the newStatus is a valid ProductionPlanStatus value
    const validStatuses = Object.values(ProductionPlanStatus);
    if (!validStatuses.includes(newStatus as ProductionPlanStatus)) {
      return NextResponse.json({ error: `סטטוס לא חוקי: ${newStatus}` }, { status: 400 });
    }

    await ProductionPlan.updateStatusById(planId, newStatus);
    return NextResponse.json({ success: true, planId, status: newStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאה בעדכון תוכנית' }, { status: 500 });
  }
}
