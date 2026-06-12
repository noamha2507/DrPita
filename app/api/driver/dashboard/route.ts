import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { getRouteKeyFromAddress, getRouteLabel } from '@/lib/services/RoutePlanner';

/**
 * GET /api/driver/dashboard?driverId=X
 *
 * Returns everything a driver needs on their home screen, in one round-trip:
 *   - currentActive: the delivery they are physically on right now
 *     (Loaded or On The Way), if any
 *   - nextUp: the next Planned/Assigned delivery in time
 *   - today: all of their deliveries for today
 *   - weekSchedule: 7-day count by date
 *   - stats: weekly / monthly / lifetime totals
 *   - vehiclePreference: the vehicle they most frequently drive
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = Number(searchParams.get('driverId'));
    if (!driverId) return NextResponse.json({ error: 'נדרש מזהה נהג' }, { status: 400 });

    // Load ALL deliveries for this driver
    const { data: deliveries, error: delErr } = await supabase
      .from('deliveries')
      .select('*, vehicles(license_plate)')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    if (delErr) throw delErr;

    const deliveryIds = (deliveries || []).map((d: any) => d.delivery_id);

    // Load all orders attached to these deliveries (with customer info)
    const { data: orders } = await supabase
      .from('orders')
      .select('delivery_id, order_id, customer_id, total_amount, required_delivery_date, customers(business_name, address)')
      .in('delivery_id', deliveryIds.length > 0 ? deliveryIds : [-1]);

    // Group orders by delivery
    const ordersByDelivery = new Map<number, any[]>();
    for (const o of orders || []) {
      if (!ordersByDelivery.has(o.delivery_id)) ordersByDelivery.set(o.delivery_id, []);
      ordersByDelivery.get(o.delivery_id)!.push(o);
    }

    // Compute date YYYY-MM-DD helpers
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekStart = new Date(today);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const month = today.getMonth();
    const year = today.getFullYear();

    // Decorate each delivery with: delivery_date (from orders), route label,
    // stop count, total value
    const decorated = (deliveries || []).map((d: any) => {
      const ordersForDel = ordersByDelivery.get(d.delivery_id) || [];
      const firstAddress = ordersForDel[0]?.customers?.address || '';
      const routeLabel = getRouteLabel(getRouteKeyFromAddress(firstAddress));
      const deliveryDate = ordersForDel[0]?.required_delivery_date?.substring(0, 10) || null;
      const totalValue = ordersForDel.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      return {
        deliveryId: d.delivery_id,
        status: d.status,
        vehiclePlate: d.vehicles?.license_plate || '',
        vehicleId: d.vehicle_id,
        createdAt: d.created_at,
        departureTime: d.departure_time,
        arrivalTime: d.arrival_time,
        deliveryDate,
        routeLabel,
        stopCount: ordersForDel.length,
        totalValue,
        customers: ordersForDel.map((o: any) => ({
          name: o.customers?.business_name || '',
          address: o.customers?.address || '',
        })),
      };
    });

    // ===== currentActive — Loaded or On The Way =====
    const currentActive =
      decorated.find(d => d.status === 'Loaded' || d.status === 'On The Way') || null;

    // ===== nextUp — closest future Planned/Assigned =====
    const upcomingActive = decorated
      .filter(d => (d.status === 'Planned' || d.status === 'Assigned') && d.deliveryDate)
      .sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || ''));
    const nextUp = upcomingActive[0] || null;

    // ===== today — every delivery whose deliveryDate is today (any status) =====
    const todayList = decorated.filter(d => d.deliveryDate === todayStr);

    // ===== weekSchedule — 7-day count starting today =====
    const weekSchedule: Array<{ date: string; dayName: string; count: number; statusBreakdown: Record<string, number> }> = [];
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dels = decorated.filter(x => x.deliveryDate === dateStr);
      const breakdown: Record<string, number> = {};
      for (const del of dels) breakdown[del.status] = (breakdown[del.status] || 0) + 1;
      weekSchedule.push({
        date: dateStr,
        dayName: dayNames[d.getDay()],
        count: dels.length,
        statusBreakdown: breakdown,
      });
    }

    // ===== stats =====
    const inWeek = (dateStr: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= weekStart && d <= weekEnd;
    };
    const inMonth = (dateStr: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === month && d.getFullYear() === year;
    };

    const allDelivered = decorated.filter(d => d.status === 'Delivered');
    const allFailed = decorated.filter(d => d.status === 'Failed');

    const stats = {
      week: {
        scheduled: decorated.filter(d => inWeek(d.deliveryDate)).length,
        delivered: decorated.filter(d => inWeek(d.deliveryDate) && d.status === 'Delivered').length,
      },
      month: {
        scheduled: decorated.filter(d => inMonth(d.deliveryDate)).length,
        delivered: decorated.filter(d => inMonth(d.deliveryDate) && d.status === 'Delivered').length,
      },
      lifetime: {
        delivered: allDelivered.length,
        failed: allFailed.length,
        successRate: allDelivered.length + allFailed.length > 0
          ? Math.round((allDelivered.length / (allDelivered.length + allFailed.length)) * 100)
          : 100,
      },
    };

    // ===== vehiclePreference — most frequent vehicle =====
    const vehicleCounts: Record<string, { plate: string; count: number }> = {};
    for (const d of decorated) {
      if (!d.vehiclePlate) continue;
      if (!vehicleCounts[d.vehiclePlate]) vehicleCounts[d.vehiclePlate] = { plate: d.vehiclePlate, count: 0 };
      vehicleCounts[d.vehiclePlate].count++;
    }
    const vehiclePreference = Object.values(vehicleCounts).sort((a, b) => b.count - a.count)[0] || null;

    return NextResponse.json({
      currentActive,
      nextUp,
      today: todayList,
      weekSchedule,
      stats,
      vehiclePreference,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
