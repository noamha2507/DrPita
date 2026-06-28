import { supabase } from '../db/supabase';
import { OrderStatus } from '../enums';

// [תרשים מחלקות] Order — הזמנה — נוצרת ב-FR1, סטטוס מתעדכן ב-FR3 · טבלה: orders.
export class Order {
  orderId: number;
  customerId: number;
  deliveryId: number | null;
  orderDate: string;
  requiredDeliveryDate: string | null;
  status: OrderStatus;
  totalAmount: number;

  constructor(data: Partial<Order> & { orderId: number }) {
    this.orderId = data.orderId;
    this.customerId = data.customerId || 0;
    this.deliveryId = data.deliveryId || null;
    this.orderDate = data.orderDate || new Date().toISOString();
    this.requiredDeliveryDate = data.requiredDeliveryDate || null;
    this.status = data.status || OrderStatus.Draft;
    this.totalAmount = data.totalAmount || 0;
  }

  // CD method
  calculateTotal(): number {
    return this.totalAmount;
  }

  // CD method
  getStatus(): OrderStatus {
    return this.status;
  }

  // CD method
  setStatus(status: OrderStatus): void {
    this.status = status;
  }

  // SD1 message #6: createNewOrder(customerId, totalAmount, status)
  static async createNewOrder(customerId: number, totalAmount: number, status: string, requiredDeliveryDate?: string | null): Promise<number> {
    const insertData: Record<string, any> = {
      customer_id: customerId,
      total_amount: totalAmount,
      status: status,
      order_date: new Date().toISOString(),
    };
    if (requiredDeliveryDate) {
      insertData.required_delivery_date = requiredDeliveryDate;
    }
    const { data, error } = await supabase
      .from('orders')
      .insert(insertData)
      .select('order_id')
      .single();
    if (error) throw error;
    return data.order_id;
  }

  // SD3 message #5: getOrdersByDelivery(deliveryId)
  static async getOrdersByDelivery(deliveryId: number): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('delivery_id', deliveryId);
    if (error) throw error;
    return (data || []).map((d: any) => new Order({
      orderId: d.order_id,
      customerId: d.customer_id,
      deliveryId: d.delivery_id,
      orderDate: d.order_date,
      requiredDeliveryDate: d.required_delivery_date,
      status: d.status as OrderStatus,
      totalAmount: d.total_amount,
    }));
  }

  // SD3 message #7-8: updateStatus(orderId, status) — called in loop for each order
  static async updateStatus(orderId: number, status: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('order_id', orderId);
    if (error) throw error;
  }

  static async findAll(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => new Order({
      orderId: d.order_id,
      customerId: d.customer_id,
      deliveryId: d.delivery_id,
      orderDate: d.order_date,
      requiredDeliveryDate: d.required_delivery_date,
      status: d.status as OrderStatus,
      totalAmount: d.total_amount,
    }));
  }
}
