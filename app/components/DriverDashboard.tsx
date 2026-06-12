'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStatusBadgeStyle } from './styles';
import {
  IconDelivery, IconRoute, IconCheck, IconClock, IconMapPin,
  IconAlertTriangle, IconUser, IconOrders,
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

interface DriverDashboardProps {
  user: { username: string; employeeId: number; full_name?: string };
}

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

export default function DriverDashboard({ user }: DriverDashboardProps) {
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
        <p className="text-sm opacity-50 mt-3">טוען את הנתונים שלך...</p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-center opacity-50 py-12">לא הצלחנו לטעון נתונים</p>;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5">

      {/* ====== 1. CURRENT ACTIVE DELIVERY (highest priority) ====== */}
      {data.currentActive && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--ht-accent) 0%, #1a3a6b 100%)' }}>
          <div className="p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#fbbf24' }}></span>
                <span className="text-xs font-bold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  אתה כרגע במשלוח
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(255,255,255,0.2)' }}>
                {statusLabels[data.currentActive.status] || data.currentActive.status}
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{data.currentActive.routeLabel}</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {data.currentActive.stopCount} תחנות · רכב <bdi dir="ltr">{data.currentActive.vehiclePlate}</bdi>
            </p>
            <button
              onClick={() => router.push('/delivery')}
              className="mt-4 px-5 py-2.5 rounded-xl font-bold text-sm transition-all w-full sm:w-auto"
              style={{ background: '#fff', color: 'var(--ht-accent)' }}>
              פתח את המשלוח ←
            </button>
          </div>
        </div>
      )}

      {/* ====== 2. NEXT UP (if no active, show what's next) ====== */}
      {!data.currentActive && data.nextUp && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <IconClock size={16} className="opacity-50" />
            <span className="text-xs font-bold tracking-wider uppercase opacity-50">המשלוח הבא שלך</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold" style={{ color: 'var(--ht-primary)' }}>{data.nextUp.routeLabel}</h3>
              <p className="text-sm opacity-60 mt-1">
                {data.nextUp.deliveryDate && (
                  <>
                    {data.nextUp.deliveryDate === todayStr ? 'היום' : new Date(data.nextUp.deliveryDate).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' · '}
                  </>
                )}
                {data.nextUp.stopCount} תחנות · רכב <bdi dir="ltr">{data.nextUp.vehiclePlate}</bdi>
              </p>
            </div>
            <button
              onClick={() => router.push('/delivery')}
              className="btn-primary px-4 py-2 text-sm whitespace-nowrap">
              צפה בפירוט
            </button>
          </div>
        </div>
      )}

      {/* No active and no upcoming */}
      {!data.currentActive && !data.nextUp && (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--ht-success-bg)', border: '1px solid var(--ht-border)' }}>
          <IconCheck size={32} className="mx-auto" />
          <p className="text-base font-bold mt-2" style={{ color: 'var(--ht-success)' }}>אין משלוחים פעילים</p>
          <p className="text-sm opacity-60 mt-1">כל המשלוחים שלך הושלמו או שלא שובץ עדיין משלוח חדש</p>
        </div>
      )}

      {/* ====== 3. TODAY'S DELIVERIES ====== */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-primary)' }}>
            <IconDelivery size={18} /> המשלוחים שלך היום
          </h3>
          <span className="text-xs opacity-50">
            {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        {data.today.length === 0 ? (
          <p className="text-sm text-center opacity-40 py-6">אין משלוחים מתוכננים להיום</p>
        ) : (
          <>
            {/* Today's KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--ht-surface-container)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--ht-accent)' }}>{data.today.length}</p>
                <p className="text-xs opacity-50">משלוחים</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--ht-surface-container)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--ht-accent)' }}>
                  {data.today.reduce((s, d) => s + d.stopCount, 0)}
                </p>
                <p className="text-xs opacity-50">תחנות</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--ht-surface-container)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--ht-accent)' }}>
                  <bdi dir="ltr">{data.today.reduce((s, d) => s + d.totalValue, 0).toLocaleString()}</bdi> ₪
                </p>
                <p className="text-xs opacity-50">ערך כולל</p>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2">
              {data.today.map(del => (
                <button
                  key={del.deliveryId}
                  onClick={() => router.push('/delivery')}
                  className="w-full p-3 rounded-xl text-start transition-all hover:shadow-md flex items-center gap-3"
                  style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--ht-accent)', color: '#fff' }}>
                    <IconDelivery size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--ht-primary)' }}>{del.routeLabel}</p>
                    <p className="text-xs opacity-60 truncate">
                      {del.stopCount} תחנות · <bdi dir="ltr">{del.totalValue.toLocaleString()}</bdi> ₪
                    </p>
                  </div>
                  <span style={{ ...getStatusBadgeStyle(del.status), fontSize: '10px', padding: '2px 8px' }}>
                    {statusLabels[del.status] || del.status}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ====== 4. WEEK SCHEDULE ====== */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
        <h3 className="text-base font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--ht-primary)' }}>
          <IconClock size={18} /> השבוע הקרוב
        </h3>
        <div className="grid grid-cols-7 gap-1.5">
          {data.weekSchedule.map((day, i) => {
            const isToday = i === 0;
            const isEmpty = day.count === 0;
            const dateNum = new Date(day.date).getDate();
            return (
              <div
                key={day.date}
                className="rounded-xl p-2.5 text-center transition-all"
                style={{
                  background: isToday ? 'var(--ht-accent)' : isEmpty ? 'var(--ht-surface-container)' : 'var(--ht-info-bg)',
                  border: isToday ? '2px solid var(--ht-accent)' : '1px solid var(--ht-border)',
                  color: isToday ? '#fff' : 'var(--ht-on-surface)',
                }}>
                <p className="text-[10px] opacity-70 font-medium">{day.dayName}</p>
                <p className="text-lg font-bold tabular-nums my-0.5">{dateNum}</p>
                <p className={`text-xs font-bold ${isEmpty ? 'opacity-30' : ''}`}>
                  {isEmpty ? '—' : day.count}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] opacity-40 text-center mt-3">המספר מציין כמה משלוחים שובצו לך ביום זה</p>
      </div>

      {/* ====== 5. PERSONAL STATS ====== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
          <p className="text-xs opacity-50 mb-1">השבוע</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--ht-primary)' }}>{data.stats.week.delivered}<span className="text-base opacity-40 font-normal">/{data.stats.week.scheduled}</span></p>
          <p className="text-xs opacity-50 mt-1">משלוחים שנמסרו</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
          <p className="text-xs opacity-50 mb-1">החודש</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--ht-primary)' }}>{data.stats.month.delivered}<span className="text-base opacity-40 font-normal">/{data.stats.month.scheduled}</span></p>
          <p className="text-xs opacity-50 mt-1">משלוחים שנמסרו</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
          <p className="text-xs opacity-50 mb-1">אחוז הצלחה</p>
          <p className="text-3xl font-bold" style={{ color: data.stats.lifetime.successRate >= 90 ? 'var(--ht-success)' : 'var(--ht-accent)' }}>
            {data.stats.lifetime.successRate}%
          </p>
          <p className="text-xs opacity-50 mt-1">{data.stats.lifetime.delivered} נמסרו · {data.stats.lifetime.failed} נכשלו</p>
        </div>
      </div>

      {/* ====== 6. VEHICLE (bottom info card) ====== */}
      {data.vehiclePreference && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--ht-surface)' }}>
            <IconDelivery size={18} />
          </div>
          <div className="flex-1">
            <p className="text-xs opacity-50">רכב מועדף</p>
            <p className="text-sm font-bold" dir="ltr" style={{ color: 'var(--ht-primary)' }}>{data.vehiclePreference.plate}</p>
          </div>
          <span className="text-xs opacity-40">נהוג בו <bdi dir="ltr">{data.vehiclePreference.count}</bdi> פעמים</span>
        </div>
      )}
    </div>
  );
}
