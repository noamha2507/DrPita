import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// POST — create a new delivery and assign unassigned orders for a specific date
export async function POST(request: NextRequest) {
  try {
    const { driverId, vehicleId, deliveryDate } = await request.json();

    if (!driverId || !vehicleId || !deliveryDate) {
      return NextResponse.json({ error: 'נדרש נהג, רכב ותאריך' }, { status: 400 });
    }

    // Find approved orders for this delivery date that have no delivery_id
    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('order_id')
      .eq('status', 'Approved')
      .is('delivery_id', null)
      .gte('required_delivery_date', deliveryDate + 'T00:00:00')
      .lt('required_delivery_date', deliveryDate + 'T23:59:59');

    if (ordErr) throw ordErr;

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'אין הזמנות לא משויכות לתאריך זה' }, { status: 400 });
    }

    // Create the delivery
    const { data: delivery, error: delErr } = await supabase
      .from('deliveries')
      .insert({
        driver_id: driverId,
        vehicle_id: vehicleId,
        status: 'Planned',
      })
      .select('delivery_id')
      .single();

    if (delErr) throw delErr;

    // Assign orders to this delivery
    const orderIds = orders.map((o: any) => o.order_id);
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ delivery_id: delivery.delivery_id })
      .in('order_id', orderIds);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      deliveryId: delivery.delivery_id,
      assignedOrders: orderIds.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
