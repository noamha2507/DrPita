import { supabase } from '../db/supabase';

export class OrderItem {
  orderItemId: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPriceAtSale: number;

  constructor(data: Partial<OrderItem> & { orderItemId: number }) {
    this.orderItemId = data.orderItemId;
    this.orderId = data.orderId || 0;
    this.productId = data.productId || 0;
    this.quantity = data.quantity || 0;
    this.unitPriceAtSale = data.unitPriceAtSale || 0;
  }

  // SD1 message #8: addOrderItem(orderId, productId, quantity, unitPrice)
  static async addOrderItem(orderId: number, productId: number, quantity: number, unitPrice: number): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: productId,
        quantity: quantity,
        unit_price_at_sale: unitPrice,
      });
    if (error) throw error;
  }

  // SD2 message #3: getApprovedOrderItems(targetDate)
  static async getApprovedOrderItems(targetDate: string): Promise<any[]> {
    // Filter approved orders whose required_delivery_date matches targetDate
    // or orders with no specific delivery date (available for any plan)
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        order_item_id,
        order_id,
        product_id,
        quantity,
        unit_price_at_sale,
        orders!inner(status, required_delivery_date)
      `)
      .eq('orders.status', 'Approved');
    if (error) throw error;

    // Client-side filter by targetDate: include orders where
    // required_delivery_date is null (any date) or matches targetDate
    const filtered = (data || []).filter((item: any) => {
      const reqDate = item.orders?.required_delivery_date;
      if (!reqDate) return true; // no specific date = available for any plan
      return reqDate.startsWith(targetDate); // match date portion
    });

    return filtered;
  }

  static async findByOrderId(orderId: number): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    if (error) throw error;
    return (data || []).map((d: any) => new OrderItem({
      orderItemId: d.order_item_id,
      orderId: d.order_id,
      productId: d.product_id,
      quantity: d.quantity,
      unitPriceAtSale: d.unit_price_at_sale,
    }));
  }
}
