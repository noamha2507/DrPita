import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');
    if (!deliveryId) return NextResponse.json({ error: 'נדרש מזהה משלוח' }, { status: 400 });

    const id = Number(deliveryId);

    // 1. Delivery with driver + vehicle info
    const { data: delivery, error: dErr } = await supabase
      .from('deliveries')
      .select('*, employees(full_name), vehicles(license_plate, max_capacity)')
      .eq('delivery_id', id)
      .single();
    if (dErr) throw dErr;

    // 2. Orders in this delivery with customer info
    const { data: orders } = await supabase
      .from('orders')
      .select('*, customers(business_name, phone, email, address)')
      .eq('delivery_id', id)
      .order('order_id', { ascending: true });

    const orderIds = (orders || []).map((o: any) => o.order_id);

    // 3. Order items with product names
    let allItems: any[] = [];
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('*, products(product_name)')
        .in('order_id', orderIds);
      allItems = items || [];
    }

    // 4. Aggregate products across all orders
    const productAgg: Record<number, { productName: string; totalQty: number; orderCount: Set<number> }> = {};
    for (const item of allItems) {
      const pid = item.product_id;
      if (!productAgg[pid]) {
        productAgg[pid] = {
          productName: item.products?.product_name || `מוצר #${pid}`,
          totalQty: 0,
          orderCount: new Set(),
        };
      }
      productAgg[pid].totalQty += item.quantity;
      productAgg[pid].orderCount.add(item.order_id);
    }

    const products = Object.values(productAgg).map(p => ({
      productName: p.productName,
      totalQuantity: p.totalQty,
      orderCount: p.orderCount.size,
    }));

    // Items per order — needed to print a delivery note for a single business
    const itemsByOrder: Record<number, { productName: string; quantity: number; unitPrice: number }[]> = {};
    for (const item of allItems) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({
        productName: item.products?.product_name || `מוצר #${item.product_id}`,
        quantity: item.quantity,
        unitPrice: item.unit_price_at_sale,
      });
    }

    // 5. Build route stops from unique customers
    const stops = (orders || []).map((o: any, i: number) => ({
      stopNumber: i + 1,
      orderId: o.order_id,
      customerName: o.customers?.business_name || '',
      address: o.customers?.address || '',
      phone: o.customers?.phone || '',
      email: o.customers?.email || '',
      orderAmount: o.total_amount,
      orderStatus: o.status,
      requiredDate: o.required_delivery_date,
    }));

    // 6. Delivery notes for this delivery
    const { data: notes } = await supabase
      .from('delivery_notes')
      .select('*')
      .eq('delivery_id', id);

    const totalValue = (orders || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

    // Determine route label from first customer's address
    const { AutoAssignmentService } = await import('@/lib/services/AutoAssignmentService');
    const firstAddress = (orders || [])[0]?.customers?.address || '';
    const routeLabel = AutoAssignmentService.getRouteLabel(AutoAssignmentService.getRouteKeyFromAddress(firstAddress));

    return NextResponse.json({
      delivery: {
        deliveryId: delivery.delivery_id,
        status: delivery.status,
        driverName: delivery.employees?.full_name || `נהג #${delivery.driver_id}`,
        driverId: delivery.driver_id,
        vehiclePlate: delivery.vehicles?.license_plate || '',
        vehicleCapacity: delivery.vehicles?.max_capacity || 0,
        departureTime: delivery.departure_time,
        arrivalTime: delivery.arrival_time,
        createdAt: delivery.created_at,
        orderCount: (orders || []).length,
        customerCount: new Set((orders || []).map((o: any) => o.customer_id)).size,
        totalValue,
        routeLabel,
      },
      orders: (orders || []).map((o: any) => ({
        orderId: o.order_id,
        customerName: o.customers?.business_name || '',
        address: o.customers?.address || '',
        phone: o.customers?.phone || '',
        status: o.status,
        totalAmount: o.total_amount,
        requiredDate: o.required_delivery_date,
        items: itemsByOrder[o.order_id] || [],
      })),
      stops,
      products,
      deliveryNotes: (notes || []).map((n: any) => ({
        noteId: n.note_id,
        orderId: n.order_id,
        signerName: n.signer_name,
        digitalSignature: n.digital_signature,
        createdAt: n.created_at,
        sentToEmail: n.sent_to_email,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
