import { supabase } from '../db/supabase';

export class RawMaterial {
  materialId: number;
  materialName: string;
  unit: string;
  currentQuantity: number;
  minimumThreshold: number;
  supplierId: number | null;

  constructor(data: Partial<RawMaterial> & { materialId: number }) {
    this.materialId = data.materialId;
    this.materialName = data.materialName || '';
    this.unit = data.unit || '';
    this.currentQuantity = data.currentQuantity || 0;
    this.minimumThreshold = data.minimumThreshold || 0;
    this.supplierId = data.supplierId || null;
  }

  // CD method
  checkStockLevel(): boolean {
    return this.currentQuantity >= this.minimumThreshold;
  }

  // CD method
  async updateQuantity(newQty: number): Promise<void> {
    const { error } = await supabase
      .from('raw_materials')
      .update({ current_quantity: newQty })
      .eq('material_id', this.materialId);
    if (error) throw error;
    this.currentQuantity = newQty;
  }

  // SD2 message #5: verifyPhysicalStock(requiredMaterialsList)
  static async verifyPhysicalStock(requiredMaterialsList: { materialId: number; requiredAmount: number }[]): Promise<{ materialId: number; materialName: string; currentQty: number; requiredQty: number; sufficient: boolean }[]> {
    const materialIds = requiredMaterialsList.map(m => m.materialId);
    const { data, error } = await supabase
      .from('raw_materials')
      .select('material_id, material_name, current_quantity, unit')
      .in('material_id', materialIds);
    if (error) throw error;

    return requiredMaterialsList.map(req => {
      const mat = (data || []).find((m: any) => m.material_id === req.materialId);
      return {
        materialId: req.materialId,
        materialName: mat?.material_name || 'Unknown',
        currentQty: mat?.current_quantity || 0,
        requiredQty: req.requiredAmount,
        sufficient: (mat?.current_quantity || 0) >= req.requiredAmount,
      };
    });
  }
}
