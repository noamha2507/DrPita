import { NextResponse } from 'next/server';
import { Product } from '@/lib/models/Product';

export async function GET() {
  try {
    const products = await Product.findAll();
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
