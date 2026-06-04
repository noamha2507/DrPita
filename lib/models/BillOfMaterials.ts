import { supabase } from '../db/supabase';

export class BillOfMaterials {
  bomId: number;
  productId: number;
  materialId: number;
  requiredAmount: number;
  unit: string;

  constructor(data: Partial<BillOfMaterials> & { bomId: number }) {
    this.bomId = data.bomId;
    this.productId = data.productId || 0;
    this.materialId = data.materialId || 0;
    this.requiredAmount = data.requiredAmount || 0;
    this.unit = data.unit || '';
  }

  // CD method
  calculateRequiredAmount(quantity: number): number {
    return this.requiredAmount * quantity;
  }

  // SD2 message #4: getRequiredMaterials(approvedOrdersItems)
  static async getRequiredMaterials(approvedOrdersItems: { productId: number; quantity: number }[]): Promise<{ materialId: number; requiredAmount: number }[]> {
    const productIds = [...new Set(approvedOrdersItems.map(i => i.productId))];
    const { data: bomEntries, error } = await supabase
      .from('bill_of_materials')
      .select('product_id, material_id, required_amount')
      .in('product_id', productIds);
    if (error) throw error;

    const materialTotals = new Map<number, number>();

    for (const item of approvedOrdersItems) {
      const recipes = (bomEntries || []).filter((b: any) => b.product_id === item.productId);
      for (const recipe of recipes) {
        const current = materialTotals.get(recipe.material_id) || 0;
        materialTotals.set(recipe.material_id, current + recipe.required_amount * item.quantity);
      }
    }

    return Array.from(materialTotals.entries()).map(([materialId, requiredAmount]) => ({
      materialId,
      requiredAmount,
    }));
  }
}
