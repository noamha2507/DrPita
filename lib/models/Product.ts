import { supabase } from '../db/supabase';

// [תרשים מחלקות] Product — מוצר (פיתה) — בדיקת מלאי ב-FR1 · טבלה: products.
export class Product {
  productId: number;
  productName: string;
  basePrice: number;
  isActive: boolean;

  constructor(data: Partial<Product> & { productId: number }) {
    this.productId = data.productId;
    this.productName = data.productName || '';
    this.basePrice = data.basePrice || 0;
    this.isActive = data.isActive ?? true;
  }

  // CD method
  getInventoryLevel(): number {
    // In a real system this would check inventory. For this project,
    // products are always in stock (stock is managed at raw material level).
    return 9999;
  }

  // CD method
  async updateStock(quantity: number): Promise<void> {
    // Stock tracking is at raw material level per BOM
  }

  // SD1 message #3: checkStockAvailability(itemsList)
  static async checkStockAvailability(itemsList: { productId: number; quantity: number }[]): Promise<{ available: boolean; details: any[] }> {
    const productIds = itemsList.map(i => i.productId);
    const { data, error } = await supabase
      .from('products')
      .select('product_id, product_name, is_active')
      .in('product_id', productIds);
    if (error) throw error;

    const details = itemsList.map(item => {
      const product = (data || []).find((p: any) => p.product_id === item.productId);
      return {
        productId: item.productId,
        productName: product?.product_name || 'Unknown',
        requestedQty: item.quantity,
        available: !!product?.is_active,
      };
    });

    return {
      available: details.every(d => d.available),
      details,
    };
  }

  static async findAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return (data || []).map((d: any) => new Product({
      productId: d.product_id,
      productName: d.product_name,
      basePrice: d.base_price,
      isActive: d.is_active,
    }));
  }

  static async findById(productId: number): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', productId)
      .single();
    if (error) return null;
    return new Product({
      productId: data.product_id,
      productName: data.product_name,
      basePrice: data.base_price,
      isActive: data.is_active,
    });
  }
}
