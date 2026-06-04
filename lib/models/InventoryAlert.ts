import { supabase } from '../db/supabase';

export class InventoryAlert {
  alertId: number;
  materialId: number;
  alertMessage: string;
  alertStatus: string;
  createdAt: string;

  constructor(data: Partial<InventoryAlert> & { alertId: number }) {
    this.alertId = data.alertId;
    this.materialId = data.materialId || 0;
    this.alertMessage = data.alertMessage || '';
    this.alertStatus = data.alertStatus || 'New';
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  async resolveAlert(): Promise<void> {
    const { error } = await supabase
      .from('inventory_alerts')
      .update({ alert_status: 'Resolved' })
      .eq('alert_id', this.alertId);
    if (error) throw error;
    this.alertStatus = 'Resolved';
  }

  static async createAlert(materialId: number, message: string): Promise<number> {
    const { data, error } = await supabase
      .from('inventory_alerts')
      .insert({ material_id: materialId, alert_message: message })
      .select('alert_id')
      .single();
    if (error) throw error;
    return data.alert_id;
  }
}
