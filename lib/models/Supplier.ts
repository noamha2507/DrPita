import { supabase } from '../db/supabase';

export class Supplier {
  supplierId: number;
  supplierName: string;
  phone: string;
  email: string;

  constructor(data: Partial<Supplier> & { supplierId: number }) {
    this.supplierId = data.supplierId;
    this.supplierName = data.supplierName || '';
    this.phone = data.phone || '';
    this.email = data.email || '';
  }

  async getSuppliedMaterials(): Promise<any[]> {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .eq('supplier_id', this.supplierId);
    if (error) throw error;
    return data || [];
  }

  async updateContactInfo(phone: string, email: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .update({ phone, email })
      .eq('supplier_id', this.supplierId);
    if (error) throw error;
    this.phone = phone;
    this.email = email;
  }
}
