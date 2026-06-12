'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStatusBadgeStyle } from './styles';
import {
  IconDelivery, IconRoute, IconCheck, IconClock, IconMapPin,
  IconUser, IconOrders,
} from './Icons';

const statusLabels: Record<string, string> = {
  Planned: 'מתוכנן',
  Assigned: 'שויך',
  Loaded: 'נטען',
  'On The Way': 'בדרך',
  OnTheWay: 'בדרך',
  Delivered: 'נמסר',
  Failed: 'נכשל',
};

interface DeliveryRow {
  deliveryId: number;
  status: string;
  vehiclePlate: string;
  vehicleId: number;
  deliveryDate: string | null;
  routeLabel: string;
  stopCount: number;
  totalValue: number;
  customers: { name: string; address: string }[];
  departureTime: string | null;
  arrivalTime: string | null;
}

interface DriverData {
  currentActive: DeliveryRow | null;
  nextUp: DeliveryRow | null;
  today: DeliveryRow[];
  weekSchedule: Array<{
    date: string;
    dayName: string;
    count: number;
    statusBreakdown: Record<string, number>;
  }>;
  stats: {
    week: { scheduled: number; delivered: number };
    month: { scheduled: number; delivered: number };
    lifetime: { delivered: number; failed: number; successRate: number };
  };
  vehiclePreference: { plate: string; count: number } | null;
}

interface Props {
  user: { username: string; employeeId: number; fullName?: string };
}

function getFirstName(full?: string): string {
  if (!full) return '';
  return full.split(' ')[0] || full;
}

// ============================================================================
// Reusable visual primitives
// ============================================================================

function StatTile({
  value,
  label,
  icon,
  tone = 'neutral',
}: {
  value: React.ReactNode;
  label: string;
  icon: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const toneColor = tone === 'good' ? 'var(--ht-success)'
    : tone === 'warn' ? '#daa555'
    : 'var(--ht-accent)';
  return (
    <div className="rounded-2xl p-4 relative overflow-hidden" style={{
      background: 'var(--ht-surface)',
      border: '1px solid var(--ht-border)',
    }}>
      <div className="absolute -top-3 -end-3 opacity-10" style={{ color: toneColor }}>
        <span style={{ fontSize: '64px', display: 'block' }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color: toneColor }}>
        {value}
      </p>
      <p className="text-xs opacity-60 mt-1 relative z-10">{label}</p>
    </div>
  );
}

function SuccessRing({ percent, delivered, failed }: { percent: number; delivered: number; failed: number }) {
  const radius = 52;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 95 ? '#22c55e' : percent >= 85 ? '#daa555' : '#ef4444';

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--ht-border)" strokeWidth={stroke} />
          <circle
            cx="60" cy="60" r={radius}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>
            {percent}%
          </span>
          <span className="text-[10px] opacity-50">בזמן</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold opacity-50 mb-2">המסירות שלך</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }}></span>
            <span className="opacity-70">נמסרו</span>
            <span className="font-bold ms-auto tabular-nums">{delivered}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }}></span>
            <span className="opacity-70">נכשלו</span>
            <span className="font-bold ms-auto tabular-nums">{failed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekProgressBar({ delivered, scheduled }: { delivered: number; scheduled: number }) {
  const percent = scheduled === 0 ? 0 : Math.round((delivered / scheduled) * 100);
  const color = percent >= 80 ? '#22c55e' : percent >= 50 ? 'var(--ht-accent)' : '#daa555';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs opacity-60">המשלוחים השבוע</p>
        <p className="text-sm font-bold tabular-nums">
          <span style={{ color }}>{delivered}</span>
          <span className="opacity-30"> / {scheduled}</span>
        </p>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--ht-border)' }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(percent, scheduled === 0 ? 0 : 4)}%`, background: color, transition: 'width 1.2s ease-out' }}></div>
      </div>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function DriverDashboard({ user }: Props) {
  const [data, setData] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user?.employeeId) return;
    fetch(`/api/driver/dashboard?driverId=${user.employeeId}`)
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

  const todayStr = new Date().toISOString().split('T')[0];
  const firstName = getFirstName(user.fullName);

  // Compute today aggregates
  const todayCount = data.today.length;
  const todayStops = data.today.reduce((s, d) => s + d.stopCount, 0);
  const todayValue = data.today.reduce((s, d) => s + d.totalValue, 0);

  // Max deliveries in any single day this week — for relative sizing of dots
  const maxDayCount = Math.max(1, ...data.weekSchedule.map(d => d.count));

  return (
    <div className="space-y-4">

      {/* =====================================================================
          HERO — adapts to current state
          State A: Currently driving (Loaded / On The Way)
          State B: Has a delivery today (Planned / Assigned)
          State C: Has a future delivery
          State D: Nothing scheduled
          ===================================================================== */}

      {data.currentActive ? (
        // STATE A — actively driving
        <div className="rounded-2xl overflow-hidden relative" style={{
          background: 'linear-gradient(135deg, var(--ht-accent) 0%, #1a3a6b 100%)',
        }}>
          {/* Decorative grain */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
          }}></div>
          <div className="relative p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative inline-flex">
                <span className="absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 animate-ping" style={{ background: '#fbbf24' }}></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: '#fbbf24' }}></span>
              </span>
              <span className="text-[11px] font-bold tracking-widest uppercase opacity-80">
                עכשיו בדרך
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-2">
              {data.currentActive.routeLabel}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <span className="flex items-center gap-1.5">
                <IconMapPin size={14} /> {data.currentActive.stopCount} תחנות
              </span>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1.5">
                <IconDelivery size={14} /> רכב <bdi dir="ltr" className="font-mono font-bold">{data.currentActive.vehiclePlate}</bdi>
              </span>
              <span className="opacity-30">·</span>
              <span><bdi dir="ltr">{data.currentActive.totalValue.toLocaleString()}</bdi> ₪</span>
            </div>

            <button
              onClick={() => router.push('/delivery')}
              className="px-5 py-3 rounded-xl font-bold text-sm transition-all w-full sm:w-auto flex items-center justify-center gap-2"
              style={{ background: '#fff', color: 'var(--ht-accent)' }}>
              <IconRoute size={16} /> פתח את המשלוח
            </button>
          </div>
        </div>
      ) : data.nextUp ? (
        // STATE B/C — next delivery
        <div className="rounded-2xl p-5 relative" style={{
          background: data.nextUp.deliveryDate === todayStr ? 'var(--ht-info-bg)' : 'var(--ht-surface)',
          border: '1px solid var(--ht-border)',
        }}>
          <div className="flex items-center gap-2 mb-2">
            <IconClock size={14} className="opacity-50" />
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-50">
              {data.nextUp.deliveryDate === todayStr ? 'הבא בתור היום' : 'הבא בתור'}
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ht-primary)' }}>
            {data.nextUp.routeLabel}
          </h2>

          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm opacity-70">
            {data.nextUp.deliveryDate && (
              <>
                <span>
                  {data.nextUp.deliveryDate === todayStr
                    ? 'היום'
                    : new Date(data.nextUp.deliveryDate).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="opacity-30">·</span>
              </>
            )}
            <span className="flex items-center gap-1.5">
              <IconMapPin size={14} /> {data.nextUp.stopCount} תחנות
            </span>
            <span className="opacity-30">·</span>
            <span className="flex items-center gap-1.5">
              <IconDelivery size={14} /> <bdi dir="ltr" className="font-mono">{data.nextUp.vehiclePlate}</bdi>
            </span>
          </div>

          <button
            onClick={() => router.push('/delivery')}
            className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            פתח פרטים
          </button>
        </div>
      ) : (
        // STATE D — nothing to do
        <div className="rounded-2xl p-6 flex items-center gap-4" style={{
          background: 'var(--ht-success-bg)',
          border: '1px solid var(--ht-border)',
        }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--ht-success)' }}>
            <IconCheck size={26} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--ht-success)' }}>הכול ריק</p>
            <p className="text-sm opacity-60 mt-0.5">אין משלוחים פתוחים עכשיו. תיהנה מהשקט.</p>
          </div>
        </div>
      )}

      {/* =====================================================================
          TODAY KPIs — 3 visual tiles
          ===================================================================== */}

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          value={todayCount}
          label="משלוחים היום"
          icon={<IconDelivery size={64} />}
          tone={todayCount > 0 ? 'good' : 'neutral'}
        />
        <StatTile
          value={todayStops}
          label="תחנות לפזר"
          icon={<IconMapPin size={64} />}
          tone="neutral"
        />
        <StatTile
          value={<><bdi dir="ltr">{todayValue.toLocaleString()}</bdi> ₪</>}
          label="סכום היום"
          icon={<IconOrders size={64} />}
          tone="neutral"
        />
      </div>

      {/* =====================================================================
          TODAY LIST (only if there are deliveries)
          ===================================================================== */}

      {data.today.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
          <h3 className="text-sm font-bold mb-3 opacity-80">המשלוחים שלך היום</h3>
          <div className="space-y-2">
            {data.today.map(del => (
              <button
                key={del.deliveryId}
                onClick={() => router.push('/delivery')}
                className="w-full p-3 rounded-xl text-start transition-all flex items-center gap-3"
                style={{ background: 'var(--ht-surface-container)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ht-info-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ht-surface-container)')}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--ht-accent)', color: '#fff' }}>
                  <IconDelivery size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--ht-primary)' }}>{del.routeLabel}</p>
                  <p className="text-xs opacity-60 truncate">
                    {del.stopCount} תחנות · <bdi dir="ltr">{del.totalValue.toLocaleString()}</bdi> ₪
                  </p>
                </div>
                <span style={{ ...getStatusBadgeStyle(del.status), fontSize: '10px', padding: '3px 10px' }}>
                  {statusLabels[del.status] || del.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          WEEKLY SCHEDULE STRIP — visual day-by-day
          ===================================================================== */}

      <div className="rounded-2xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold opacity-80">השבוע</h3>
          <span className="text-xs opacity-40">7 ימים קדימה</span>
        </div>

        <WeekProgressBar delivered={data.stats.week.delivered} scheduled={data.stats.week.scheduled} />

        <div className="grid grid-cols-7 gap-1.5 mt-4">
          {data.weekSchedule.map((day, i) => {
            const isToday = i === 0;
            const isEmpty = day.count === 0;
            const dateNum = new Date(day.date).getDate();
            const intensity = day.count === 0 ? 0 : Math.min(1, day.count / maxDayCount);
            return (
              <div
                key={day.date}
                className="rounded-xl p-2.5 text-center transition-all"
                style={{
                  background: isToday
                    ? 'var(--ht-accent)'
                    : isEmpty
                      ? 'var(--ht-surface-container)'
                      : `rgba(36, 86, 232, ${0.1 + intensity * 0.15})`,
                  border: isToday
                    ? '2px solid var(--ht-accent)'
                    : `1px solid ${isEmpty ? 'var(--ht-border)' : 'rgba(36, 86, 232, 0.25)'}`,
                  color: isToday ? '#fff' : 'var(--ht-on-surface)',
                }}>
                <p className="text-[10px] font-medium opacity-80">{day.dayName}</p>
                <p className="text-xl font-bold tabular-nums my-0.5">{dateNum}</p>
                {isEmpty ? (
                  <p className="text-[10px] opacity-30">—</p>
                ) : (
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {Array.from({ length: Math.min(day.count, 3) }).map((_, idx) => (
                      <span key={idx} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isToday ? '#fff' : 'var(--ht-accent)' }}></span>
                    ))}
                    {day.count > 3 && (
                      <span className="text-[9px] font-bold ms-0.5" style={{ color: isToday ? '#fff' : 'var(--ht-accent)' }}>
                        +{day.count - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SUCCESS RATE RING + MONTH SUMMARY (side by side on desktop)
          ===================================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
          <SuccessRing
            percent={data.stats.lifetime.successRate}
            delivered={data.stats.lifetime.delivered}
            failed={data.stats.lifetime.failed}
          />
        </div>

        <div className="rounded-2xl p-5 flex flex-col justify-between" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
          <p className="text-xs opacity-50 font-bold">החודש הזה</p>
          <div className="flex items-baseline gap-2 my-3">
            <span className="text-5xl font-bold tabular-nums" style={{ color: 'var(--ht-primary)' }}>
              {data.stats.month.delivered}
            </span>
            <span className="text-lg opacity-40">/ {data.stats.month.scheduled}</span>
            <span className="text-sm opacity-60">משלוחים</span>
          </div>
          {data.vehiclePreference && (
            <div className="flex items-center gap-2 text-xs opacity-60 pt-3" style={{ borderTop: '1px solid var(--ht-border)' }}>
              <IconDelivery size={14} />
              <span>הרכב שלך — </span>
              <bdi dir="ltr" className="font-mono font-bold">{data.vehiclePreference.plate}</bdi>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
