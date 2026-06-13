'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { card, getStatusBadgeStyle } from '../components/styles';

const statusLabels: Record<string, string> = {
  Draft: 'טיוטה', Approved: 'מאושרת', Rejected: 'נדחתה', Delivered: 'נמסרה',
  'In Progress': 'בייצור', InProgress: 'בייצור', 'Waiting For Materials': 'ממתין לחומרים',
  Completed: 'הושלם', Cancelled: 'בוטל', Planned: 'מתוכנן', Assigned: 'שויך',
  Loaded: 'נטען', 'On The Way': 'בדרך', Failed: 'נכשל',
};

const productIcons: Record<string, string> = {
  
  
};

type Tab = 'summary' | 'sales' | 'production';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [productionData, setProductionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    loadReport('summary');
  }, [router]);

  const loadReport = async (type: Tab) => {
    setActiveTab(type);
    setLoading(true);
    setError('');
    try {
      const data = await (await fetch(`/api/reports?type=${type}`)).json();
      if (data.error) { setError(data.error); return; }
      if (type === 'summary') setSummaryData(data);
      if (type === 'sales') setSalesData(data);
      if (type === 'production') setProductionData(data);
    } catch { setError('שגיאה בטעינת הדוח'); }
    finally { setLoading(false); }
  };

  const tabs = [
    { key: 'summary' as Tab, label: 'סיכום כללי', desc: 'מבט על כל הפעילות' },
    { key: 'sales' as Tab, label: 'מכירות', desc: 'לפי מוצר ולקוח' },
    { key: 'production' as Tab, label: 'ייצור', desc: 'ביצועי עמידה ביעדים' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — דוחות ותובנות" />
      <main id="main-content" className="max-w-6xl mx-auto p-6 space-y-5">

        {/* Tab navigation */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => loadReport(tab.key)}
              className="px-5 py-3 rounded-xl text-sm transition-all flex-1 text-start"
              style={{
                background: activeTab === tab.key ? 'var(--ht-accent)' : 'var(--ht-surface)',
                color: activeTab === tab.key ? '#fff' : 'var(--ht-on-surface)',
                border: `1px solid ${activeTab === tab.key ? 'var(--ht-accent)' : 'var(--ht-border)'}`,
              }}>
              <p className="font-bold">{tab.label}</p>
              <p className="text-xs mt-0.5" style={{ opacity: activeTab === tab.key ? 0.8 : 0.4 }}>{tab.desc}</p>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl p-4" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div>
            <p className="text-sm mt-2 opacity-50">טוען דוח...</p>
          </div>
        )}

        {/* ============ SUMMARY TAB ============ */}
        {!loading && activeTab === 'summary' && summaryData && (
          <div className="space-y-5">
            {/* Revenue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl" style={{ background: 'var(--ht-success-bg)', border: '1px solid var(--ht-border)' }}>
                <p className="text-xs opacity-50 mb-1">הכנסות ממשלוחים שהושלמו</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--ht-success)', fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>
                  <bdi dir="ltr">{summaryData.orders.totalRevenue?.toLocaleString()}</bdi> ₪
                </p>
              </div>
              <div className="p-5 rounded-xl" style={{ background: 'var(--ht-info-bg)', border: '1px solid var(--ht-border)' }}>
                <p className="text-xs opacity-50 mb-1">הזמנות ממתינות למשלוח</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--ht-accent)', fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>
                  <bdi dir="ltr">{summaryData.orders.pendingRevenue?.toLocaleString()}</bdi> ₪
                </p>
              </div>
              <div className="p-5 rounded-xl" style={{ background: 'var(--ht-danger-bg)', border: '1px solid var(--ht-border)' }}>
                <p className="text-xs opacity-50 mb-1">הזמנות שנדחו</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--ht-danger)', fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>
                  <bdi dir="ltr">{summaryData.orders.rejectedTotal?.toLocaleString()}</bdi> ₪
                </p>
              </div>
            </div>

            {/* Status breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Orders by status */}
              <div className="p-5" style={card}>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--ht-primary)' }}>הזמנות ({summaryData.orders.total})</h3>
                <div className="space-y-2">
                  {Object.entries(summaryData.orders.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span style={getStatusBadgeStyle(status)}>{statusLabels[status] || status}</span>
                      <span className="font-bold" style={{ color: 'var(--ht-primary)' }}>{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Production by status */}
              <div className="p-5" style={card}>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--ht-primary)' }}>תוכניות ייצור ({summaryData.production.total})</h3>
                <div className="space-y-2">
                  {Object.entries(summaryData.production.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span style={getStatusBadgeStyle(status)}>{statusLabels[status] || status}</span>
                      <span className="font-bold" style={{ color: 'var(--ht-primary)' }}>{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deliveries by status */}
              <div className="p-5" style={card}>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--ht-primary)' }}>משלוחים ({summaryData.deliveries.total})</h3>
                <div className="space-y-2">
                  {Object.entries(summaryData.deliveries.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span style={getStatusBadgeStyle(status)}>{statusLabels[status] || status}</span>
                      <span className="font-bold" style={{ color: 'var(--ht-primary)' }}>{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Inventory status */}
            <div className="p-5" style={card}>
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--ht-primary)' }}>מצב מלאי חומרי גלם</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(summaryData.inventory.materials || []).map((m: any) => {
                  const pct = m.minimum_threshold > 0 ? Math.min(100, Math.round((m.current_quantity / (m.minimum_threshold * 3)) * 100)) : 100;
                  const isCritical = m.current_quantity <= m.minimum_threshold;
                  const isLow = m.current_quantity <= m.minimum_threshold * 1.5;
                  const color = isCritical ? 'var(--ht-danger)' : isLow ? 'var(--ht-warning)' : 'var(--ht-success)';
                  return (
                    <div key={m.material_id} className="p-3 rounded-lg" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{m.material_name}</span>
                        <span className="text-xs font-bold" style={{ color }}><bdi dir="ltr">{m.current_quantity}</bdi> {m.unit}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'var(--ht-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }}></div>
                      </div>
                      <p className="text-[10px] opacity-40 mt-0.5">סף מינימום: <bdi dir="ltr">{m.minimum_threshold}</bdi></p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============ SALES TAB ============ */}
        {!loading && activeTab === 'sales' && salesData && (
          <div className="space-y-5">
            {/* By Product */}
            <div className="p-5" style={card}>
              <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--ht-primary)' }}>מכירות לפי מוצר</h3>
              <table className="w-full text-start text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--ht-accent)' }}>
                    <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>מוצר</th>
                    <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>יחידות שנמכרו</th>
                    <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>הכנסות</th>
                    <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>שורות הזמנה</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.byProduct.map((p: any, i: number) => {
                    const maxRev = salesData.byProduct[0]?.revenue || 1;
                    const barWidth = Math.round((p.revenue / maxRev) * 100);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                        <td className="py-3">
                          
                          <span className="font-medium">{p.name}</span>
                        </td>
                        <td className="py-3"><bdi dir="ltr">{p.quantity.toLocaleString()}</bdi></td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-4 rounded" style={{ background: 'var(--ht-border)' }}>
                              <div className="h-full rounded" style={{ width: `${barWidth}%`, background: 'var(--ht-accent)' }}></div>
                            </div>
                            <span className="font-bold text-xs" style={{ minWidth: '70px', color: 'var(--ht-accent)' }}>
                              <bdi dir="ltr">{p.revenue.toLocaleString()}</bdi> ₪
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-center"><bdi dir="ltr">{p.orders}</bdi></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--ht-primary)' }}>
                    <td className="pt-3 font-bold">סה״כ</td>
                    <td className="pt-3 font-bold"><bdi dir="ltr">{salesData.byProduct.reduce((s: number, p: any) => s + p.quantity, 0).toLocaleString()}</bdi></td>
                    <td className="pt-3 font-bold" style={{ color: 'var(--ht-accent)' }}>
                      <bdi dir="ltr">{salesData.byProduct.reduce((s: number, p: any) => s + p.revenue, 0).toLocaleString()}</bdi> ₪
                    </td>
                    <td className="pt-3 font-bold text-center"><bdi dir="ltr">{salesData.byProduct.reduce((s: number, p: any) => s + p.orders, 0)}</bdi></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* By Customer */}
            <div className="p-5" style={card}>
              <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--ht-primary)' }}>לקוחות מובילים</h3>
              <div className="space-y-3">
                {salesData.byCustomer.map((c: any, i: number) => {
                  const maxRev = salesData.byCustomer[0]?.revenue || 1;
                  const barWidth = Math.round((c.revenue / maxRev) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: i === 0 ? 'var(--ht-accent)' : 'var(--ht-border)', color: i === 0 ? '#fff' : 'var(--ht-on-surface)' }}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{c.name}</span>
                          <span className="font-bold text-sm" style={{ color: 'var(--ht-accent)' }}>
                            <bdi dir="ltr">{c.revenue.toLocaleString()}</bdi> ₪
                          </span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'var(--ht-border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: i === 0 ? 'var(--ht-accent)' : 'var(--ht-success)' }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============ PRODUCTION TAB ============ */}
        {!loading && activeTab === 'production' && productionData && (
          <div className="space-y-5">
            {productionData.plans.map((plan: any) => (
              <div key={plan.planId} className="p-5" style={card}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold" style={{ color: 'var(--ht-primary)' }}>
                      תוכנית #{plan.planId} — <bdi dir="ltr">{new Date(plan.date).toLocaleDateString('he-IL')}</bdi>
                    </h3>
                    <span style={getStatusBadgeStyle(plan.status)}>{statusLabels[plan.status] || plan.status}</span>
                  </div>
                  <div className="text-end">
                    <p className="text-3xl font-bold" style={{
                      color: plan.efficiency >= 80 ? 'var(--ht-success)' : plan.efficiency >= 50 ? 'var(--ht-warning)' : 'var(--ht-danger)',
                      fontFamily: 'var(--font-heebo), Heebo, sans-serif'
                    }}>
                      <bdi dir="ltr">{plan.efficiency}%</bdi>
                    </p>
                    <p className="text-xs opacity-40">עמידה ביעדים</p>
                  </div>
                </div>

                {/* Overall bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="opacity-50">סה״כ: <bdi dir="ltr">{plan.produced.toLocaleString()}</bdi> / <bdi dir="ltr">{plan.planned.toLocaleString()}</bdi> יחידות</span>
                  </div>
                  <div className="h-3 rounded-full" style={{ background: 'var(--ht-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${plan.efficiency}%`,
                      background: plan.efficiency >= 80 ? 'var(--ht-success)' : plan.efficiency >= 50 ? 'var(--ht-warning)' : 'var(--ht-accent)'
                    }}></div>
                  </div>
                </div>

                {/* Per product */}
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ht-border)' }}>
                      <th className="pb-2 text-start text-xs opacity-50">מוצר</th>
                      <th className="pb-2 text-start text-xs opacity-50">מתוכנן</th>
                      <th className="pb-2 text-start text-xs opacity-50">יוצר</th>
                      <th className="pb-2 text-start text-xs opacity-50">עמידה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.items.map((item: any, j: number) => (
                      <tr key={j} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                        <td className="py-2">
                          
                          {item.productName}
                        </td>
                        <td className="py-2"><bdi dir="ltr">{item.planned.toLocaleString()}</bdi></td>
                        <td className="py-2"><bdi dir="ltr">{item.produced.toLocaleString()}</bdi></td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--ht-border)', maxWidth: '80px' }}>
                              <div className="h-full rounded-full" style={{
                                width: `${item.efficiency}%`,
                                background: item.efficiency === 100 ? 'var(--ht-success)' : item.efficiency > 0 ? 'var(--ht-accent)' : 'var(--ht-border)'
                              }}></div>
                            </div>
                            <span className="text-xs font-bold" style={{
                              color: item.efficiency === 100 ? 'var(--ht-success)' : item.efficiency > 0 ? 'var(--ht-accent)' : 'var(--ht-danger)',
                            }}><bdi dir="ltr">{item.efficiency}%</bdi></span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
