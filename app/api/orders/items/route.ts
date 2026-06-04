import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'נדרש מספר הזמנה' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('order_items')
      .select(`
        order_item_id,
        order_id,
        product_id,
        quantity,
        unit_price_at_sale,
        products (product_name)
      `)
      .eq('order_id', Number(orderId));

    if (error) throw error;

    const items = (data || []).map((d: any) => ({
      orderItemId: d.order_item_id,
      orderId: d.order_id,
      productId: d.product_id,
      quantity: d.quantity,
      unitPrice: d.unit_price_at_sale,
      productName: d.products?.product_name || '',
    }));

    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
