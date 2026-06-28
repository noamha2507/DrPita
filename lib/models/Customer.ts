import { supabase } from '../db/supabase';
import { CustomerStatus } from '../enums';

// [תרשים מחלקות] Customer — לקוח — בדיקת אשראי ב-FR1, מייל ב-FR3 · טבלה: customers.
export class Customer {
  customerId: number;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  currentBalance: number;
  status: CustomerStatus;

  constructor(data: Partial<Customer> & { customerId: number }) {
    this.customerId = data.customerId;
    this.businessName = data.businessName || '';
    this.phone = data.phone || '';
    this.email = data.email || '';
    this.address = data.address || '';
    this.creditLimit = data.creditLimit || 0;
    this.currentBalance = data.currentBalance || 0;
    this.status = data.status || CustomerStatus.Active;
  }

  // CD method
  async updateCreditLimit(newLimit: number): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ credit_limit: newLimit })
      .eq('customer_id', this.customerId);
    if (error) throw error;
    this.creditLimit = newLimit;
  }

  // CD method
  async getOrderHistory(): Promise<any[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', this.customerId)
      .order('order_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // CD method
  getStatus(): CustomerStatus {
    return this.status;
  }

  // SD1 message #4: checkCreditLimit(customerId)
  static async checkCreditLimit(customerId: number): Promise<{ approved: boolean; creditLimit: number; currentBalance: number }> {
    const { data, error } = await supabase
      .from('customers')
      .select('credit_limit, current_balance, status')
      .eq('customer_id', customerId)
      .single();
    if (error) throw error;
    if (!data) throw new Error('Customer not found');
    return {
      approved: data.status === 'Active' && data.current_balance < data.credit_limit,
      creditLimit: data.credit_limit,
      currentBalance: data.current_balance,
    };
  }

  // SD3 message: getCustomerEmailByDelivery(deliveryId)
  static async getCustomerEmailByDelivery(deliveryId: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('customer:customers(email)')
      .eq('delivery_id', deliveryId);
    if (error) throw error;
    const emails = [...new Set((data || []).map((d: any) => d.customer?.email).filter(Boolean))];
    return emails;
  }

  static async findById(customerId: number): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', customerId)
      .single();
    if (error) return null;
    return new Customer({
      customerId: data.customer_id,
      businessName: data.business_name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      creditLimit: data.credit_limit,
      currentBalance: data.current_balance,
      status: data.status as CustomerStatus,
    });
  }

  static async findAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('status', 'Active');
    if (error) throw error;
    return (data || []).map((d: any) => new Customer({
      customerId: d.customer_id,
      businessName: d.business_name,
      phone: d.phone,
      email: d.email,
      address: d.address,
      creditLimit: d.credit_limit,
      currentBalance: d.current_balance,
      status: d.status as CustomerStatus,
    }));
  }
}
