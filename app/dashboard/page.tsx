'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import Logo from '../components/Logo';
import { getStatusBadgeStyle } from '../components/styles';
import { IconOrders, IconProduction, IconDelivery, IconInventory, IconCheck, IconX, IconGear, IconClock, IconRoute, IconCircleFull, IconAlertTriangle } from '../components/Icons';
import DriverDashboard from '../components/DriverDashboard';
import ProductionDashboard from '../components/ProductionDashboard';
import WarehouseDashboard from '../components/WarehouseDashboard';

const roleLabels: Record<string, string> = { Manager: 'מנהל', ProductionWorker: 'עובד ייצור', WarehouseWorker: 'מחסנאי', Driver: 'נהג' };
const statusLabels: Record<string, string> = { Draft: 'טיוטה', Approved: 'מאושרת', Rejected: 'נדחתה', Delivered: 'נמסרה', 'In Progress': 'בייצור', InProgress: 'בייצור', AwaitingProduction: 'ממתין לייצור', 'Waiting For Materials': 'ממתין לחומרים', Completed: 'הושלם', Cancelled: 'בוטל', Planned: 'מתוכנן', 'On The Way': 'בדרך', Failed: 'נכשל' };

// Supabase "timestamp without time zone" values arrive without a 'Z' but
// are UTC — append 'Z' so they aren't misread as local time (UTC+3 in IL).
function parseUTC(iso: string): number {
  if (!iso) return 0;
  const hasTz = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTz ? iso : iso + 'Z').getTime();
}

// Relative time in Hebrew: "לפני 3 שעות", "אתמול", "12/6"
function relativeTime(iso: string): string {
  if (!iso) return '';
  const then = parseUTC(iso);
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'הרגע';
  if (diffMin < 60) return `לפני ${diffMin} דק׳`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `לפני ${diffHr} שע׳`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'אתמול';
  if (diffDay < 7) return `לפני ${diffDay} ימים`;
  return new Date(parseUTC(iso)).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

// Short date for delivery dates: "13/6"
function shortDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

function Kpi({ value, label, color, icon }: { value: number; label: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <span style={{ color }} className="shrink-0">{icon}</span>
      <div className="flex-1 flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-xl font-bold tabular-nums" style={{ color }}><bdi dir="ltr">{value.toLocaleString()}</bdi></span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
    fetch('/api/dashboard').then(r => r.json()).then(data => {
      if (data.orders) setD(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [router]);

  if (!user) return null;
  const greeting = new Date().getHours() < 12 ? 'בוקר טוב' : new Date().getHours() < 17 ? 'צהריים טובים' : 'ערב טוב';

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — לוח בקרה" showBack={false} />

      <main id="main-content" className="max-w-6xl mx-auto p-5 space-y-5">
        {/* Greeting */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs opacity-50 mb-1">{greeting}</p>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--ht-primary)' }}>
              {(user.fullName || '').split(' ')[0] || user.username}
            </h2>
          </div>
          <span className="text-xs opacity-50">{new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>

        {user.role === 'Manager' && d && (
          <>
            {/* ============ REVENUE HEADLINE ============ */}
            <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, var(--ht-primary) 0%, #1a3a6b 100%)', color: '#fff' }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div>
                  <p className="text-sm opacity-70 mb-1">כמה הרווחנו?</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>
                    <bdi dir="ltr">{d.orders.totalRevenue?.toLocaleString()}</bdi> <span className="text-base">₪</span>
                  </p>
                  <p className="text-xs opacity-40 mt-1">מתוך {d.orders.deliveredOrders} הזמנות שנמסרו ללקוחות</p>
                </div>
                <div>
                  <p className="text-sm opacity-70 mb-1">כמה מחכה לנו?</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>
                    <bdi dir="ltr">{d.orders.pendingRevenue?.toLocaleString()}</bdi> <span className="text-base">₪</span>
                  </p>
                  <p className="text-xs opacity-40 mt-1">{d.orders.approvedOrders} הזמנות שאושרו וממתינות לייצור ומשלוח</p>
                </div>
                <div>
                  <p className="text-sm opacity-70 mb-1">כמה ייצרנו היום?</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>
                    <bdi dir="ltr">{d.production.producedUnits?.toLocaleString()}</bdi>
                    <span className="text-lg opacity-50"> מתוך <bdi dir="ltr">{d.production.plannedUnits?.toLocaleString()}</bdi></span>
                  </p>
                  <p className="text-xs opacity-40 mt-1">פיתות שיוצרו מתוך התוכנית היומית</p>
                </div>
              </div>
            </div>

            {/* ============ Business sections ============ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* הזמנות */}
              <div className="rounded-xl p-4" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '2px solid var(--ht-accent)' }}>
                  <IconOrders size={16} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>הזמנות</h3>
                </div>
                <Kpi icon={<IconCheck size={16} />} value={d.orders.approvedOrders} label="מאושרות" color="var(--ht-success)" />
                <Kpi icon={<IconX size={16} />} value={d.orders.rejectedOrders} label="נדחו" color={d.orders.rejectedOrders > 0 ? 'var(--ht-danger)' : '#999'} />
                <Kpi icon={<IconCheck size={16} />} value={d.orders.deliveredOrders} label="נמסרו" color="var(--ht-accent)" />
                <div className="mt-2 pt-2 flex justify-between items-center" style={{ borderTop: '1px solid var(--ht-border)' }}>
                  <span className="text-xs opacity-50">סה״כ</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>{d.orders.totalOrders}</span>
                </div>
              </div>

              {/* ייצור */}
              <div className="rounded-xl p-4" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '2px solid var(--ht-success)' }}>
                  <IconProduction size={16} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>ייצור</h3>
                </div>
                <Kpi icon={<IconGear size={16} />} value={d.production.inProductionTonight} label="בייצור הלילה" color="var(--ht-accent)" />
                <Kpi icon={<IconClock size={16} />} value={d.production.awaitingProduction} label="ממתין לייצור" color={d.production.awaitingProduction > 0 ? 'var(--ht-warning)' : '#999'} />
                <Kpi icon={<IconCheck size={16} />} value={d.production.completedPlans} label="הושלמו" color="var(--ht-success)" />
                <div className="mt-2 pt-2 flex justify-between items-center" style={{ borderTop: '1px solid var(--ht-border)' }}>
                  <span className="text-xs opacity-50">סה״כ תוכניות</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>{d.production.totalPlans}</span>
                </div>
              </div>

              {/* משלוחים */}
              <div className="rounded-xl p-4" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '2px solid var(--ht-warning)' }}>
                  <IconDelivery size={16} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>משלוחים</h3>
                </div>
                <Kpi icon={<IconRoute size={16} />} value={d.deliveries.onTheWay} label="בדרך" color="var(--ht-accent)" />
                <Kpi icon={<IconCheck size={16} />} value={d.deliveries.deliveredDeliveries} label="נמסרו" color="var(--ht-success)" />
                <Kpi icon={<IconOrders size={16} />} value={d.deliveries.deliveryNoteCount} label="תעודות משלוח" color="var(--ht-primary)" />
                <div className="mt-2 pt-2 flex justify-between items-center" style={{ borderTop: '1px solid var(--ht-border)' }}>
                  <span className="text-xs opacity-50">סה״כ</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>{d.deliveries.totalDeliveries}</span>
                </div>
              </div>
            </div>

            {/* Inventory status */}
            {d.inventory.lowStockCount > 0 || d.inventory.warningStockCount > 0 ? (
              <div className="p-4 rounded-xl flex items-start gap-3" style={{
                background: d.inventory.lowStockCount > 0 ? 'var(--ht-danger-bg)' : 'var(--ht-warning-bg)',
                border: '1px solid var(--ht-border)'
              }}>
                <IconAlertTriangle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-sm" style={{ color: d.inventory.lowStockCount > 0 ? 'var(--ht-danger)' : 'var(--ht-warning)' }}>
                    {d.inventory.lowStockCount > 0 ? 'חומרים מתחת לסף מינימום' : 'חומרים מתקרבים לסף'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[...d.inventory.lowStockMaterials, ...d.inventory.warningStockMaterials].map((m: any, i: number) => (
                      <span key={i} className="px-2 py-1 rounded text-xs" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                        {m.name}: <bdi dir="ltr">{m.current}</bdi> / <bdi dir="ltr">{m.minimum}</bdi> {m.unit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: 'var(--ht-success-bg)', border: '1px solid var(--ht-border)' }}>
                <IconCircleFull size={8} color="var(--ht-success)" />
                <span className="text-sm" style={{ color: 'var(--ht-success)' }}>מלאי חומרי גלם — כל החומרים מעל סף מינימום</span>
              </div>
            )}

            {/* ============ RECENT ACTIVITY ============ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* ----- הזמנות אחרונות ----- */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}><IconOrders size={14} /> הזמנות אחרונות</h3>
                  <button onClick={() => router.push('/orders')} className="text-xs" style={{ color: 'var(--ht-accent)' }}>הכול ←</button>
                </div>
                <div className="space-y-0.5">
                  {(d.recentOrders || []).map((o: any) => (
                    <button key={o.orderId} onClick={() => router.push('/orders')}
                      className="w-full text-start py-2.5 px-2 rounded-lg transition-all"
                      style={{ borderBottom: '1px solid var(--ht-border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ht-surface-container)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      {/* line 1: customer + time + status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate flex-1 min-w-0">{o.customerName}</span>
                        <span style={{ ...getStatusBadgeStyle(o.status), fontSize: '10px', padding: '1px 7px' }}>{statusLabels[o.status] || o.status}</span>
                      </div>
                      {/* line 2: qty + amount + (reason | delivery date) */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-xs opacity-50">{relativeTime(o.createdAt)}</span>
                        <div className="flex items-center gap-2 text-xs">
                          {o.quantity > 0 && <span className="opacity-60"><bdi dir="ltr">{o.quantity.toLocaleString()}</bdi> פיתות</span>}
                          <span className="font-bold"><bdi dir="ltr">{o.totalAmount?.toLocaleString()}</bdi> ₪</span>
                        </div>
                      </div>
                      {/* line 3 (conditional): rejection reason OR delivery date */}
                      {o.status === 'Rejected' && o.rejectionReason && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <IconX size={11} />
                          <span className="text-xs font-medium" style={{ color: 'var(--ht-danger)' }}>{o.rejectionReason}</span>
                        </div>
                      )}
                      {o.status === 'Approved' && o.requiredDeliveryDate && (
                        <p className="text-xs opacity-50 mt-1.5">אספקה ל-<bdi dir="ltr">{shortDate(o.requiredDeliveryDate)}</bdi></p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ----- תוכניות ייצור ----- */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}><IconProduction size={14} /> תוכניות ייצור</h3>
                  <button onClick={() => router.push('/production')} className="text-xs" style={{ color: 'var(--ht-accent)' }}>הכול ←</button>
                </div>
                <div className="space-y-0.5">
                  {(d.recentPlans || []).map((p: any) => (
                    <button key={p.planId} onClick={() => router.push('/production')}
                      className="w-full text-start py-2.5 px-2 rounded-lg transition-all"
                      style={{ borderBottom: '1px solid var(--ht-border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ht-surface-container)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate flex-1 min-w-0">{p.label}</span>
                        <span style={{ ...getStatusBadgeStyle(p.displayStatus || p.status), fontSize: '10px', padding: '1px 7px' }}>{statusLabels[p.displayStatus || p.status] || p.status}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <IconProduction size={11} className="opacity-40" />
                        <span className="text-xs opacity-60">
                          {p.plannedQuantity > 0 ? <><bdi dir="ltr">{p.plannedQuantity.toLocaleString()}</bdi> פיתות לייצור</> : 'אין פריטים'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ----- משלוחים ----- */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}><IconDelivery size={14} /> משלוחים</h3>
                  <button onClick={() => router.push('/delivery')} className="text-xs" style={{ color: 'var(--ht-accent)' }}>הכול ←</button>
                </div>
                <div className="space-y-0.5">
                  {(d.recentDeliveries || []).map((dl: any) => (
                    <button key={dl.deliveryId} onClick={() => router.push('/delivery')}
                      className="w-full text-start py-2.5 px-2 rounded-lg transition-all"
                      style={{ borderBottom: '1px solid var(--ht-border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ht-surface-container)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate flex-1 min-w-0">{dl.routeLabel || 'קו חלוקה'}</span>
                        <span style={{ ...getStatusBadgeStyle(dl.status), fontSize: '10px', padding: '1px 7px' }}>{statusLabels[dl.status] || dl.status}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-xs opacity-50 truncate">{dl.driverName}</span>
                        <div className="flex items-center gap-2 text-xs shrink-0">
                          {dl.stopCount > 0 && <span className="opacity-60">{dl.stopCount} תחנות</span>}
                          {dl.totalValue > 0 && <span className="font-bold"><bdi dir="ltr">{dl.totalValue.toLocaleString()}</bdi> ₪</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loading skeleton */}
        {loading && user.role === 'Manager' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="p-5 rounded-xl animate-pulse" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)', height: '200px' }}></div>
            ))}
          </div>
        )}

        {/* Driver — personalised dashboard */}
        {user.role === 'Driver' && (
          <DriverDashboard user={user} />
        )}

        {/* Production worker — production-focused dashboard */}
        {user.role === 'ProductionWorker' && (
          <ProductionDashboard user={user} />
        )}

        {/* Warehouse worker — inventory-focused dashboard */}
        {user.role === 'WarehouseWorker' && (
          <WarehouseDashboard user={user} />
        )}

        {/* Any remaining role — placeholder welcome */}
        {user.role !== 'Manager' && user.role !== 'Driver' && user.role !== 'ProductionWorker' && user.role !== 'WarehouseWorker' && (
          <div className="p-8 rounded-xl text-center flex flex-col items-center" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
            <Logo size={56} light={false} />
            <p className="text-lg font-bold mt-3" style={{ color: 'var(--ht-primary)' }}>{greeting}, {roleLabels[user.role]}</p>
            <p className="text-sm opacity-50 mt-1">ניתן לבחור פעולה מסרגל הכלים למעלה</p>
          </div>
        )}
      </main>
    </div>
  );
}
