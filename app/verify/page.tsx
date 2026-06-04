'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { card, getStatusBadgeStyle } from '../components/styles';

const columnHebrew: Record<string, string> = {
  order_id: 'מס׳ הזמנה', business_name: 'שם עסק', total_amount: 'סכום', status: 'סטטוס', created_at: 'נוצר',
  order_item_id: 'מס׳ פריט', product_name: 'מוצר', quantity: 'כמות', unit_price_at_sale: 'מחיר',
  plan_id: 'מס׳ תוכנית', plan_date: 'תאריך', plan_item_id: 'מס׳ פריט', planned_quantity: 'כמות מתוכננת',
  delivery_id: 'מס׳ משלוח', driver: 'נהג', arrival_time: 'זמן הגעה', note_id: 'מס׳ תעודה', sent_to_email: 'נשלח במייל', full_name: 'שם מלא',
};

const statusHebrew: Record<string, string> = {
  Draft: 'טיוטה', Approved: 'מאושר', Rejected: 'נדחה', Delivered: 'נמסר', Planned: 'מתוכנן', Assigned: 'שויך', Loaded: 'נטען',
  'On The Way': 'בדרך', Failed: 'נכשל', 'In Progress': 'בייצור', 'Waiting For Materials': 'ממתין לחומרים', Completed: 'הושלם', Cancelled: 'בוטל', InProgress: 'בייצור',
};

const sections = [
  {
    title: 'הזמנות (FR1)',
    queries: [
      { label: 'הזמנות', query: `SELECT o.order_id, c.business_name, o.total_amount, o.status, o.created_at FROM orders o JOIN customers c ON o.customer_id = c.customer_id ORDER BY o.created_at DESC LIMIT 10` },
      { label: 'פריטי הזמנה', query: `SELECT oi.order_item_id, p.product_name, oi.quantity, oi.unit_price_at_sale FROM order_items oi JOIN orders o ON oi.order_id = o.order_id JOIN products p ON oi.product_id = p.product_id ORDER BY o.created_at DESC LIMIT 10` },
    ],
  },
  {
    title: 'תוכניות ייצור (FR2)',
    queries: [
      { label: 'תוכניות', query: `SELECT pp.plan_id, pp.plan_date, pp.status, pp.created_at FROM production_plans pp ORDER BY pp.created_at DESC LIMIT 10` },
      { label: 'פריטי תוכנית', query: `SELECT ppi.plan_item_id, p.product_name, ppi.planned_quantity FROM production_plan_items ppi JOIN production_plans pp ON ppi.plan_id = pp.plan_id JOIN products p ON ppi.product_id = p.product_id ORDER BY pp.created_at DESC LIMIT 10` },
    ],
  },
  {
    title: 'משלוחים (FR3)',
    queries: [
      { label: 'משלוחים', query: `SELECT d.delivery_id, e.full_name as driver, d.status, d.arrival_time FROM deliveries d JOIN employees e ON d.driver_id = e.employee_id ORDER BY d.created_at DESC LIMIT 10` },
      { label: 'תעודות משלוח', query: `SELECT dn.note_id, dn.delivery_id, dn.created_at, dn.sent_to_email FROM delivery_notes dn ORDER BY dn.created_at DESC LIMIT 10` },
    ],
  },
];

export default function VerifyPage() {
  const [results, setResults] = useState<Record<string, any[]>>({});
  const [loadingKey, setLoadingKey] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(0);
  const [showSql, setShowSql] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const s = localStorage.getItem('user');
    if (!s) { router.push('/login'); return; }
    // Auto-load first query of each section
    sections.forEach(sec => {
      sec.queries.forEach(q => runQuery(q.label, q.query));
    });
  }, [router]);

  const runQuery = async (key: string, query: string) => {
    setLoadingKey(key); setError('');
    try {
      const data = await (await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })).json();
      if (data.data) setResults(prev => ({ ...prev, [key]: data.data }));
      else if (data.error) setError(data.error);
    } catch { setError('שגיאת חיבור'); }
    finally { setLoadingKey(''); }
  };

  const formatValue = (key: string, val: any): string => {
    if (val === null || val === undefined) return '—';
    if (key === 'status') return statusHebrew[val] || val;
    if (key.includes('created_at') || key === 'arrival_time') { try { return new Date(val).toLocaleString('he-IL'); } catch { return String(val); } }
    if (key === 'total_amount' || key === 'unit_price_at_sale') return `${Number(val).toLocaleString()} ₪`;
    if (key === 'sent_to_email') return val ? 'כן' : 'לא';
    return String(val);
  };

  const isLtr = (key: string) => ['total_amount', 'unit_price_at_sale', 'quantity', 'planned_quantity', 'order_id', 'order_item_id', 'plan_id', 'plan_item_id', 'delivery_id', 'note_id', 'created_at', 'arrival_time'].includes(key);

  const renderTable = (key: string, query: string) => {
    const data = results[key];
    const isLoading = loadingKey === key;
    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>{key}</h4>
            {data && <span className="text-xs opacity-40">{data.length} שורות</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSql(showSql === key ? null : key)} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
              {showSql === key ? 'הסתר SQL' : 'הצג SQL'}
            </button>
            <button onClick={() => runQuery(key, query)} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--ht-accent)', color: '#fff' }}>רענון</button>
          </div>
        </div>
        {showSql === key && (
          <div className="rounded-lg p-3 mb-2 font-mono text-xs overflow-x-auto" dir="ltr" style={{ background: 'var(--ht-primary)', color: '#5C8AFF' }}>
            <pre>{query}</pre>
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-4"><div className="inline-block w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div></div>
        ) : data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--ht-accent)' }}>
                  {Object.keys(data[0]).map(k => <th key={k} className="pb-2 px-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>{columnHebrew[k] || k}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                    {Object.entries(row).map(([k, v]: [string, any], j: number) => (
                      <td key={j} className="py-2 px-2 text-sm" dir={isLtr(k) ? 'ltr' : undefined}>
                        {k === 'status' ? <span style={getStatusBadgeStyle(v as string)}>{formatValue(k, v)}</span> : formatValue(k, v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data ? (
          <p className="text-sm opacity-40 py-2">אין נתונים</p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — אימות נתונים" />
      <main id="main-content" className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="p-4 rounded-xl text-sm" style={{ background: 'var(--ht-info-bg)', border: '1px solid var(--ht-border)' }}>
          <p><strong>דף אימות:</strong> הנתונים מוצגים ישירות מבסיס הנתונים (<span dir="ltr" className="ltr-content">Supabase PostgreSQL</span>). ניתן לרענן כל טבלה ולהציג את שאילתת ה-SQL שהרצה.</p>
        </div>

        {error && <div className="rounded-xl p-4" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>{error}</div>}

        {/* Section Tabs */}
        <div className="flex gap-2">
          {sections.map((sec, i) => (
            <button key={i} onClick={() => setActiveSection(i)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: activeSection === i ? 'var(--ht-accent)' : 'var(--ht-surface)', color: activeSection === i ? '#fff' : 'var(--ht-on-surface)', border: `1px solid ${activeSection === i ? 'var(--ht-accent)' : 'var(--ht-border)'}` }}>
              {sec.title}
            </button>
          ))}
        </div>

        {/* Active Section */}
        <div className="p-6" style={card}>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ht-primary)' }}>{sections[activeSection].title}</h2>
          <div className="space-y-6">
            {sections[activeSection].queries.map(q => (
              <div key={q.label}>{renderTable(q.label, q.query)}</div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
