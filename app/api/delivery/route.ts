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
    const filterDate = searchParams.get('date'); // filter by orders' required_delivery_date

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

    // Get orders per delivery (with required_delivery_date for filtering)
    const deliveryIds = (data || []).map((d: any) => d.delivery_id);
    const { data: orderCounts } = await supabase
      .from('orders')
      .select('delivery_id, order_id, total_amount, required_delivery_date')
      .in('delivery_id', deliveryIds.length > 0 ? deliveryIds : [-1]);

    const countMap: Record<number, { count: number; total: number }> = {};
    // Track which deliveries have orders matching the filter date
    const deliveryHasDateMatch: Set<number> = new Set();
    for (const o of (orderCounts || [])) {
      if (!countMap[o.delivery_id]) countMap[o.delivery_id] = { count: 0, total: 0 };
      countMap[o.delivery_id].count++;
      countMap[o.delivery_id].total += o.total_amount || 0;
      // Check date match
      if (filterDate && o.required_delivery_date) {
        const reqDate = o.required_delivery_date.substring(0, 10);
        if (reqDate === filterDate) deliveryHasDateMatch.add(o.delivery_id);
      }
    }

    let enriched = (data || []).map((d: any) => ({
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

    // If date filter provided, show only deliveries that have orders for that date
    // Also always show active deliveries (OnTheWay, On The Way) regardless of date
    if (filterDate) {
      enriched = enriched.filter((d: any) =>
        deliveryHasDateMatch.has(d.deliveryId) ||
        d.status === 'OnTheWay' || d.status === 'On The Way'
      );
    }

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
