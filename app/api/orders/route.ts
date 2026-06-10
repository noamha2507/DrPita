import { NextRequest, NextResponse } from 'next/server';
import { OrderController } from '@/lib/controllers/OrderController';
import { AutoAssignmentService } from '@/lib/services/AutoAssignmentService';
import { supabase } from '@/lib/db/supabase';

export async function POST(request: NextRequest) {
  try {
    const { customerId, itemsList, requiredDeliveryDate } = await request.json();

    if (!customerId || !itemsList || itemsList.length === 0) {
      return NextResponse.json({ error: 'נדרש לקוח ופריטים' }, { status: 400 });
    }

    // SD1: processOrder
    const result = await OrderController.processOrder(customerId, itemsList, requiredDeliveryDate || null);

    // Automation layer — runs after order is approved (does not change SDs)
    // Auto-attaches the order to:
    //   1. Production plan for the delivery date (created/updated)
    //   2. Active delivery for that date (created if none exists)
    if (result.success && result.orderId) {
      const automation = await AutoAssignmentService.runAfterOrderCreated(
        result.orderId,
        requiredDeliveryDate || null
      );
      return NextResponse.json({ ...result, automation });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאה בעיבוד ההזמנה' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        order_id,
        customer_id,
        delivery_id,
        order_date,
        required_delivery_date,
        status,
        total_amount,
        customers (business_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const orders = (data || []).map((d: any) => ({
      orderId: d.order_id,
      customerId: d.customer_id,
      deliveryId: d.delivery_id,
      orderDate: d.order_date,
      requiredDeliveryDate: d.required_delivery_date,
      status: d.status,
      totalAmount: d.total_amount,
      businessName: d.customers?.business_name || '',
    }));

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
