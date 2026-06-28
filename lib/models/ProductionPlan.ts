import { supabase } from '../db/supabase';
import { ProductionPlanStatus } from '../enums';
import { ProductionPlanItem } from './ProductionPlanItem';

// [תרשים מחלקות] ProductionPlan — תוכנית ייצור יומית — FR2 · טבלה: production_plans.
export class ProductionPlan {
  planId: number;
  planDate: string;
  status: ProductionPlanStatus;

  constructor(data: Partial<ProductionPlan> & { planId: number }) {
    this.planId = data.planId;
    this.planDate = data.planDate || '';
    this.status = data.status || ProductionPlanStatus.Draft;
  }

  // CD method
  getStatus(): ProductionPlanStatus {
    return this.status;
  }

  // CD method
  async updateStatus(newStatus: ProductionPlanStatus): Promise<void> {
    const { error } = await supabase
      .from('production_plans')
      .update({ status: newStatus })
      .eq('plan_id', this.planId);
    if (error) throw error;
    this.status = newStatus;
  }

  // SD2 message #8: createProductionPlan(targetDate, status)
  static async createProductionPlan(targetDate: string, status: string): Promise<number> {
    const { data, error } = await supabase
      .from('production_plans')
      .insert({
        plan_date: targetDate,
        status: status,
      })
      .select('plan_id')
      .single();
    if (error) throw error;
    return data.plan_id;
  }

  // Static version of updateStatus for API routes
  static async updateStatusById(planId: number, newStatus: string): Promise<void> {
    const { error } = await supabase
      .from('production_plans')
      .update({ status: newStatus })
      .eq('plan_id', planId);
    if (error) throw error;
  }

  // CD method: addItem(planId, productId, plannedQty)
  // Delegates to ProductionPlanItem.createProductionPlanItem as per Class Diagram
  static async addItem(planId: number, productId: number, plannedQty: number): Promise<void> {
    await ProductionPlanItem.createProductionPlanItem(planId, productId, plannedQty);
  }

  // Find existing plan for a specific date (one plan per day)
  static async findByDate(targetDate: string): Promise<ProductionPlan | null> {
    const { data, error } = await supabase
      .from('production_plans')
      .select('*')
      .eq('plan_date', targetDate)
      .not('status', 'eq', 'Cancelled')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return new ProductionPlan({
      planId: data.plan_id,
      planDate: data.plan_date,
      status: data.status as ProductionPlanStatus,
    });
  }

  static async findAll(): Promise<ProductionPlan[]> {
    const { data, error } = await supabase
      .from('production_plans')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => new ProductionPlan({
      planId: d.plan_id,
      planDate: d.plan_date,
      status: d.status as ProductionPlanStatus,
    }));
  }
}
