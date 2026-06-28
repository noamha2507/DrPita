import { supabase } from '../db/supabase';
import { DeliveryStatus } from '../enums';

// [תרשים מחלקות] Delivery — משלוח — נסגר ב-FR3 · טבלה: deliveries.
export class Delivery {
  deliveryId: number;
  driverId: number;
  vehicleId: number;
  departureTime: string | null;
  arrivalTime: string | null;
  status: DeliveryStatus;

  constructor(data: Partial<Delivery> & { deliveryId: number }) {
    this.deliveryId = data.deliveryId;
    this.driverId = data.driverId || 0;
    this.vehicleId = data.vehicleId || 0;
    this.departureTime = data.departureTime || null;
    this.arrivalTime = data.arrivalTime || null;
    this.status = data.status || DeliveryStatus.Planned;
  }

  // CD method
  markAsShipped(): void {
    this.status = DeliveryStatus.OnTheWay;
  }

  // CD method
  markAsDelivered(): void {
    this.status = DeliveryStatus.Delivered;
    this.arrivalTime = new Date().toISOString();
  }

  // CD method
  async getAssignedOrders(): Promise<any[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('delivery_id', this.deliveryId);
    if (error) throw error;
    return data || [];
  }

  // SD3 message #3: getDeliveryDetails(deliveryId)
  static async getDeliveryDetails(deliveryId: number): Promise<any> {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        driver:employees(full_name),
        vehicle:vehicles(license_plate)
      `)
      .eq('delivery_id', deliveryId)
      .single();
    if (error) throw error;
    return data;
  }

  // SD3 message #6: updateStatus(deliveryId, status)
  static async updateStatus(deliveryId: number, status: string): Promise<void> {
    const updateData: any = { status };
    if (status === 'Delivered') {
      updateData.arrival_time = new Date().toISOString();
    }
    const { error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('delivery_id', deliveryId);
    if (error) throw error;
  }

  static async findByDriver(driverId: number): Promise<Delivery[]> {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => new Delivery({
      deliveryId: d.delivery_id,
      driverId: d.driver_id,
      vehicleId: d.vehicle_id,
      departureTime: d.departure_time,
      arrivalTime: d.arrival_time,
      status: d.status as DeliveryStatus,
    }));
  }

  static async findAll(): Promise<Delivery[]> {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => new Delivery({
      deliveryId: d.delivery_id,
      driverId: d.driver_id,
      vehicleId: d.vehicle_id,
      departureTime: d.departure_time,
      arrivalTime: d.arrival_time,
      status: d.status as DeliveryStatus,
    }));
  }
}
