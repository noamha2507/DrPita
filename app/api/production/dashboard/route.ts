import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// GET — production-worker home dashboard.
// Production plans are shared across the bakery (not assigned per worker),
// so this reflects the floor's production state: what's in production now,
// what's waiting for materials, and how much has been produced.

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const isInProgress = (s: string) => s === 'In Progress' || s === 'InProgress';
const isWaiting = (s: string) => s === 'Waiting For Materials' || s === 'WaitingForMaterials';
const isCompleted = (s: string) => s === 'Completed';

export async function GET() {
  try {
    const [plansRes, itemsRes, bomRes] = await Promise.all([
      supabase.from('production_plans').select('plan_id, status, plan_date, created_at'),
      supabase.from('production_plan_items').select('plan_id, product_id, planned_quantity, produced_quantity'),
      supabase.from('bill_of_materials').select('product_id, material_id, required_amount, raw_materials(material_name, current_quantity, unit)'),
    ]);

    const plans = plansRes.data || [];
    const items = itemsRes.data || [];
    const bom = bomRes.data || [];

    // Aggregate planned/produced units per plan + planned units per product
    const byPlan: Record<number, { planned: number; produced: number; count: number; products: Record<number, number> }> = {};
    for (const it of items) {
      const p = byPlan[it.plan_id] || (byPlan[it.plan_id] = { planned: 0, produced: 0, count: 0, products: {} });
      p.planned += it.planned_quantity || 0;
      p.produced += it.produced_quantity || 0;
      p.count += 1;
      p.products[it.product_id] = (p.products[it.product_id] || 0) + (it.planned_quantity || 0);
    }

    const mkRow = (pl: any) => {
      const agg = byPlan[pl.plan_id] || { planned: 0, produced: 0, count: 0, products: {} };
      const date = new Date(pl.plan_date);
      const dayName = dayNames[date.getDay()];
      const dateStr = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
      return {
        planId: pl.plan_id, status: pl.status, planDate: pl.plan_date, createdAt: pl.created_at,
        label: `יום ${dayName}, ${dateStr}`,
        plannedUnits: agg.planned, producedUnits: agg.produced, itemCount: agg.count,
        products: agg.products,
      };
    };

    const rows = plans.map(mkRow);
    const byDateDesc = (a: any, b: any) => new Date(b.planDate).getTime() - new Date(a.planDate).getTime();

    const active = rows.filter(r => isInProgress(r.status)).sort(byDateDesc);
    const waiting = rows.filter(r => isWaiting(r.status)).sort(byDateDesc);
    const completed = rows.filter(r => isCompleted(r.status)).sort(byDateDesc);

    // Focus plan for the hero: prefer the work in progress, then what's waiting,
    // then the most recently completed.
    const focus = active[0] || waiting[0] || completed[0] || null;

    // Raw-material readiness for the focus plan: BOM × planned units vs. current
    // stock. Water is excluded (comes from the tap, not a counted stock item).
    let focusMaterials: any[] = [];
    if (focus) {
      const mats: Record<number, { name: string; required: number; current: number; unit: string }> = {};
      for (const [pidStr, qty] of Object.entries(focus.products)) {
        const pid = Number(pidStr);
        for (const b of bom.filter((x: any) => x.product_id === pid)) {
          const rm: any = b.raw_materials;
          if (!rm || rm.material_name === 'מים') continue;
          if (!mats[b.material_id]) mats[b.material_id] = { name: rm.material_name, required: 0, current: rm.current_quantity || 0, unit: rm.unit || '' };
          mats[b.material_id].required += (b.required_amount || 0) * (qty as number);
        }
      }
      focusMaterials = Object.values(mats).map(m => ({
        name: m.name, unit: m.unit,
        required: Math.round(m.required * 100) / 100,
        current: m.current,
        sufficient: m.current >= m.required,
        shortage: m.current < m.required ? Math.round((m.required - m.current) * 100) / 100 : 0,
      }));
    }

    // Recent production strip — last 7 plans by date
    const recentPlans = [...rows].sort(byDateDesc).slice(0, 7).map(({ products, ...r }) => r);

    // Stats — units produced/planned in the last 7 / 30 days, and overall completion
    const now = Date.now();
    const DAY = 86400000;
    const sinceWeek = now - 7 * DAY;
    const sinceMonth = now - 30 * DAY;
    const inWindow = rows.filter(r => new Date(r.planDate).getTime() >= sinceWeek);
    const inMonth = rows.filter(r => new Date(r.planDate).getTime() >= sinceMonth);
    const sumK = (arr: any[], k: 'plannedUnits' | 'producedUnits') => arr.reduce((s, r) => s + (r[k] || 0), 0);

    const totalPlanned = sumK(rows, 'plannedUnits');
    const totalProduced = sumK(rows, 'producedUnits');

    return NextResponse.json({
      focus: focus ? (({ products, ...r }) => r)(focus) : null,
      focusMaterials,
      active: active.map(({ products, ...r }) => r),
      waiting: waiting.map(({ products, ...r }) => r),
      recentPlans,
      totals: {
        activeCount: active.length,
        waitingCount: waiting.length,
        completedCount: completed.length,
        totalPlans: rows.length,
      },
      stats: {
        week: { planned: sumK(inWindow, 'plannedUnits'), produced: sumK(inWindow, 'producedUnits') },
        month: { planned: sumK(inMonth, 'plannedUnits'), produced: sumK(inMonth, 'producedUnits') },
        lifetime: {
          produced: totalProduced,
          planned: totalPlanned,
          completionRate: totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0,
          completedPlans: completed.length,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
