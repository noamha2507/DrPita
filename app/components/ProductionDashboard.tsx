'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStatusBadgeStyle } from './styles';
import {
  IconProduction, IconGear, IconCheck, IconClock,
  IconInventory, IconAlertTriangle,
} from './Icons';

const statusLabels: Record<string, string> = {
  Draft: 'טיוטה',
  'In Progress': 'בייצור',
  InProgress: 'בייצור',
  'Waiting For Materials': 'ממתין לחומרים',
  WaitingForMaterials: 'ממתין לחומרים',
  Completed: 'הושלם',
  Cancelled: 'בוטל',
  AwaitingProduction: 'ממתין לייצור',
};

interface PlanRow {
  planId: number;
  status: string;
  displayStatus: string;
  cycle: 'past' | 'today' | 'future';
  planDate: string;
  label: string;
  plannedUnits: number;
  producedUnits: number;
  itemCount: number;
}

interface MaterialRow {
  name: string;
  unit: string;
  required: number;
  current: number;
  sufficient: boolean;
  shortage: number;
}

interface ProductionData {
  today: string;
  focus: PlanRow | null;
  focusMaterials: MaterialRow[];
  open: PlanRow[];
  upcoming: PlanRow[];
  recentPlans: PlanRow[];
  totals: { openCount: number; upcomingCount: number; completedCount: number; totalPlans: number };
  stats: {
    month: { planned: number; produced: number };
    lifetime: { produced: number; planned: number; completionRate: number; completedPlans: number };
  };
}

interface Props {
  user: { username: string; employeeId: number; fullName?: string };
}

// ============================================================================
// Reusable visual primitives (same look as the driver dashboard)
// ============================================================================

function StatTile({ value, label, icon, tone = 'neutral' }: {
  value: React.ReactNode; label: string; icon: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const toneColor = tone === 'good' ? 'var(--ht-success)'
    : tone === 'warn' ? '#daa555'
    : 'var(--ht-accent)';
  return (
    <div className="ht-card p-4 relative overflow-hidden">
      <div className="absolute -top-3 -end-3 opacity-10" style={{ color: toneColor }}>
        <span style={{ fontSize: '64px', display: 'block' }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color: toneColor }}>{value}</p>
      <p className="text-xs opacity-60 mt-1 relative z-10">{label}</p>
    </div>
  );
}

function CompletionRing({ percent, done, total }: { percent: number; done: number; total: number }) {
  const radius = 52;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 95 ? '#22c55e' : percent >= 70 ? 'var(--ht-accent)' : '#daa555';
  const open = Math.max(0, total - done);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--ht-border)" strokeWidth={stroke} />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>{percent}%</span>
          <span className="text-[10px] opacity-50">הושלמו</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold opacity-50 mb-2">ימי ייצור</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }}></span>
            <span className="opacity-70">הושלמו</span>
            <span className="font-bold ms-auto tabular-nums"><bdi dir="ltr">{done}</bdi></span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ht-border)' }}></span>
            <span className="opacity-70">לא הושלמו</span>
            <span className="font-bold ms-auto tabular-nums"><bdi dir="ltr">{open}</bdi></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function ProductionDashboard({ user }: Props) {
  const [data, setData] = useState<ProductionData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/production/dashboard')
      .then(r => r.json())
      .then(d => { if (d && !d.error) setData(d); })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div>
        <p className="text-sm opacity-50 mt-3">רגע, טוען...</p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-center opacity-50 py-12">לא הצלחנו לטעון נתונים. תרענן את הדף.</p>;
  }

  const { focus, focusMaterials } = data;
  const remaining = focus ? Math.max(0, focus.plannedUnits - focus.producedUnits) : 0;
  const shortMaterials = focusMaterials.filter(m => !m.sufficient);
  const { openCount, upcomingCount, completedCount, totalPlans } = data.totals;
  // Lifecycle completion (production NIGHTS done), not produced_quantity — the
  // latter isn't tracked here, so a unit ratio would understate reality.
  const planCompletion = totalPlans > 0 ? Math.round((completedCount / totalPlans) * 100) : 0;

  // Hero framing follows the production-night rule (see API): only tonight's run
  // is "בייצור". Future = upcoming, past = the last run that already happened.
  const heroTonight = focus && focus.cycle === 'today' && focus.displayStatus === 'In Progress';
  const heroWaiting = focus && focus.cycle === 'today' && focus.displayStatus === 'Waiting For Materials';
  const heroUpcoming = focus && focus.cycle === 'future';

  return (
    <div className="space-y-4">

      {/* =====================================================================
          HERO — framed by the production-night rule
          A: tonight's run (plan_date = today, In Progress) → "בייצור הלילה"
          B: tonight's plan blocked on materials             → "ממתין לחומרים"
          C: an upcoming plan (future date)                  → "הייצור הקרוב"
          D: only past runs                                   → "הייצור האחרון"
          ===================================================================== */}

      {!focus ? (
        // No plans at all
        <div className="ht-card p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--ht-border)' }}>
            <IconProduction size={26} />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--ht-primary)' }}>אין תוכניות ייצור</p>
            <p className="text-sm opacity-60 mt-0.5">תוכנית ייצור מופקת מההזמנות המאושרות, לליל הייצור שלפני האספקה.</p>
          </div>
        </div>
      ) : heroTonight ? (
        // STATE A — running tonight
        <div className="rounded-xl overflow-hidden relative" style={{
          background: 'linear-gradient(135deg, var(--ht-accent) 0%, #1a3a6b 100%)',
        }}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
          }}></div>
          <div className="relative p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative inline-flex">
                <span className="absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 animate-ping" style={{ background: '#fbbf24' }}></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: '#fbbf24' }}></span>
              </span>
              <span className="text-[11px] font-bold tracking-widest uppercase opacity-80">בייצור הלילה</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">{focus.label}</h2>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <span className="flex items-center gap-1.5">
                <IconProduction size={14} /> <bdi dir="ltr">{focus.plannedUnits.toLocaleString()}</bdi> פיתות לייצור
              </span>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1.5">
                <IconCheck size={14} /> <bdi dir="ltr">{focus.producedUnits.toLocaleString()}</bdi> יוצרו
              </span>
              <span className="opacity-30">·</span>
              <span><bdi dir="ltr">{remaining.toLocaleString()}</bdi> נותרו</span>
            </div>
            <button onClick={() => router.push('/production')}
              className="px-5 py-3 rounded-xl font-bold text-sm transition-all w-full sm:w-auto flex items-center justify-center gap-2"
              style={{ background: '#fff', color: 'var(--ht-accent)' }}>
              <IconGear size={16} /> פתח את תוכנית הייצור
            </button>
          </div>
        </div>
      ) : heroWaiting ? (
        // STATE B — tonight's plan blocked on materials
        <div className="rounded-xl p-5 relative" style={{ background: 'var(--ht-warning-bg)', border: '1px solid var(--ht-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <IconClock size={14} className="opacity-50" />
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-50">ממתין לחומרי גלם — הלילה</span>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ht-primary)' }}>{focus.label}</h2>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm opacity-70">
            <span className="flex items-center gap-1.5">
              <IconProduction size={14} /> <bdi dir="ltr">{focus.plannedUnits.toLocaleString()}</bdi> פיתות לייצור
            </span>
            {shortMaterials.length > 0 && (
              <>
                <span className="opacity-30">·</span>
                <span style={{ color: 'var(--ht-warning)' }}>{shortMaterials.length} חומרים חסרים</span>
              </>
            )}
          </div>
          <button onClick={() => router.push('/production')} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            פתח פרטים
          </button>
        </div>
      ) : heroUpcoming ? (
        // STATE C — an upcoming production night
        <div className="rounded-xl p-5 relative" style={{ background: 'var(--ht-info-bg)', border: '1px solid var(--ht-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <IconClock size={14} className="opacity-50" />
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-50">הייצור הקרוב</span>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ht-primary)' }}>{focus.label}</h2>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm opacity-70">
            <span className="flex items-center gap-1.5">
              <IconProduction size={14} /> <bdi dir="ltr">{focus.plannedUnits.toLocaleString()}</bdi> פיתות מתוכננות
            </span>
            <span className="opacity-30">·</span>
            <span>הייצור מתבצע בליל ה-{focus.label.replace('יום ', '').replace(/^[^,]+, /, '')}</span>
          </div>
          <button onClick={() => router.push('/production')} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            פתח פרטים
          </button>
        </div>
      ) : (
        // STATE D — only past runs; show the most recent one as history, no "now"
        <div className="ht-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: 'var(--ht-success)' }}><IconCheck size={14} /></span>
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-50">הייצור האחרון</span>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ht-primary)' }}>{focus.label}</h2>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm opacity-70">
            <span className="flex items-center gap-1.5">
              <IconProduction size={14} /> <bdi dir="ltr">{focus.plannedUnits.toLocaleString()}</bdi> פיתות
            </span>
            <span className="opacity-30">·</span>
            <span className="flex items-center gap-1.5">
              <span style={{ ...getStatusBadgeStyle('Completed'), fontSize: '10px', padding: '1px 8px' }}>הושלם</span>
            </span>
          </div>
          <p className="text-xs opacity-50 mb-3">הייצור מתבצע בלילה שלפני האספקה — ליל הייצור של תוכנית זו כבר עבר.</p>
          <button onClick={() => router.push('/production')} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            פתח לוח ייצור
          </button>
        </div>
      )}

      {/* =====================================================================
          FOCUS KPIs — 3 visual tiles
          ===================================================================== */}

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          value={<bdi dir="ltr">{(focus?.plannedUnits || 0).toLocaleString()}</bdi>}
          label={focus?.cycle === 'future' ? 'פיתות בתוכנית הקרובה' : focus?.cycle === 'today' ? 'פיתות לייצור הלילה' : 'פיתות בייצור האחרון'}
          icon={<IconProduction size={64} />}
          tone="neutral"
        />
        <StatTile
          value={<bdi dir="ltr">{completedCount.toLocaleString()}</bdi>}
          label="ימי ייצור שהושלמו"
          icon={<IconCheck size={64} />}
          tone={completedCount > 0 ? 'good' : 'neutral'}
        />
        <StatTile
          value={<bdi dir="ltr">{(openCount + upcomingCount).toLocaleString()}</bdi>}
          label="פתוחים / קרובים"
          icon={<IconGear size={64} />}
          tone={openCount > 0 ? 'warn' : 'neutral'}
        />
      </div>

      {/* =====================================================================
          MATERIALS READINESS — what the focus plan needs vs. current stock
          (water excluded — it comes from the tap)
          ===================================================================== */}

      {focusMaterials.length > 0 && (
        <div className="ht-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-1.5 opacity-80">
              <IconInventory size={14} /> חומרי גלם לתוכנית
            </h3>
            {shortMaterials.length === 0 ? (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ht-success)' }}>
                <IconCheck size={12} /> מספיק לכולם
              </span>
            ) : (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ht-warning)' }}>
                <IconAlertTriangle size={12} /> {shortMaterials.length} חסרים
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {focusMaterials.map((m, i) => {
              const percent = m.required === 0 ? 100 : Math.min(100, Math.round((m.current / m.required) * 100));
              const color = m.sufficient ? 'var(--ht-success)' : 'var(--ht-warning)';
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{m.name}</span>
                    <span className="opacity-60 tabular-nums">
                      <bdi dir="ltr">{m.current.toLocaleString()}</bdi> / <bdi dir="ltr">{m.required.toLocaleString()}</bdi> {m.unit}
                      {!m.sufficient && <span style={{ color: 'var(--ht-warning)' }}> · חסר <bdi dir="ltr">{m.shortage.toLocaleString()}</bdi></span>}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--ht-surface-container)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(percent, 4)}%`, background: color, transition: 'width 1s ease-out' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          ACTIVE / WAITING PLANS LIST
          ===================================================================== */}

      {(data.open.length > 0 || data.upcoming.length > 0) && (
        <div className="ht-card p-5">
          <h3 className="text-sm font-bold mb-3 opacity-80">ייצור פתוח וקרוב</h3>
          <div className="space-y-2">
            {[...data.open, ...data.upcoming].map(pl => {
              const wait = pl.displayStatus === 'Waiting For Materials';
              const planned = pl.displayStatus === 'AwaitingProduction';
              return (
                <button key={pl.planId} onClick={() => router.push('/production')}
                  className="w-full p-3 rounded-xl text-start transition-all flex items-center gap-3"
                  style={{ background: 'var(--ht-surface-container)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ht-info-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ht-surface-container)')}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: wait ? 'var(--ht-warning)' : planned ? 'var(--ht-border)' : 'var(--ht-accent)', color: '#fff' }}>
                    {wait ? <IconClock size={16} /> : <IconProduction size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--ht-primary)' }}>{pl.label}</p>
                    <p className="text-xs opacity-60 truncate">
                      <bdi dir="ltr">{pl.plannedUnits.toLocaleString()}</bdi> פיתות
                      {pl.producedUnits > 0 && <> · <bdi dir="ltr">{pl.producedUnits.toLocaleString()}</bdi> יוצרו</>}
                    </p>
                  </div>
                  <span style={{ ...getStatusBadgeStyle(pl.displayStatus), fontSize: '10px', padding: '3px 10px' }}>
                    {statusLabels[pl.displayStatus] || pl.displayStatus}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          COMPLETION RING + MONTH SUMMARY
          ===================================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="ht-card p-5">
          <CompletionRing percent={planCompletion} done={completedCount} total={totalPlans} />
        </div>

        <div className="ht-card p-5 flex flex-col justify-between">
          <p className="text-xs opacity-50 font-bold">נפח הייצור החודש</p>
          <div className="flex items-baseline gap-2 my-3">
            <span className="text-5xl font-bold tabular-nums" style={{ color: 'var(--ht-primary)' }}>
              <bdi dir="ltr">{data.stats.month.planned.toLocaleString()}</bdi>
            </span>
            <span className="text-sm opacity-60">פיתות מתוכננות</span>
          </div>
          <div className="flex items-center gap-2 text-xs opacity-60 pt-3" style={{ borderTop: '1px solid var(--ht-border)' }}>
            <IconCheck size={14} />
            <span>{completedCount} ימי ייצור הושלמו · {openCount + upcomingCount} פתוחים/קרובים</span>
          </div>
        </div>
      </div>
    </div>
  );
}
