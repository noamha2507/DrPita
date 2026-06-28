import { supabase } from '../db/supabase';

// [תרשים מחלקות] ManagementReport — דוחות ניהול — מצרף נתונים ממספר טבלאות.
export class ManagementReport {
  reportId: number;
  reportType: string;
  generatedDate: string;
  content: string;

  constructor(data: Partial<ManagementReport> & { reportId: number }) {
    this.reportId = data.reportId;
    this.reportType = data.reportType || '';
    this.generatedDate = data.generatedDate || new Date().toISOString();
    this.content = data.content || '';
  }

  static async generateOrdersReport(): Promise<any> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(business_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  }

  static async generateProductionReport(): Promise<any> {
    const { data, error } = await supabase
      .from('production_plans')
      .select('*, items:production_plan_items(*, product:products(product_name))')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  }
}
