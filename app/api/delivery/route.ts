import { NextRequest, NextResponse } from 'next/server';
import { DeliveryController } from '@/lib/controllers/DeliveryController';
import { Delivery } from '@/lib/models/Delivery';
import { supabase } from '@/lib/db/supabase';

export async function POST(request: NextRequest) {
  try {
    const { deliveryId, signatureFile } = await request.json();

    if (!deliveryId || !signatureFile) {
      return NextResponse.json({ error: 'נדרש מזהה משלוח וחתימה' }, { status: 400 });
    }

    const result = await DeliveryController.completeDelivery(deliveryId, signatureFile);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאה בסגירת המשלוח' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    // Rich query with driver name and vehicle plate
    let query = supabase
      .from('deliveries')
      .select('*, employees(full_name), vehicles(license_plate)')
      .order('created_at', { ascending: false });

    if (driverId) {
      query = query.eq('driver_id', Number(driverId));
    }

    const { data, error } = await query;
    if (error) throw error;

    // Count orders per delivery
    const deliveryIds = (data || []).map((d: any) => d.delivery_id);
    const { data: orderCounts } = await supabase
      .from('orders')
      .select('delivery_id, order_id, total_amount')
      .in('delivery_id', deliveryIds.length > 0 ? deliveryIds : [-1]);

    const countMap: Record<number, { count: number; total: number }> = {};
    for (const o of (orderCounts || [])) {
      if (!countMap[o.delivery_id]) countMap[o.delivery_id] = { count: 0, total: 0 };
      countMap[o.delivery_id].count++;
      countMap[o.delivery_id].total += o.total_amount || 0;
    }

    const enriched = (data || []).map((d: any) => ({
      deliveryId: d.delivery_id,
      driverId: d.driver_id,
      driverName: d.employees?.full_name || `נהג #${d.driver_id}`,
      vehicleId: d.vehicle_id,
      vehiclePlate: d.vehicles?.license_plate || '',
      status: d.status,
      departureTime: d.departure_time,
      arrivalTime: d.arrival_time,
      createdAt: d.created_at,
      orderCount: countMap[d.delivery_id]?.count || 0,
      totalValue: countMap[d.delivery_id]?.total || 0,
    }));

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — update delivery status
// State Diagram transitions:
//   Planned → Assigned (assignDriver)
//   Assigned → Loaded (loadVehicle)
//   Loaded → On The Way (startRoute)
//   any → Failed (reportException)
//   Failed → Planned (rescheduleDelivery)
export async function PATCH(request: NextRequest) {
  try {
    const { deliveryId, newStatus } = await request.json();

    if (!deliveryId || !newStatus) {
      return NextResponse.json({ error: 'נדרש מזהה משלוח וסטטוס חדש' }, { status: 400 });
    }

    const validStatuses = ['Planned', 'Assigned', 'Loaded', 'On The Way', 'Delivered', 'Failed'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `סטטוס לא חוקי: ${newStatus}` }, { status: 400 });
    }

    await Delivery.updateStatus(deliveryId, newStatus);
    return NextResponse.json({ success: true, deliveryId, status: newStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאה בעדכון משלוח' }, { status: 500 });
  }
}
