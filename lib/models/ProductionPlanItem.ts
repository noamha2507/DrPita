import { supabase } from '../db/supabase';

export class ProductionPlanItem {
  planItemId: number;
  planId: number;
  productId: number;
  plannedQuantity: number;
  producedQuantity: number;

  constructor(data: Partial<ProductionPlanItem> & { planItemId: number }) {
    this.planItemId = data.planItemId;
    this.planId = data.planId || 0;
    this.productId = data.productId || 0;
    this.plannedQuantity = data.plannedQuantity || 0;
    this.producedQuantity = data.producedQuantity || 0;
  }

  // SD2 message #9: createProductionPlanItem(planId, productId, plannedQty)
  static async createProductionPlanItem(planId: number, productId: number, plannedQty: number): Promise<void> {
    const { error } = await supabase
      .from('production_plan_items')
      .insert({
        plan_id: planId,
        product_id: productId,
        planned_quantity: plannedQty,
      });
    if (error) throw error;
  }

  static async findByPlanId(planId: number): Promise<ProductionPlanItem[]> {
    const { data, error } = await supabase
      .from('production_plan_items')
      .select('*')
      .eq('plan_id', planId);
    if (error) throw error;
    return (data || []).map((d: any) => new ProductionPlanItem({
      planItemId: d.plan_item_id,
      planId: d.plan_id,
      productId: d.product_id,
      plannedQuantity: d.planned_quantity,
      producedQuantity: d.produced_quantity,
    }));
  }
}
