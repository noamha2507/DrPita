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

    // Same date guard as PATCH — closing a delivery is even more sensitive,
    // it must only happen on the day the goods physically go out.
    const { data: firstOrder } = await supabase
      .from('orders')
      .select('required_delivery_date')
      .eq('delivery_id', deliveryId)
      .limit(1)
      .maybeSingle();

    const requiredDate = (firstOrder as any)?.required_delivery_date?.substring(0, 10);
    if (requiredDate) {
      const today = new Date().toISOString().substring(0, 10);
      if (today < requiredDate) {
        const display = new Date(requiredDate).toLocaleDateString('he-IL', {
          weekday: 'long', day: 'numeric', month: 'long',
        });
        return NextResponse.json(
          { error: `לא ניתן לסגור משלוח לפני יום האספקה (${display}).` },
          { status: 400 }
        );
      }
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

    // Get orders per delivery (with required_delivery_date for filtering + customer for route)
    const deliveryIds = (data || []).map((d: any) => d.delivery_id);
    const { data: orderCounts } = await supabase
      .from('orders')
      .select('delivery_id, order_id, total_amount, required_delivery_date, customers(address)')
      .in('delivery_id', deliveryIds.length > 0 ? deliveryIds : [-1]);

    const countMap: Record<number, { count: number; total: number; firstAddress: string }> = {};
    // Track which deliveries have orders matching the filter date
    const deliveryHasDateMatch: Set<number> = new Set();
    for (const o of (orderCounts || [])) {
      if (!countMap[o.delivery_id]) {
        countMap[o.delivery_id] = {
          count: 0,
          total: 0,
          firstAddress: (o as any).customers?.address || '',
        };
      }
      countMap[o.delivery_id].count++;
      countMap[o.delivery_id].total += o.total_amount || 0;
      // Check date match
      if (filterDate && o.required_delivery_date) {
        const reqDate = o.required_delivery_date.substring(0, 10);
        if (reqDate === filterDate) deliveryHasDateMatch.add(o.delivery_id);
      }
    }

    // Import route resolver
    const { getRouteKeyFromAddress, getRouteLabel } = await import('@/lib/services/RoutePlanner');

    let enriched = (data || []).map((d: any) => {
      const firstAddress = countMap[d.delivery_id]?.firstAddress || '';
      const routeKey = getRouteKeyFromAddress(firstAddress);
      return {
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
        routeLabel: getRouteLabel(routeKey),
      };
    });

    // If a date filter is provided, return ONLY deliveries that have orders
    // for that date. We previously also showed every On The Way delivery
    // regardless of date, but that caused the UI to show a stale delivery
    // (e.g. 5/6 still on the road) on top of a current-day delivery,
    // making it look as if there were two trucks heading to the same
    // customer on the same day.
    if (filterDate) {
      enriched = enriched.filter((d: any) => deliveryHasDateMatch.has(d.deliveryId));
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

    // Business rule: a delivery's status cannot move forward before its
    // scheduled date. The whole lifecycle (Assigned → Loaded → On The Way
    // → Delivered) belongs to the day the goods are actually shipped.
    // The delivery's date is derived from its orders' required_delivery_date.
    const { data: firstOrder } = await supabase
      .from('orders')
      .select('required_delivery_date')
      .eq('delivery_id', deliveryId)
      .limit(1)
      .maybeSingle();

    const requiredDate = (firstOrder as any)?.required_delivery_date?.substring(0, 10);
    if (requiredDate) {
      const today = new Date().toISOString().substring(0, 10);
      if (today < requiredDate) {
        const display = new Date(requiredDate).toLocaleDateString('he-IL', {
          weekday: 'long', day: 'numeric', month: 'long',
        });
        return NextResponse.json(
          { error: `לא ניתן לעדכן את המשלוח לפני יום האספקה (${display}). אפשר לנהל אותו רק ביום עצמו.` },
          { status: 400 }
        );
      }
    }

    await Delivery.updateStatus(deliveryId, newStatus);
    return NextResponse.json({ success: true, deliveryId, status: newStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאה בעדכון משלוח' }, { status: 500 });
  }
}
