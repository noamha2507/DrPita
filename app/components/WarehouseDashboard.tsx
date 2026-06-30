'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconInventory, IconAlertTriangle, IconCheck, IconCircleFull,
  IconPhone, IconClock,
} from './Icons';

interface MaterialRow {
  materialId: number;
  name: string;
  unit: string;
  current: number;
  minimum: number;
  recommended: number;
  coverage: number;
  status: 'critical' | 'low' | 'ok';
  supplierName: string | null;
  supplierPhone: string | null;
}

interface AlertRow {
  alertId: number;
  message: string;
  materialName: string | null;
  status: string;
  createdAt: string;
}

interface WarehouseData {
  materials: MaterialRow[];
  focus: MaterialRow | null;
  reorder: MaterialRow[];
  alerts: AlertRow[];
  summary: { total: number; okCount: number; lowCount: number; criticalCount: number; alertCount: number };
}

interface Props {
  user: { username: string; employeeId: number; fullName?: string };
}

const statusLabel: Record<string, string> = { critical: 'קריטי', low: 'נמוך', ok: 'תקין' };
const statusColor: Record<string, string> = { critical: 'var(--ht-danger)', low: '#daa555', ok: 'var(--ht-success)' };

// ============================================================================
// Reusable visual primitives (same look as the production / driver dashboards)
// ============================================================================

function StatTile({ value, label, icon, tone = 'neutral' }: {
  value: React.ReactNode; label: string; icon: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneColor = tone === 'good' ? 'var(--ht-success)'
    : tone === 'warn' ? '#daa555'
    : tone === 'bad' ? 'var(--ht-danger)'
    : 'var(--ht-accent)';
  return (
    <div className="rounded-xl p-4 relative overflow-hidden" style={{
      background: 'var(--ht-surface)', border: '1px solid var(--ht-border)',
    }}>
      <div className="absolute -top-3 -end-3 opacity-10" style={{ color: toneColor }}>
        <span style={{ fontSize: '64px', display: 'block' }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color: toneColor }}>{value}</p>
      <p className="text-xs opacity-60 mt-1 relative z-10">{label}</p>
    </div>
  );
}

// Stock gauge: fill = current vs the recommended level (3× minimum), with a
// marker at the minimum threshold so the worker sees the safety line.
function StockGauge({ m }: { m: MaterialRow }) {
  const max = Math.max(m.recommended, m.current, 1);
  const fillPct = Math.min(100, Math.round((m.current / max) * 100));
  const minPct = Math.min(100, Math.round((m.minimum / max) * 100));
  const color = statusColor[m.status];
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium flex items-center gap-2">
          {m.name}
          <span style={{ color, fontSize: '10px', fontWeight: 700 }}>· {statusLabel[m.status]}</span>
        </span>
        <span className="opacity-60 tabular-nums">
          <bdi dir="ltr">{m.current.toLocaleString()}</bdi> {m.unit}
          <span className="opacity-50"> · סף <bdi dir="ltr">{m.minimum.toLocaleString()}</bdi></span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--ht-surface-container)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(fillPct, 3)}%`, background: color, transition: 'width 1s ease-out' }}></div>
        {/* minimum threshold marker */}
        <div className="absolute top-0 bottom-0" style={{ insetInlineStart: `${minPct}%`, width: '2px', background: 'var(--ht-on-surface)', opacity: 0.35 }}></div>
      </div>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function WarehouseDashboard({ user }: Props) {
  const [data, setData] = useState<WarehouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/warehouse/dashboard')
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

  const { summary, reorder, alerts } = data;
  const needsOrder = summary.criticalCount + summary.lowCount;

  return (
    <div className="space-y-4">

      {/* =====================================================================
          HERO — adapts to overall stock health
          A: critical materials → reorder needed now
          B: low materials      → approaching threshold
          C: all OK             → stock healthy
          ===================================================================== */}

      {summary.criticalCount > 0 ? (
        <div className="rounded-xl overflow-hidden relative" style={{
          background: 'linear-gradient(135deg, var(--ht-danger) 0%, #7a1f1f 100%)',
        }}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
          }}></div>
          <div className="relative p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative inline-flex">
                <span className="absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 animate-ping" style={{ background: '#fff' }}></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: '#fff' }}></span>
              </span>
              <span className="text-[11px] font-bold tracking-widest uppercase opacity-90">דרושה הזמנת חומרים</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {summary.criticalCount} חומרים מתחת לסף המינימום
            </h2>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.85)' }}>
              יש להזמין מהספקים בהקדם כדי לא לעצור את הייצור.
            </p>
            <button onClick={() => router.push('/inventory')}
              className="px-5 py-3 rounded-xl font-bold text-sm transition-all w-full sm:w-auto flex items-center justify-center gap-2"
              style={{ background: '#fff', color: 'var(--ht-danger)' }}>
              <IconInventory size={16} /> פתח את מסך המלאי
            </button>
          </div>
        </div>
      ) : summary.lowCount > 0 ? (
        <div className="rounded-xl p-5 relative" style={{ background: 'var(--ht-warning-bg)', border: '1px solid var(--ht-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: '#daa555' }}><IconAlertTriangle size={14} /></span>
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-50">חומרים מתקרבים לסף</span>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ht-primary)' }}>
            {summary.lowCount} חומרים בכמות נמוכה
          </h2>
          <p className="text-sm mb-4 opacity-70">כדאי לתכנן הזמנה מהספקים לפני שיירדו מתחת לסף.</p>
          <button onClick={() => router.push('/inventory')} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            פתח את מסך המלאי
          </button>
        </div>
      ) : (
        <div className="rounded-xl p-6 flex items-center gap-4" style={{ background: 'var(--ht-success-bg)', border: '1px solid var(--ht-border)' }}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--ht-success)' }}>
            <IconCheck size={26} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--ht-success)' }}>המלאי תקין</p>
            <p className="text-sm opacity-60 mt-0.5">כל {summary.total} החומרים מעל סף המינימום. אין צורך בהזמנה כעת.</p>
          </div>
        </div>
      )}

      {/* =====================================================================
          STATUS KPIs — 3 visual tiles
          ===================================================================== */}

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          value={<bdi dir="ltr">{summary.okCount}</bdi>}
          label="חומרים תקינים"
          icon={<IconCheck size={64} />}
          tone={summary.okCount > 0 ? 'good' : 'neutral'}
        />
        <StatTile
          value={<bdi dir="ltr">{summary.lowCount}</bdi>}
          label="כמות נמוכה"
          icon={<IconAlertTriangle size={64} />}
          tone={summary.lowCount > 0 ? 'warn' : 'neutral'}
        />
        <StatTile
          value={<bdi dir="ltr">{summary.criticalCount}</bdi>}
          label="מתחת לסף"
          icon={<IconInventory size={64} />}
          tone={summary.criticalCount > 0 ? 'bad' : 'neutral'}
        />
      </div>

      {/* =====================================================================
          STOCK LEVELS — every material with a gauge vs. its minimum line
          ===================================================================== */}

      <div className="rounded-xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-1.5 opacity-80">
            <IconInventory size={14} /> מצב המלאי
          </h3>
          <span className="text-xs opacity-40">{summary.total} חומרי גלם</span>
        </div>
        <div className="space-y-3.5">
          {data.materials.map(m => (
            <button key={m.materialId} onClick={() => router.push('/inventory')}
              className="w-full text-start block">
              <StockGauge m={m} />
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          REORDER — materials to order, with supplier contact
          ===================================================================== */}

      {reorder.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
          <h3 className="text-sm font-bold mb-3 opacity-80">להזמנה מהספק</h3>
          <div className="space-y-2">
            {reorder.map(m => (
              <div key={m.materialId} className="p-3 rounded-xl flex items-center gap-3"
                style={{ background: 'var(--ht-surface-container)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: statusColor[m.status], color: '#fff' }}>
                  <IconInventory size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--ht-primary)' }}>{m.name}</p>
                  <p className="text-xs opacity-60 truncate">
                    {m.supplierName || 'ללא ספק'}
                    {m.supplierPhone && <> · <bdi dir="ltr" className="font-mono">{m.supplierPhone}</bdi></>}
                  </p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs font-bold tabular-nums" style={{ color: statusColor[m.status] }}>
                    <bdi dir="ltr">{m.current.toLocaleString()}</bdi> / <bdi dir="ltr">{m.minimum.toLocaleString()}</bdi> {m.unit}
                  </p>
                  {m.supplierPhone && (
                    <span className="text-[10px] opacity-50 flex items-center gap-1 justify-end mt-0.5">
                      <IconPhone size={10} /> חייגו לספק
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          INVENTORY ALERTS (open)
          ===================================================================== */}

      {alerts.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5 opacity-80">
            <IconAlertTriangle size={14} /> התראות מלאי פתוחות
          </h3>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.alertId} className="p-3 rounded-xl flex items-start gap-3"
                style={{ background: 'var(--ht-warning-bg)', border: '1px solid var(--ht-border)' }}>
                <span className="mt-0.5 shrink-0" style={{ color: '#daa555' }}><IconClock size={14} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{a.message}</p>
                  {a.materialName && <p className="text-xs opacity-50 mt-0.5">{a.materialName}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUMMARY FOOTER
          ===================================================================== */}

      <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
        <div className="flex items-center gap-2 text-sm">
          <IconCircleFull size={8} color={needsOrder > 0 ? '#daa555' : 'var(--ht-success)'} />
          <span className="opacity-70">
            {needsOrder > 0
              ? `${needsOrder} חומרים דורשים הזמנה`
              : 'כל המלאי מעל סף המינימום'}
          </span>
        </div>
        <span className="text-xs opacity-40">{summary.total} חומרי גלם · {summary.alertCount} התראות</span>
      </div>
    </div>
  );
}
