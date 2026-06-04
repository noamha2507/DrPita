'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { card, getStatusBadgeStyle } from '../components/styles';
import { IconDelivery, IconCheck, IconX, IconAlertTriangle, IconRoute, IconOrders, IconInventory, IconMapPin, IconPhone, IconUser, IconMap } from '../components/Icons';

interface DeliveryListItem {
  deliveryId: number; driverId: number; driverName: string; vehicleId: number; vehiclePlate: string;
  status: string; departureTime: string | null; arrivalTime: string | null; createdAt: string;
  orderCount: number; totalValue: number;
}
interface DeliveryDetail {
  delivery: DeliveryListItem & { customerCount: number; vehicleCapacity: number };
  orders: { orderId: number; customerName: string; address: string; phone: string; status: string; totalAmount: number; requiredDate: string | null }[];
  stops: { stopNumber: number; orderId: number; customerName: string; address: string; phone: string; email: string; orderAmount: number; orderStatus: string; requiredDate: string | null }[];
  products: { productName: string; totalQuantity: number; orderCount: number }[];
  deliveryNotes: { noteId: number; createdAt: string; sentToEmail: boolean }[];
}

const nextStatusMap: Record<string, { next: string; label: string }[]> = {
  Planned: [{ next: 'Assigned', label: 'שיוך נהג לרכב' }],
  Assigned: [{ next: 'Loaded', label: 'סימון רכב כנטען' }],
  Loaded: [{ next: 'On The Way', label: 'יציאה לדרך' }],
  'On The Way': [],
  Failed: [{ next: 'Planned', label: 'תזמון מחדש' }],
};
const statusLabels: Record<string, string> = { Planned: 'מתוכנן', Assigned: 'שויך', Loaded: 'נטען', 'On The Way': 'בדרך', Delivered: 'נמסר', Failed: 'נכשל' };
const orderStatusLabels: Record<string, string> = { Approved: 'מאושרת — ממתינה לאישור מסירה', Delivered: 'נמסרה', Rejected: 'נדחתה', Draft: 'טיוטה' };
const stateSteps = ['מתוכנן', 'שויך', 'נטען', 'בדרך', 'נמסר'];
const stateKeys = ['Planned', 'Assigned', 'Loaded', 'On The Way', 'Delivered'];

const statusGuidance: Record<string, string> = {
  Planned: 'יש לשייך נהג ורכב למשלוח',
  Assigned: 'יש לטעון את הסחורה לרכב',
  Loaded: 'הרכב נטען ומוכן — יש להתחיל את המסלול',
  'On The Way': 'הנהג בדרך — בסיום יש להחתים את הלקוח ולסגור את המשלוח',
  Delivered: 'המשלוח הושלם בהצלחה',
  Failed: 'המשלוח נכשל — ניתן לתזמן מחדש',
};

const routeLabels: Record<number, string> = { 3: 'קו רמלה ולוד', 1: 'קו רמלה ולוד', 2: 'קו יפו ופתח תקווה', 4: 'קו לוד ורחובות' };

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DeliveryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [userRole, setUserRole] = useState('');
  const [currentEmployeeId, setCurrentEmployeeId] = useState<number | undefined>();
  const [detailTab, setDetailTab] = useState<'route' | 'content' | 'orders' | 'signature'>('route');
  const [showFailModal, setShowFailModal] = useState(false);
  const [failDeliveryId, setFailDeliveryId] = useState<number | null>(null);
  const [failReason, setFailReason] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const user = JSON.parse(stored);
    setUserRole(user.role);
    const empId = user.role === 'Manager' ? undefined : user.employeeId;
    setCurrentEmployeeId(empId);
    loadList(empId);
  }, [router]);

  const loadList = async (driverId?: number) => {
    try {
      setPageError(null);
      const url = driverId ? `/api/delivery?driverId=${driverId}` : '/api/delivery';
      const data = await (await fetch(url)).json();
      if (Array.isArray(data)) setDeliveries(data);
    } catch { setPageError('שגיאה בטעינת משלוחים'); }
    finally { setPageLoading(false); }
  };

  const loadDetail = async (deliveryId: number) => {
    setSelectedId(deliveryId); setDetailLoading(true); setDetail(null); setDetailTab('route');
    try {
      const data = await (await fetch(`/api/delivery/detail?deliveryId=${deliveryId}`)).json();
      if (data.delivery) setDetail(data);
    } catch {} finally { setDetailLoading(false); }
  };

  // Canvas
  const getCtx = () => { const c = canvasRef.current; return c ? { canvas: c, ctx: c.getContext('2d')!, rect: c.getBoundingClientRect() } : null; };
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => { const g = getCtx(); if (!g) return; setIsDrawing(true); g.ctx.beginPath(); g.ctx.moveTo(e.clientX - g.rect.left, e.clientY - g.rect.top); };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => { if (!isDrawing) return; const g = getCtx(); if (!g) return; g.ctx.lineWidth = 2; g.ctx.lineCap = 'round'; g.ctx.strokeStyle = '#0A1A2F'; g.ctx.lineTo(e.clientX - g.rect.left, e.clientY - g.rect.top); g.ctx.stroke(); setHasSigned(true); };
  const stopDraw = () => setIsDrawing(false);
  const startDrawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); const g = getCtx(); if (!g) return; setIsDrawing(true); const t = e.touches[0]; g.ctx.beginPath(); g.ctx.moveTo(t.clientX - g.rect.left, t.clientY - g.rect.top); };
  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); if (!isDrawing) return; const g = getCtx(); if (!g) return; const t = e.touches[0]; g.ctx.lineWidth = 2; g.ctx.lineCap = 'round'; g.ctx.strokeStyle = '#0A1A2F'; g.ctx.lineTo(t.clientX - g.rect.left, t.clientY - g.rect.top); g.ctx.stroke(); setHasSigned(true); };
  const clearSignature = () => { const g = getCtx(); if (!g) return; g.ctx.clearRect(0, 0, g.canvas.width, g.canvas.height); setHasSigned(false); };

  const handleStatusTransition = async (deliveryId: number, newStatus: string) => {
    setLoading(true); setResult(null);
    try {
      const data = await (await fetch('/api/delivery', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryId, newStatus }) })).json();
      if (data.success) { setResult({ success: true, message: `סטטוס המשלוח עודכן — ${statusLabels[newStatus]}` }); await loadList(currentEmployeeId); if (selectedId === deliveryId) loadDetail(deliveryId); }
      else setResult({ success: false, message: data.error || 'שגיאה' });
    } catch { setResult({ success: false, message: 'שגיאת חיבור' }); } finally { setLoading(false); }
  };

  const handleComplete = async () => {
    if (!selectedId || !hasSigned) return;
    const sig = canvasRef.current?.toDataURL('image/png') || '';
    setLoading(true); setResult(null);
    try {
      const data = await (await fetch('/api/delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryId: selectedId, signatureFile: sig }) })).json();
      if (data.success) {
        setResult({ success: true, completed: true, deliveryNoteId: data.deliveryNoteId, deliveryId: selectedId });
        clearSignature(); await loadList(currentEmployeeId); loadDetail(selectedId);
      } else setResult({ success: false, message: data.error || 'שגיאה' });
    } catch { setResult({ success: false, message: 'שגיאת חיבור' }); } finally { setLoading(false); }
  };

  const openFailModal = (deliveryId: number) => { setFailDeliveryId(deliveryId); setFailReason(''); setShowFailModal(true); };
  const confirmFail = () => { if (failDeliveryId) { setShowFailModal(false); handleStatusTransition(failDeliveryId, 'Failed'); } };

  const activeDeliveries = deliveries.filter(d => !['Delivered'].includes(d.status));
  const needsAttention = deliveries.filter(d => ['On The Way', 'Planned', 'Assigned', 'Loaded'].includes(d.status));
  const si = (status: string) => stateKeys.indexOf(status);

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — ניהול משלוחים" />
      <main id="main-content" className="max-w-6xl mx-auto p-5 space-y-4">

        {/* Info */}
        <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--ht-info-bg)', border: '1px solid var(--ht-border)' }}>
          <p style={{ color: 'var(--ht-primary)' }}>{userRole === 'Driver' ? 'כאן ניתן לצפות במשלוחים שלך, לעדכן סטטוס ולסגור משלוח עם חתימת לקוח.' : 'מסך זה מציג את כל המשלוחים הפעילים ומאפשר מעקב, עדכון סטטוס וסגירת משלוחים.'}</p>
        </div>

        {pageError && (
          <div className="p-3 rounded-xl text-sm flex items-center justify-between" style={{ background: 'var(--ht-danger-bg)', border: '1px solid var(--ht-border)' }}>
            <p className="font-medium flex items-center gap-2" style={{ color: 'var(--ht-danger)' }}><IconAlertTriangle size={16} /> {pageError}</p>
            <button onClick={() => { setPageError(null); loadList(currentEmployeeId); }} className="btn-ghost text-xs px-3 py-1">נסה שוב</button>
          </div>
        )}

        {/* Completion result */}
        {result?.completed && (
          <div className="p-4 rounded-xl" style={{ background: 'var(--ht-success-bg)', border: '1px solid var(--ht-border)' }}>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ht-success)' }}><IconCheck size={16} /> המשלוח הושלם בהצלחה</h3>
            <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--ht-success)' }}>
              <p><IconCheck size={12} className="inline" /> סטטוס המשלוח עודכן לנמסר</p>
              <p><IconCheck size={12} className="inline" /> ההזמנות עודכנו לנמסר</p>
              <p><IconCheck size={12} className="inline" /> תעודת משלוח #{result.deliveryNoteId} נוצרה</p>
              <p><IconCheck size={12} className="inline" /> אישור נשלח ללקוח במייל</p>
            </div>
          </div>
        )}
        {result && !result.completed && (
          <div className="rounded-xl p-3" style={{ background: result.success ? 'var(--ht-success-bg)' : 'var(--ht-danger-bg)', color: result.success ? 'var(--ht-success)' : 'var(--ht-danger)' }}>
            <p className="font-bold text-sm flex items-center gap-2">{result.success ? <IconCheck size={16} /> : <IconX size={16} />} {result.message}</p>
          </div>
        )}

        {/* SECTION 1: KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'משלוחים פעילים', value: activeDeliveries.length, color: 'var(--ht-accent)', icon: <IconDelivery size={16} /> },
            { label: 'בדרך', value: deliveries.filter(d => d.status === 'On The Way').length, color: 'var(--ht-accent)', icon: <IconRoute size={16} /> },
            { label: 'הושלמו', value: deliveries.filter(d => d.status === 'Delivered').length, color: 'var(--ht-success)', icon: <IconCheck size={16} /> },
            { label: 'הזמנות במשלוחים', value: deliveries.reduce((s, d) => s + d.orderCount, 0), color: 'var(--ht-primary)', icon: <IconOrders size={16} /> },
            { label: 'דורשים טיפול', value: needsAttention.length, color: needsAttention.length > 0 ? 'var(--ht-warning)' : '#999', icon: <IconAlertTriangle size={16} /> },
          ].map((kpi, i) => (
            <div key={i} className="p-3 rounded-xl flex items-center gap-2.5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <div>
                <p className="text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-[11px] opacity-60">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* SECTION 2: Action Center */}
        {needsAttention.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>דורש טיפול</h2>
            {needsAttention.map(d => (
              <div key={d.deliveryId} className="p-4 rounded-xl" style={{
                background: d.status === 'On The Way' ? 'var(--ht-info-bg)' : d.status === 'Failed' ? 'var(--ht-danger-bg)' : 'var(--ht-surface)',
                border: '1px solid var(--ht-border)',
              }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {d.status === 'On The Way' ? <IconRoute size={18} /> : <IconDelivery size={18} />}
                    <div>
                      <span className="font-bold text-sm">{routeLabels[d.deliveryId] || 'קו חלוקה'}</span>
                      <span className="text-xs opacity-50 me-2"> — {d.driverName}</span>
                    </div>
                  </div>
                  <span style={{ ...getStatusBadgeStyle(d.status), fontSize: '11px', padding: '2px 8px' }}>{statusLabels[d.status]}</span>
                </div>
                <div className="flex gap-4 text-xs opacity-60 mb-2">
                  <span>רכב: <bdi dir="ltr">{d.vehiclePlate}</bdi></span>
                  <span>{d.orderCount} הזמנות</span>
                  <span><bdi dir="ltr">{d.totalValue.toLocaleString()}</bdi> ₪</span>
                </div>
                <p className="text-xs opacity-50 mb-3 italic">{statusGuidance[d.status]}</p>
                <div className="flex gap-2">
                  <button onClick={() => loadDetail(d.deliveryId)} className="btn-ghost text-xs px-3 py-1.5">צפייה בפירוט</button>
                  {(nextStatusMap[d.status] || []).map(t => (
                    <button key={t.next} onClick={() => handleStatusTransition(d.deliveryId, t.next)} disabled={loading}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{t.label}</button>
                  ))}
                  {d.status === 'On The Way' && (
                    <button onClick={() => { loadDetail(d.deliveryId); setDetailTab('signature'); }} className="btn-primary text-xs px-3 py-1.5">החתמת לקוח וסגירה</button>
                  )}
                  {d.status !== 'Failed' && d.status !== 'Delivered' && (
                    <button onClick={() => openFailModal(d.deliveryId)} className="btn-danger text-xs px-3 py-1.5">דיווח כשל</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SECTIONS 3+4: List + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Delivery list (2/5) */}
          <div className="lg:col-span-2 space-y-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>{userRole === 'Manager' ? 'כל המשלוחים' : 'המשלוחים שלי'}</h2>
            {pageLoading ? (
              <div className="text-center py-8"><div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div></div>
            ) : deliveries.length === 0 ? (
              <div className="p-6 rounded-xl text-center" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <p className="text-sm opacity-50">אין משלוחים</p>
              </div>
            ) : deliveries.map(d => {
              const idx = si(d.status);
              const isSelected = selectedId === d.deliveryId;
              return (
                <div key={d.deliveryId} onClick={() => loadDetail(d.deliveryId)} tabIndex={0} role="button"
                  onKeyDown={(e) => { if (e.key === 'Enter') loadDetail(d.deliveryId); }}
                  className="p-3 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: isSelected ? 'var(--ht-info-bg)' : 'var(--ht-surface)',
                    border: isSelected ? '2px solid var(--ht-accent)' : '1px solid var(--ht-border)',
                    opacity: d.status === 'Delivered' ? 0.7 : 1,
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{routeLabels[d.deliveryId] || 'קו חלוקה'}</span>
                    <span style={{ ...getStatusBadgeStyle(d.status), fontSize: '10px', padding: '2px 6px' }}>{statusLabels[d.status]}</span>
                  </div>
                  <p className="text-xs opacity-60">{d.driverName} — <bdi dir="ltr">{d.vehiclePlate}</bdi> — {d.orderCount} הזמנות — <bdi dir="ltr">{d.totalValue.toLocaleString()}</bdi> ₪</p>
                  {/* Progress tracker */}
                  <div className="flex items-center gap-0.5 mt-2">
                    {stateSteps.map((step, i) => (
                      <div key={step} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full h-1.5 rounded-full" style={{
                          background: d.status === 'Failed' ? (i === 0 ? 'var(--ht-danger)' : 'var(--ht-border)')
                            : i <= idx ? 'var(--ht-accent)' : 'var(--ht-border)',
                        }}></div>
                        <span className="text-[8px]" style={{ color: i === idx ? 'var(--ht-accent)' : 'var(--ht-on-surface)', opacity: i === idx ? 1 : 0.25, fontWeight: i === idx ? 600 : 400 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel (3/5) */}
          <div className="lg:col-span-3 space-y-3">
            {!selectedId && !detailLoading && (
              <div className="p-8 rounded-xl text-center" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <IconDelivery size={36} className="mx-auto opacity-20" />
                <p className="font-medium mt-3" style={{ color: 'var(--ht-primary)' }}>יש לבחור משלוח לצפייה בפירוט</p>
              </div>
            )}

            {detailLoading && (
              <div className="p-8 text-center" style={card}><div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div></div>
            )}

            {detail && !detailLoading && (
              <>
                {/* Header */}
                <div className="p-4" style={card}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-bold" style={{ color: 'var(--ht-primary)' }}>{routeLabels[detail.delivery.deliveryId] || 'קו חלוקה'}</h2>
                    <span style={getStatusBadgeStyle(detail.delivery.status)}>{statusLabels[detail.delivery.status]}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg" style={{ background: 'var(--ht-surface-container)' }}>
                      <p className="opacity-50 flex items-center gap-1"><IconUser size={12} /> נהג</p>
                      <p className="font-bold">{detail.delivery.driverName}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: 'var(--ht-surface-container)' }}>
                      <p className="opacity-50 flex items-center gap-1"><IconDelivery size={12} /> רכב</p>
                      <p className="font-bold"><bdi dir="ltr">{detail.delivery.vehiclePlate}</bdi></p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: 'var(--ht-surface-container)' }}>
                      <p className="opacity-50 flex items-center gap-1"><IconOrders size={12} /> הזמנות</p>
                      <p className="font-bold">{detail.delivery.orderCount} ({detail.delivery.customerCount} לקוחות)</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: 'var(--ht-surface-container)' }}>
                      <p className="opacity-50 flex items-center gap-1"><IconOrders size={12} /> שווי</p>
                      <p className="font-bold"><bdi dir="ltr">{detail.delivery.totalValue.toLocaleString()}</bdi> ₪</p>
                    </div>
                  </div>
                  {statusGuidance[detail.delivery.status] && (
                    <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: 'var(--ht-surface-container)' }}>{statusGuidance[detail.delivery.status]}</p>
                  )}
                  {/* Actions */}
                  {(nextStatusMap[detail.delivery.status] || []).length > 0 && (
                    <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--ht-border)' }}>
                      {nextStatusMap[detail.delivery.status].map(t => (
                        <button key={t.next} onClick={() => handleStatusTransition(detail.delivery.deliveryId, t.next)} disabled={loading}
                          className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50">{t.label}</button>
                      ))}
                      {detail.delivery.status !== 'Failed' && detail.delivery.status !== 'Delivered' && (
                        <button onClick={() => openFailModal(detail.delivery.deliveryId)} className="btn-danger px-3 py-1.5 text-xs">דיווח כשל</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1">
                  {[
                    { key: 'route' as const, label: 'מסלול ותחנות', icon: <IconMap size={14} /> },
                    { key: 'content' as const, label: 'תכולת משלוח', icon: <IconInventory size={14} /> },
                    { key: 'orders' as const, label: 'הזמנות', icon: <IconOrders size={14} /> },
                    ...(detail.delivery.status === 'On The Way' || detail.delivery.status === 'Delivered' ? [{ key: 'signature' as const, label: detail.delivery.status === 'Delivered' ? 'תעודת משלוח' : 'חתימה וסגירה', icon: <IconCheck size={14} /> }] : []),
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                      className="flex-1 px-3 py-2 rounded-t-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                      style={{
                        background: detailTab === tab.key ? 'var(--ht-surface)' : 'transparent',
                        color: detailTab === tab.key ? 'var(--ht-accent)' : 'var(--ht-on-surface)',
                        borderBottom: detailTab === tab.key ? '2px solid var(--ht-accent)' : '2px solid var(--ht-border)',
                        opacity: detailTab === tab.key ? 1 : 0.5,
                      }}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-b-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)', borderTop: 'none' }}>
                  {/* TAB: Route */}
                  {detailTab === 'route' && (
                    detail.stops.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs opacity-50 mb-2">מסלול חלוקה מתוכנן — {detail.stops.length} תחנות</p>
                        {detail.stops.map((stop, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{ background: 'var(--ht-accent)', color: '#fff' }}>{stop.stopNumber}</div>
                              {i < detail.stops.length - 1 && <div className="w-px flex-1 my-1" style={{ background: 'var(--ht-border)' }}></div>}
                            </div>
                            <div className="flex-1 p-3 rounded-lg" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm">{stop.customerName}</span>
                                <span style={{ ...getStatusBadgeStyle(stop.orderStatus), fontSize: '10px', padding: '1px 6px' }}>{stop.orderStatus === 'Approved' ? 'ממתין למסירה' : statusLabels[stop.orderStatus] || stop.orderStatus}</span>
                              </div>
                              <div className="flex flex-col gap-0.5 mt-1 text-xs opacity-60">
                                <span className="flex items-center gap-1"><IconMapPin size={12} /> {stop.address}</span>
                                <span className="flex items-center gap-1"><IconPhone size={12} /> <bdi dir="ltr">{stop.phone}</bdi></span>
                              </div>
                              <p className="text-xs mt-1">הזמנה #{stop.orderId} — <bdi dir="ltr">{stop.orderAmount.toLocaleString()}</bdi> ₪</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm opacity-50 py-4 text-center">אין תחנות במשלוח</p>
                  )}

                  {/* TAB: Content */}
                  {detailTab === 'content' && (
                    detail.products.length > 0 ? (
                      <table className="w-full text-start text-sm">
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--ht-accent)' }}>
                            <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>מוצר</th>
                            <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>כמות</th>
                            <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>הזמנות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.products.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                              <td className="py-2 font-medium">{p.productName}</td>
                              <td className="py-2"><bdi dir="ltr">{p.totalQuantity.toLocaleString()}</bdi> יחידות</td>
                              <td className="py-2">{p.orderCount} {p.orderCount === 1 ? 'הזמנה' : 'הזמנות'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--ht-border)' }}>
                            <td className="pt-2 font-bold">סה״כ</td>
                            <td className="pt-2 font-bold"><bdi dir="ltr">{detail.products.reduce((s, p) => s + p.totalQuantity, 0).toLocaleString()}</bdi> יחידות</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : <p className="text-sm opacity-50 py-4 text-center">אין מוצרים במשלוח</p>
                  )}

                  {/* TAB: Orders */}
                  {detailTab === 'orders' && (
                    detail.orders.length > 0 ? (
                      <div className="space-y-2">
                        {detail.orders.map(o => (
                          <div key={o.orderId} className="p-3 rounded-lg" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm" style={{ color: 'var(--ht-accent)' }}>#{o.orderId}</span>
                                <span className="text-sm">{o.customerName}</span>
                              </div>
                              <span className="text-sm font-medium"><bdi dir="ltr">{o.totalAmount.toLocaleString()}</bdi> ₪</span>
                            </div>
                            <p className="text-xs opacity-60 flex items-center gap-1"><IconMapPin size={10} /> {o.address}</p>
                            <p className="text-xs mt-1"><span style={{ ...getStatusBadgeStyle(o.status), fontSize: '10px', padding: '1px 6px' }}>{orderStatusLabels[o.status] || o.status}</span></p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm opacity-50 py-4 text-center">אין הזמנות במשלוח</p>
                  )}

                  {/* TAB: Signature / Delivery Note */}
                  {detailTab === 'signature' && (
                    detail.delivery.status === 'On The Way' ? (
                      <div>
                        <p className="text-sm font-medium mb-2">יש להחתים את הלקוח לפני סגירת המשלוח</p>
                        {!hasSigned && <p className="text-xs mb-2" style={{ color: 'var(--ht-warning)' }}>נדרשת חתימה לפני אישור</p>}
                        <div className="rounded-lg mb-3 overflow-hidden" style={{ border: '2px solid var(--ht-border)' }}>
                          <canvas ref={canvasRef} width={500} height={150} className="w-full cursor-crosshair" style={{ background: '#fafbfc' }}
                            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                            onTouchStart={startDrawTouch} onTouchMove={drawTouch} onTouchEnd={() => setIsDrawing(false)} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={clearSignature} className="btn-ghost px-4 py-2 text-sm">ניקוי</button>
                          <button onClick={handleComplete} disabled={loading || !hasSigned}
                            className="btn-success flex-1 py-2 text-sm text-white font-medium disabled:opacity-50">
                            {loading ? 'סוגר משלוח...' : 'אישור מסירה וסגירת משלוח'}
                          </button>
                        </div>
                      </div>
                    ) : detail.delivery.status === 'Delivered' ? (
                      <div>
                        <p className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--ht-success)' }}><IconCheck size={16} /> המשלוח הושלם</p>
                        {detail.deliveryNotes.length > 0 ? detail.deliveryNotes.map(n => (
                          <div key={n.noteId} className="p-3 rounded-lg" style={{ background: 'var(--ht-success-bg)', border: '1px solid var(--ht-border)' }}>
                            <p className="text-sm">תעודת משלוח #{n.noteId}</p>
                            <p className="text-xs opacity-60">נוצרה: <bdi dir="ltr">{new Date(n.createdAt).toLocaleString('he-IL')}</bdi></p>
                            <p className="text-xs">נשלחה במייל: {n.sentToEmail ? 'כן' : 'לא'}</p>
                          </div>
                        )) : <p className="text-sm opacity-50">אין תעודת משלוח</p>}
                        {detail.delivery.arrivalTime && (
                          <p className="text-xs opacity-50 mt-2">זמן הגעה: <bdi dir="ltr">{new Date(detail.delivery.arrivalTime).toLocaleString('he-IL')}</bdi></p>
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Fail modal */}
      {showFailModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="fail-title"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowFailModal(false)}>
          <div dir="rtl" onClick={e => e.stopPropagation()} className="rounded-xl p-6" style={{ background: '#fff', maxWidth: '420px', width: '90%' }}>
            <h3 id="fail-title" className="text-base font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>דיווח כשל במשלוח</h3>
            <label htmlFor="fail-reason" className="block text-sm mb-1 opacity-70">סיבת הכשל (אופציונלי)</label>
            <textarea id="fail-reason" value={failReason} onChange={e => setFailReason(e.target.value)} rows={3}
              className="w-full rounded-lg text-sm p-3 mb-4 resize-none" style={{ border: '1px solid var(--ht-border)', background: 'var(--ht-surface-container)' }}
              placeholder="ניתן לפרט..." />
            <div className="flex gap-3">
              <button onClick={confirmFail} className="btn-danger flex-1 py-2 text-sm text-white">אישור דיווח כשל</button>
              <button onClick={() => setShowFailModal(false)} className="btn-ghost flex-1 py-2 text-sm">חזרה</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
