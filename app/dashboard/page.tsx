'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import Logo from '../components/Logo';
import { getStatusBadgeStyle } from '../components/styles';
import { IconOrders, IconProduction, IconDelivery, IconInventory, IconCheck, IconX, IconGear, IconClock, IconRoute, IconCircleFull, IconAlertTriangle } from '../components/Icons';
import DriverDashboard from '../components/DriverDashboard';

const roleLabels: Record<string, string> = { Manager: 'מנהל', ProductionWorker: 'עובד ייצור', WarehouseWorker: 'מחסנאי', Driver: 'נהג' };
const statusLabels: Record<string, string> = { Draft: 'טיוטה', Approved: 'מאושרת', Rejected: 'נדחתה', Delivered: 'נמסרה', 'In Progress': 'בייצור', InProgress: 'בייצור', 'Waiting For Materials': 'ממתין לחומרים', Completed: 'הושלם', Cancelled: 'בוטל', Planned: 'מתוכנן', 'On The Way': 'בדרך', Failed: 'נכשל' };

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
                <Kpi icon={<IconGear size={16} />} value={d.production.inProgressPlans} label="בייצור כעת" color="var(--ht-accent)" />
                <Kpi icon={<IconClock size={16} />} value={d.production.waitingPlans} label="ממתין לחומרים" color={d.production.waitingPlans > 0 ? 'var(--ht-warning)' : '#999'} />
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
              <div className="p-4 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}><IconOrders size={14} /> הזמנות אחרונות</h3>
                  <button onClick={() => router.push('/orders')} className="text-xs" style={{ color: 'var(--ht-accent)' }}>הכול ←</button>
                </div>
                {(d.recentOrders || []).map((o: any) => (
                  <div key={o.orderId} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    <span className="text-xs font-medium truncate flex-1 min-w-0">{o.customerName}</span>
                    <div className="flex items-center gap-2 shrink-0 me-2">
                      <span className="text-xs opacity-60"><bdi dir="ltr">{o.totalAmount?.toLocaleString()}</bdi> ₪</span>
                      <span style={{ ...getStatusBadgeStyle(o.status), fontSize: '10px', padding: '1px 6px' }}>{statusLabels[o.status] || o.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}><IconProduction size={14} /> תוכניות ייצור</h3>
                  <button onClick={() => router.push('/production')} className="text-xs" style={{ color: 'var(--ht-accent)' }}>הכול ←</button>
                </div>
                {(d.recentPlans || []).map((p: any) => (
                  <div key={p.planId} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    <span className="text-xs font-medium truncate flex-1 min-w-0">{p.label}</span>
                    <span className="shrink-0 me-1" style={{ ...getStatusBadgeStyle(p.status), fontSize: '10px', padding: '1px 6px' }}>{statusLabels[p.status] || p.status}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}><IconDelivery size={14} /> משלוחים</h3>
                  <button onClick={() => router.push('/delivery')} className="text-xs" style={{ color: 'var(--ht-accent)' }}>הכול ←</button>
                </div>
                {(d.recentDeliveries || []).map((dl: any) => (
                  <div key={dl.deliveryId} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    <span className="text-xs font-medium truncate flex-1 min-w-0">{dl.label}</span>
                    <span className="shrink-0 me-1" style={{ ...getStatusBadgeStyle(dl.status), fontSize: '10px', padding: '1px 6px' }}>{statusLabels[dl.status] || dl.status}</span>
                  </div>
                ))}
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

        {/* Other non-manager roles — placeholder welcome */}
        {user.role !== 'Manager' && user.role !== 'Driver' && (
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
