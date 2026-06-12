import { NextResponse } from 'next/server';
import { AutoAssignmentService } from '@/lib/services/AutoAssignmentService';

/**
 * POST — Run consolidation across every upcoming delivery date.
 * Idempotent and safe to call repeatedly. The delivery page calls this
 * once on mount so any stale uncorrected data from before the
 * consolidation logic existed gets cleaned up.
 */
export async function POST() {
  try {
    const result = await AutoAssignmentService.consolidateAllUpcoming();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
