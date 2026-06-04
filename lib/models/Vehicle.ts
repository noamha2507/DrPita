import { supabase } from '../db/supabase';

export class Vehicle {
  vehicleId: number;
  licensePlate: string;
  maxCapacity: number;
  isAvailable: boolean;

  constructor(data: Partial<Vehicle> & { vehicleId: number }) {
    this.vehicleId = data.vehicleId;
    this.licensePlate = data.licensePlate || '';
    this.maxCapacity = data.maxCapacity || 0;
    this.isAvailable = data.isAvailable ?? true;
  }

  async assignToDelivery(): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .update({ is_available: false })
      .eq('vehicle_id', this.vehicleId);
    if (error) throw error;
    this.isAvailable = false;
  }

  async releaseFromDelivery(): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .update({ is_available: true })
      .eq('vehicle_id', this.vehicleId);
    if (error) throw error;
    this.isAvailable = true;
  }

  static async findAvailable(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_available', true);
    if (error) throw error;
    return (data || []).map((d: any) => new Vehicle({
      vehicleId: d.vehicle_id,
      licensePlate: d.license_plate,
      maxCapacity: d.max_capacity,
      isAvailable: d.is_available,
    }));
  }
}
