import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// GET — production-worker home dashboard.
// Production plans are shared across the bakery (not assigned per worker),
// so this reflects the floor's production state.
//
// Business rule (from the domain): a production plan runs on the NIGHT OF its
// plan_date — the night before delivery. Production is therefore a one-night
// event, not an open-ended state. So the badge shown to the worker is derived
// from plan_date relative to today, NOT taken verbatim from the stored status:
//   plan_date in the future → "מתוכנן" (not produced yet)
//   plan_date is today       → "בייצור" (running tonight)
//   plan_date in the past     → its night passed → "הושלם"
// Stored status still governs the WaitingForMaterials / Cancelled cases, and
// the controllers / State diagram are unchanged — this is a presentation layer.

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const isInProgress = (s: string) => s === 'In Progress' || s === 'InProgress';
const isWaiting = (s: string) => s === 'Waiting For Materials' || s === 'WaitingForMaterials';
const isCancelled = (s: string) => s === 'Cancelled';

// Today's date in Israel time (Vercel runs in UTC), as 'YYYY-MM-DD' for safe
// lexical comparison with the stored plan_date strings.
function israelToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

// Where a plan sits relative to its production night.
function cycleOf(planDate: string, today: string): 'past' | 'today' | 'future' {
  const d = (planDate || '').slice(0, 10);
  if (d < today) return 'past';
  if (d > today) return 'future';
  return 'today';
}

// Display status derived from the production-night rule.
function displayStatusOf(dbStatus: string, cycle: 'past' | 'today' | 'future'): string {
  if (isCancelled(dbStatus)) return 'Cancelled';
  if (isWaiting(dbStatus)) return 'Waiting For Materials';
  if (dbStatus === 'Completed') return 'Completed';
  if (isInProgress(dbStatus)) {
    if (cycle === 'future') return 'Planned';
    if (cycle === 'today') return 'In Progress';
    return 'Completed'; // past production night → its run is over
  }
  return dbStatus;
}

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
    const today = israelToday();

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
      const cycle = cycleOf(pl.plan_date, today);
      return {
        planId: pl.plan_id, status: pl.status, planDate: pl.plan_date, createdAt: pl.created_at,
        cycle, displayStatus: displayStatusOf(pl.status, cycle),
        label: `יום ${dayName}, ${dateStr}`,
        plannedUnits: agg.planned, producedUnits: agg.produced, itemCount: agg.count,
        products: agg.products,
      };
    };

    const rows = plans.map(mkRow);
    const byDateDesc = (a: any, b: any) => new Date(b.planDate).getTime() - new Date(a.planDate).getTime();
    const byDateAsc = (a: any, b: any) => new Date(a.planDate).getTime() - new Date(b.planDate).getTime();

    // "Open" = needs attention now: running tonight, or a current/upcoming plan
    // still waiting for materials. Past nights are no longer open.
    const openTonightProd = rows.filter(r => r.displayStatus === 'In Progress');
    const openWaiting = rows.filter(r => r.displayStatus === 'Waiting For Materials' && r.cycle !== 'past');
    const upcoming = rows.filter(r => r.displayStatus === 'Planned').sort(byDateAsc);
    const open = [...openTonightProd, ...openWaiting];

    const completed = rows.filter(r => r.displayStatus === 'Completed').sort(byDateDesc);

    // Focus for the hero, by relevance to "now":
    //   tonight's run → tonight's blocked plan → next upcoming → most recent past
    const focus =
      openTonightProd[0] ||
      openWaiting.sort(byDateAsc)[0] ||
      upcoming[0] ||
      completed[0] ||
      null;

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

    // Stats — overall produced vs planned (real recorded output, honest numbers)
    const nonCancelled = rows.filter(r => !isCancelled(r.status));
    const sumK = (arr: any[], k: 'plannedUnits' | 'producedUnits') => arr.reduce((s, r) => s + (r[k] || 0), 0);
    const totalPlanned = sumK(nonCancelled, 'plannedUnits');
    const totalProduced = sumK(nonCancelled, 'producedUnits');

    // This month's recorded production
    const monthAgo = Date.now() - 30 * 86400000;
    const inMonth = nonCancelled.filter(r => new Date(r.planDate).getTime() >= monthAgo);

    const strip = (r: any) => { const { products, ...rest } = r; return rest; };

    return NextResponse.json({
      today,
      focus: focus ? strip(focus) : null,
      focusMaterials,
      open: open.map(strip),
      upcoming: upcoming.map(strip),
      recentPlans,
      totals: {
        openCount: open.length,
        upcomingCount: upcoming.length,
        completedCount: completed.length,
        totalPlans: rows.length,
      },
      stats: {
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
