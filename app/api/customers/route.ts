import { NextRequest, NextResponse } from 'next/server';
import { Customer } from '@/lib/models/Customer';
import { supabase } from '@/lib/db/supabase';

export async function GET() {
  try {
    const customers = await Customer.findAll();
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { businessName, phone, email, address, creditLimit } = await request.json();

    if (!businessName || !phone) {
      return NextResponse.json({ error: 'שם העסק וטלפון הם שדות חובה' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_name: businessName,
        phone: phone,
        email: email || '',
        address: address || '',
        credit_limit: creditLimit || 0,
        current_balance: 0,
        status: 'Active',
      })
      .select('customer_id')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, customerId: data.customer_id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאה ביצירת לקוח' }, { status: 500 });
  }
}
