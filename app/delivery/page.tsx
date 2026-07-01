'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { card, getStatusBadgeStyle } from '../components/styles';
import { IconDelivery, IconCheck, IconX, IconAlertTriangle, IconRoute, IconOrders, IconInventory, IconMapPin, IconPhone, IconUser, IconMap, IconClock } from '../components/Icons';
import dynamic from 'next/dynamic';
const DeliveryMap = dynamic(() => import('../components/DeliveryMap'), { ssr: false });

interface DeliveryListItem {
  deliveryId: number; driverId: number; driverName: string; vehicleId: number; vehiclePlate: string;
  status: string; departureTime: string | null; arrivalTime: string | null; createdAt: string;
  orderCount: number; totalValue: number;
}
interface DeliveryDetail {
  delivery: DeliveryListItem & { customerCount: number; vehicleCapacity: number };
  orders: { orderId: number; customerName: string; address: string; phone: string; status: string; totalAmount: number; requiredDate: string | null; items: { productName: string; quantity: number; unitPrice: number }[] }[];
  stops: { stopNumber: number; orderId: number; customerName: string; address: string; phone: string; email: string; orderAmount: number; orderStatus: string; requiredDate: string | null }[];
  products: { productName: string; totalQuantity: number; orderCount: number }[];
  deliveryNotes: { noteId: number; orderId: number | null; signerName: string | null; digitalSignature: string | null; createdAt: string; sentToEmail: boolean }[];
}

const nextStatusMap: Record<string, { next: string; label: string }[]> = {
  Planned: [{ next: 'Assigned', label: 'שיוך נהג לרכב' }],
  Assigned: [{ next: 'Loaded', label: 'סימון רכב כנטען' }],
  Loaded: [{ next: 'On The Way', label: 'יציאה לדרך' }],
  OnTheWay: [],
  'On The Way': [],
  Failed: [{ next: 'Planned', label: 'תזמון מחדש' }],
};
const statusLabels: Record<string, string> = { Planned: 'מתוכנן', Assigned: 'שויך', Loaded: 'נטען', OnTheWay: 'בדרך', 'On The Way': 'בדרך', Delivered: 'נמסר', Failed: 'נכשל' };
const stateSteps = [
  { key: 'Planned', label: 'מתוכנן' },
  { key: 'Assigned', label: 'שויך' },
  { key: 'Loaded', label: 'נטען' },
  { key: 'OnTheWay', label: 'בדרך' },
  { key: 'Delivered', label: 'נמסר' },
];
const statusGuidance: Record<string, string> = {
  Planned: 'יש לשייך נהג ורכב למשלוח',
  Assigned: 'יש לטעון את הסחורה לרכב',
  Loaded: 'הרכב נטען ומוכן — יש להתחיל את המסלול',
  OnTheWay: 'הנהג בדרך — יש להחתים כל עסק בנפרד בסיום המסירה אצלו',
  'On The Way': 'הנהג בדרך — יש להחתים כל עסק בנפרד בסיום המסירה אצלו',
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
  const [detailTab, setDetailTab] = useState<'route' | 'map' | 'content' | 'orders' | 'signature'>('route');
  const [showFailModal, setShowFailModal] = useState(false);
  const [failDeliveryId, setFailDeliveryId] = useState<number | null>(null);
  const [failReason, setFailReason] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [signingOrderId, setSigningOrderId] = useState<number | null>(null);
  const [signerName, setSignerName] = useState('');
  const [viewNoteOrderId, setViewNoteOrderId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const user = JSON.parse(stored);
    setUserRole(user.role);
    const empId = user.role === 'Manager' ? undefined : user.employeeId;
    setCurrentEmployeeId(empId);
    const today = new Date().toISOString().split('T')[0];
    // Load the list FIRST so the spinner clears immediately and the
    // empty-state shows right away. Consolidation/auto-assign are heavy
    // background jobs — running them before loadList made the sidebar
    // spin "forever" on days with no deliveries.
    (async () => {
      await loadList(empId, today);
      if (user.role === 'Manager') {
        try { await fetch('/api/delivery/consolidate-all', { method: 'POST' }); } catch { /* non-fatal */ }
      }
      await autoAssignPending(today);
      // Refresh once after the background cleanup (no spinner — list already shown)
      loadList(empId, today);
    })();
  }, [router]);

  const loadList = async (driverId?: number, date?: string) => {
    try {
      let url = '/api/delivery';
      const params = new URLSearchParams();
      if (driverId) params.set('driverId', String(driverId));
      if (date) params.set('date', date);
      if (params.toString()) url += '?' + params.toString();
      const data = await (await fetch(url)).json();
      if (Array.isArray(data)) setDeliveries(data);
    } catch {} finally { setPageLoading(false); }
  };

  /**
   * Auto-resolve any orphan orders for the date by routing them through
   * the same auto-assignment service used at order creation. Runs silently
   * — the manager never has to click anything.
   */
  const autoAssignPending = async (date: string) => {
    try {
      const data = await (await fetch('/api/delivery/auto-assign-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryDate: date }),
      })).json();
      if (data.success && data.assignedCount > 0) {
        // Refresh the list to show the newly-created deliveries
        await loadList(currentEmployeeId, date);
      }
    } catch {
      // Silent fail — the user shouldn't see infrastructure errors here
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedId(null);
    setDetail(null);
    setPageLoading(true);
    loadList(currentEmployeeId, date);
    autoAssignPending(date);
  };

  const loadDetail = async (deliveryId: number) => {
    setSelectedId(deliveryId); setDetailLoading(true); setDetail(null); setDetailTab('route');
    try {
      const data = await (await fetch(`/api/delivery/detail?deliveryId=${deliveryId}`)).json();
      if (data.delivery) setDetail(data);
    } catch {} finally { setDetailLoading(false); }
  };

  // Signature canvas — coordinate-aware for CSS scaling
  const getPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(c, e.clientX, e.clientY);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const pos = getPos(c, e.clientX, e.clientY);
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#0A1A2F';
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    setHasSigned(true);
  };
  const stopDraw = () => setIsDrawing(false);

  const startDrawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    setIsDrawing(true);
    const t = e.touches[0];
    const pos = getPos(c, t.clientX, t.clientY);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };
  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const t = e.touches[0];
    const pos = getPos(c, t.clientX, t.clientY);
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#0A1A2F';
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    setHasSigned(true);
  };
  const clearSignature = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setHasSigned(false);
  };

  const handleStatusTransition = async (deliveryId: number, newStatus: string) => {
    setLoading(true); setResult(null);
    try {
      const data = await (await fetch('/api/delivery', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryId, newStatus }) })).json();
      if (data.success) { setResult({ success: true, message: `סטטוס עודכן — ${statusLabels[newStatus] || newStatus}` }); await loadList(currentEmployeeId, selectedDate); if (selectedId === deliveryId) loadDetail(deliveryId); }
      else setResult({ success: false, message: data.error || 'שגיאה' });
    } catch { setResult({ success: false, message: 'שגיאת חיבור' }); } finally { setLoading(false); }
  };

  const handleCompleteOrder = async (orderId: number) => {
    if (!hasSigned || !signerName.trim()) return;
    const sig = canvasRef.current?.toDataURL('image/png') || '';
    setLoading(true); setResult(null);
    try {
      const data = await (await fetch('/api/delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, signatureFile: sig, signerName: signerName.trim() }) })).json();
      if (data.success) {
        setResult({ success: true, completed: true, deliveryNoteId: data.deliveryNoteId });
        clearSignature(); setSignerName(''); setSigningOrderId(null);
        await loadList(currentEmployeeId, selectedDate);
        if (selectedId) loadDetail(selectedId);
      } else setResult({ success: false, message: data.error || 'שגיאה' });
    } catch { setResult({ success: false, message: 'שגיאת חיבור' }); } finally { setLoading(false); }
  };

  const si = (status: string) => {
    const s = status === 'On The Way' ? 'OnTheWay' : status;
    return stateSteps.findIndex(st => st.key === s);
  };
  const totalProducts = detail?.products.reduce((s, p) => s + p.totalQuantity, 0) || 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — ניהול משלוחים" />

      {/* Result toast */}
      {result && (
        <div className="fixed top-20 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ background: result.success ? 'var(--ht-success)' : 'var(--ht-danger)', color: '#fff', left: '50%', transform: 'translateX(-50%)' }}>
          {result.completed ? `המסירה אושרה — תעודה #${result.deliveryNoteId}` : result.message}
        </div>
      )}

      <div className="flex h-[calc(100vh-56px)]">
        {/* ========== SIDEBAR — dark delivery list ========== */}
        <div className="w-72 shrink-0 overflow-y-auto p-3 space-y-2" style={{ background: 'var(--ht-primary)' }}>
          <p className="text-xs font-bold px-2 pt-1 pb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {userRole === 'Manager' ? 'כל המשלוחים' : 'המשלוחים שלי'}
          </p>
          {/* Date picker */}
          <div className="px-1 pb-2">
            <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" dir="ltr"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
          </div>
          {pageLoading ? (
            <div className="text-center py-8"><div className="inline-block w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}></div></div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-8 px-3">
              <div className="flex justify-center mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                <IconDelivery size={32} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>אין משלוחים ליום זה</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>בחרו תאריך אחר או הציגו את כל המשלוחים</p>
              <button onClick={() => { setSelectedDate(''); setPageLoading(true); loadList(currentEmployeeId); }}
                className="text-xs mt-3 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                הצג את כל המשלוחים
              </button>
            </div>
          ) : deliveries.map(d => {
            const isSelected = selectedId === d.deliveryId;
            return (
              <button key={d.deliveryId} onClick={() => loadDetail(d.deliveryId)}
                className="w-full text-start p-3 rounded-xl transition-all"
                style={{
                  background: isSelected ? 'rgba(36,86,232,0.3)' : 'rgba(255,255,255,0.05)',
                  border: isSelected ? '1px solid var(--ht-accent)' : '1px solid transparent',
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <IconDelivery size={14} className="shrink-0" />
                  <span className="text-sm font-bold text-white truncate">{(d as any).routeLabel || routeLabels[d.deliveryId] || 'קו חלוקה'}</span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {d.driverName} | <bdi dir="ltr">{d.vehiclePlate}</bdi>
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span style={{ ...getStatusBadgeStyle(d.status === 'On The Way' ? 'OnTheWay' : d.status), fontSize: '10px', padding: '1px 6px' }}>
                    {statusLabels[d.status] || d.status}
                  </span>
                  <span className="text-xs font-bold text-white"><bdi dir="ltr">{d.totalValue.toLocaleString()}</bdi> ₪</span>
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <span>{d.orderCount} הזמנות</span>
                </div>
              </button>
            );
          })}

          {/* Unassigned orders alert */}
        </div>

        {/* ========== MAIN CONTENT ========== */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!selectedId && !detailLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center opacity-30">
                <IconDelivery size={48} className="mx-auto" />
                <p className="mt-3 text-sm">יש לבחור משלוח מהרשימה</p>
              </div>
            </div>
          )}

          {detailLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div>
            </div>
          )}

          {detail && !detailLoading && (() => {
            const idx = si(detail.delivery.status);
            const isOnTheWay = detail.delivery.status === 'OnTheWay' || detail.delivery.status === 'On The Way';
            const isDelivered = detail.delivery.status === 'Delivered';

            // Business rule: a delivery can only be managed on its scheduled
            // day. Compare today's date to the orders' required_delivery_date.
            const todayStr = new Date().toISOString().substring(0, 10);
            const requiredDateStr = detail.orders[0]?.requiredDate?.substring(0, 10) || null;
            const isFuture = requiredDateStr ? todayStr < requiredDateStr : false;
            const requiredDateDisplay = requiredDateStr
              ? new Date(requiredDateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
              : '';

            return (
              <>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconDelivery size={22} />
                    <div>
                      <h1 className="text-xl font-bold" style={{ color: 'var(--ht-primary)' }}>{(detail.delivery as any).routeLabel || routeLabels[detail.delivery.deliveryId] || 'קו חלוקה'}</h1>
                      <p className="text-xs opacity-50">
                        משלוח #{detail.delivery.deliveryId} · {detail.delivery.driverName} · <bdi dir="ltr">{detail.delivery.vehiclePlate}</bdi>
                      </p>
                    </div>
                  </div>
                  <span style={getStatusBadgeStyle(detail.delivery.status === 'On The Way' ? 'OnTheWay' : detail.delivery.status)}>
                    {statusLabels[detail.delivery.status] || detail.delivery.status}
                  </span>
                </div>

                {/* ===== Progress tracker (circle style — LTR for correct order) ===== */}
                <div className="py-4 px-6 rounded-xl" dir="ltr" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                  <div className="flex items-center">
                    {stateSteps.map((step, i) => {
                      const done = i <= idx;
                      const current = i === idx;
                      return (
                        <div key={step.key} className="flex items-center" style={{ flex: i < stateSteps.length - 1 ? 1 : 'none' }}>
                          <div className="flex flex-col items-center gap-1.5" style={{ minWidth: '56px' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all" style={{
                              background: done ? 'var(--ht-accent)' : 'var(--ht-surface-container)',
                              border: current ? '3px solid var(--ht-accent)' : done ? 'none' : '2px solid var(--ht-border)',
                              boxShadow: current ? '0 0 0 4px var(--ht-accent-soft)' : 'none',
                            }}>
                              {done && !current ? <IconCheck size={16} className="text-white" /> : (
                                <span className="text-xs font-bold" style={{ color: done ? '#fff' : 'var(--ht-on-surface)', opacity: done ? 1 : 0.3 }}>{i + 1}</span>
                              )}
                            </div>
                            <span className="text-xs font-medium" style={{ color: current ? 'var(--ht-accent)' : 'var(--ht-on-surface)', opacity: current ? 1 : done ? 0.7 : 0.3 }}>
                              {step.label}
                            </span>
                          </div>
                          {i < stateSteps.length - 1 && (
                            <div className="flex-1 h-0.5 mx-1 rounded-full" style={{ background: i < idx ? 'var(--ht-accent)' : 'var(--ht-border)', minWidth: '20px' }}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ===== KPI Cards row ===== */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: <IconInventory size={20} />, value: `${totalProducts.toLocaleString()} יח׳`, label: 'כמות פיתות' },
                    { icon: <IconMapPin size={20} />, value: String(detail.stops.length), label: 'תחנות במסלול' },
                    { icon: <IconOrders size={20} />, value: String(detail.delivery.orderCount), label: 'הזמנות' },
                    { icon: <IconOrders size={20} />, value: `${detail.delivery.totalValue.toLocaleString()} ₪`, label: 'שווי כולל' },
                  ].map((kpi, i) => (
                    <div key={i} className="rounded-xl p-4 text-center" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                      <div className="flex justify-center mb-2"><span style={{ color: 'var(--ht-accent)' }}>{kpi.icon}</span></div>
                      <p className="text-xl font-bold" style={{ color: 'var(--ht-primary)' }}>{kpi.value}</p>
                      <p className="text-xs opacity-50 mt-0.5">{kpi.label}</p>
                    </div>
                  ))}
                </div>

                {/* ===== Tabs ===== */}
                <div className="flex gap-1 rounded-t-xl overflow-hidden" style={{ background: 'var(--ht-surface-container)' }}>
                  {[
                    { key: 'route' as const, label: 'מסלול ותחנות', icon: <IconMapPin size={14} /> },
                    { key: 'map' as const, label: 'מפת ניווט', icon: <IconMap size={14} /> },
                    { key: 'content' as const, label: 'תכולת משלוח', icon: <IconInventory size={14} /> },
                    { key: 'orders' as const, label: 'הזמנות במשלוח', icon: <IconOrders size={14} /> },
                    ...((isOnTheWay || isDelivered) ? [{ key: 'signature' as const, label: 'מסירה ללקוחות', icon: <IconCheck size={14} /> }] : []),
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                      className="flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
                      style={{
                        background: detailTab === tab.key ? 'var(--ht-surface)' : 'transparent',
                        color: detailTab === tab.key ? 'var(--ht-accent)' : 'var(--ht-on-surface)',
                        opacity: detailTab === tab.key ? 1 : 0.5,
                        borderBottom: detailTab === tab.key ? '2px solid var(--ht-accent)' : '2px solid transparent',
                      }}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* ===== Tab Content ===== */}
                <div className="rounded-b-xl p-5" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)', borderTop: 'none' }}>
                  {/* Route tab */}
                  {detailTab === 'route' && (
                    <div>
                      <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--ht-primary)' }}>מסלול חלוקה מתוכנן</h3>
                      {detail.stops.length > 0 ? (
                        <table className="w-full text-sm text-start">
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--ht-border)' }}>
                              <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>מס׳ תחנה</th>
                              <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>לקוח</th>
                              <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>כתובת</th>
                              <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>טלפון</th>
                              <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>הזמנה</th>
                              <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>סטטוס</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.stops.map(stop => (
                              <tr key={stop.stopNumber} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                                <td className="py-3">
                                  <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--ht-accent)' }}>{stop.stopNumber}</span>
                                </td>
                                <td className="py-3 font-medium">{stop.customerName}</td>
                                <td className="py-3 text-xs opacity-60">{stop.address}</td>
                                <td className="py-3 text-xs"><bdi dir="ltr">{stop.phone}</bdi></td>
                                <td className="py-3 text-xs">#{stop.orderId}</td>
                                <td className="py-3">
                                  <span style={{ ...getStatusBadgeStyle(stop.orderStatus), fontSize: '10px', padding: '2px 8px' }}>
                                    {stop.orderStatus === 'Approved' ? 'בדרך' : statusLabels[stop.orderStatus] || stop.orderStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <p className="text-sm opacity-40">אין תחנות</p>}
                    </div>
                  )}

                  {/* Map tab */}
                  {detailTab === 'map' && (
                    <DeliveryMap
                      stops={detail.stops.map(s => ({
                        customerName: s.customerName,
                        address: s.address,
                        phone: s.phone,
                        orderId: s.orderId,
                      }))}
                      userRole={userRole}
                      deliveryStatus={detail.delivery.status}
                    />
                  )}

                  {/* Content tab */}
                  {detailTab === 'content' && (
                    <div className="flex items-center gap-8">
                      <div className="shrink-0 w-32 h-32 rounded-xl flex items-center justify-center" style={{ background: 'var(--ht-surface-container)' }}>
                        <div className="text-center">
                          <p className="text-3xl font-bold" style={{ color: 'var(--ht-primary)' }}>{totalProducts.toLocaleString()}</p>
                          <p className="text-xs opacity-50">יחידות</p>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--ht-primary)' }}>תכולת משלוח</h3>
                        {detail.products.map((p, i) => (
                          <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                            <span className="font-medium">{p.productName}</span>
                            <div className="text-end">
                              <span className="font-bold"><bdi dir="ltr">{p.totalQuantity.toLocaleString()}</bdi> יחידות</span>
                              <span className="text-xs opacity-40 me-2">{p.orderCount} הזמנות</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orders tab */}
                  {detailTab === 'orders' && (
                    <div className="space-y-2">
                      {detail.orders.map(o => (
                        <div key={o.orderId} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--ht-surface-container)' }}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold" style={{ color: 'var(--ht-accent)' }}>#{o.orderId}</span>
                            <div>
                              <p className="text-sm font-medium">{o.customerName}</p>
                              <p className="text-xs opacity-50">{o.address}</p>
                            </div>
                          </div>
                          <div className="text-end">
                            <p className="text-sm font-bold"><bdi dir="ltr">{o.totalAmount.toLocaleString()}</bdi> ₪</p>
                            <span style={{ ...getStatusBadgeStyle(o.status), fontSize: '10px', padding: '1px 6px' }}>
                              {o.status === 'Approved' ? 'ממתין למסירה' : statusLabels[o.status] || o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Signature tab — each business on the route signs separately */}
                  {detailTab === 'signature' && (
                    <div className="space-y-3">
                      {isDelivered && (
                        <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--ht-success)' }}>
                          <IconCheck size={18} /><span className="font-bold text-sm">המשלוח הושלם בהצלחה — כל העסקים נחתמו</span>
                        </div>
                      )}
                      {detail.orders.map(o => {
                        const note = detail.deliveryNotes.find(n => n.orderId === o.orderId);
                        const delivered = o.status === 'Delivered';
                        const isSigningThis = signingOrderId === o.orderId;
                        return (
                          <div key={o.orderId} className="p-4 rounded-xl" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-bold text-sm" style={{ color: 'var(--ht-primary)' }}>{o.customerName}</p>
                                <p className="text-xs opacity-50">{o.address}</p>
                              </div>
                              {delivered ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--ht-success)' }}>
                                    <IconCheck size={13} /> נמסר{note?.signerName ? ` — ${note.signerName}` : ''}
                                  </span>
                                  {note && (
                                    <button onClick={() => setViewNoteOrderId(o.orderId)} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">
                                      הצג תעודת משלוח
                                    </button>
                                  )}
                                </div>
                              ) : isOnTheWay ? (
                                <button onClick={() => { setSigningOrderId(o.orderId); setSignerName(''); clearSignature(); }}
                                  disabled={isFuture} className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50 shrink-0 whitespace-nowrap">
                                  אישור מסירה
                                </button>
                              ) : (
                                <span className="text-xs opacity-40 shrink-0">ממתין ליציאה לדרך</span>
                              )}
                            </div>

                            {isSigningThis && (
                              <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px dashed var(--ht-border)' }}>
                                <div>
                                  <label className="block text-xs font-medium mb-1">שם החותם/ת בעסק</label>
                                  <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="שם מלא"
                                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--ht-border)', background: 'var(--ht-surface)' }} />
                                </div>
                                <div className="rounded-xl overflow-hidden" style={{ border: '2px solid var(--ht-border)' }}>
                                  <canvas ref={canvasRef} width={800} height={200} className="w-full cursor-crosshair rounded-lg" style={{ background: '#fafbfc', height: '140px' }}
                                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                                    onTouchStart={startDrawTouch} onTouchMove={drawTouch} onTouchEnd={() => setIsDrawing(false)} />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={clearSignature} className="btn-ghost px-3 py-2 text-xs">ניקוי חתימה</button>
                                  <button onClick={() => handleCompleteOrder(o.orderId)} disabled={loading || !hasSigned || !signerName.trim()}
                                    className="btn-primary flex-1 py-2 text-xs disabled:opacity-50">
                                    {loading ? 'שומר...' : 'אישור מסירה וסגירת ההזמנה'}
                                  </button>
                                  <button onClick={() => { setSigningOrderId(null); clearSignature(); }} className="btn-ghost px-3 py-2 text-xs">ביטול</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ===== Bottom action bar ===== */}
                {!isDelivered && (
                  <div className="grid grid-cols-3 gap-3" style={{ alignItems: 'stretch' }}>
                    {/* Next action */}
                    <div className="rounded-xl p-4" style={{
                      background: isFuture ? 'var(--ht-surface-container)' : 'var(--ht-info-bg)',
                      border: '1px solid var(--ht-border)',
                    }}>
                      {isFuture ? (
                        <>
                          <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--ht-on-surface)' }}>
                            <IconClock size={14} /> נעול עד יום האספקה
                          </p>
                          <p className="text-sm mb-2">המשלוח מתוזמן ליום {requiredDateDisplay}.</p>
                          <p className="text-xs opacity-60">ניתן יהיה לנהל אותו רק ביום עצמו — שיוך נהג, טעינה, יציאה לדרך וסגירה.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold mb-2" style={{ color: 'var(--ht-accent)' }}>פעולה הבאה</p>
                          <p className="text-sm mb-3">{statusGuidance[detail.delivery.status]}</p>
                          <div className="space-y-1.5">
                            {(nextStatusMap[detail.delivery.status === 'On The Way' ? 'OnTheWay' : detail.delivery.status] || []).map(t => (
                              <button key={t.next} onClick={() => handleStatusTransition(detail.delivery.deliveryId, t.next)} disabled={loading}
                                className="btn-primary w-full py-2 text-sm disabled:opacity-50">{t.label}</button>
                            ))}
                            {isOnTheWay && (
                              <button onClick={() => { setDetailTab('signature'); }} className="btn-primary w-full py-2 text-sm">
                                מעבר למסירה ללקוחות ←
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {/* Quick summary */}
                    <div className="rounded-xl p-4" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: 'var(--ht-primary)' }}>סיכום מהיר</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="opacity-50">נהג</span><span className="font-medium">{detail.delivery.driverName}</span></div>
                        <div className="flex justify-between"><span className="opacity-50">רכב</span><span className="font-medium" dir="ltr">{detail.delivery.vehiclePlate}</span></div>
                        {detail.delivery.departureTime && <div className="flex justify-between"><span className="opacity-50">יציאה</span><span className="font-medium text-xs"><bdi dir="ltr">{new Date(detail.delivery.departureTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</bdi></span></div>}
                      </div>
                    </div>
                    {/* Content summary */}
                    <div className="rounded-xl p-4" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: 'var(--ht-primary)' }}>תכולת משלוח</p>
                      {detail.products.map((p, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{p.productName}</span>
                          <span className="opacity-50 me-1"> — <bdi dir="ltr">{p.totalQuantity.toLocaleString()}</bdi> יחידות</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Fail modal */}
      {showFailModal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowFailModal(false)}>
          <div onClick={e => e.stopPropagation()} className="rounded-xl p-6" style={{ background: '#fff', maxWidth: '400px', width: '90%' }}>
            <h3 className="text-base font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>דיווח כשל במשלוח</h3>
            <textarea value={failReason} onChange={e => setFailReason(e.target.value)} rows={3}
              className="w-full rounded-lg text-sm p-3 mb-4 resize-none" style={{ border: '1px solid var(--ht-border)', background: 'var(--ht-surface-container)' }}
              placeholder="סיבת הכשל (אופציונלי)" />
            <div className="flex gap-2">
              <button onClick={() => { if (failDeliveryId) { setShowFailModal(false); handleStatusTransition(failDeliveryId, 'Failed'); }}} className="btn-danger flex-1 py-2 text-sm text-white">אישור</button>
              <button onClick={() => setShowFailModal(false)} className="btn-ghost flex-1 py-2 text-sm">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery note view/print modal */}
      {viewNoteOrderId !== null && (() => {
        const order = detail?.orders.find(o => o.orderId === viewNoteOrderId);
        const note = detail?.deliveryNotes.find(n => n.orderId === viewNoteOrderId);
        if (!order || !note) return null;
        return (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-white"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setViewNoteOrderId(null); }}>
            <style>{`@media print {
              body * { visibility: hidden; }
              #delivery-note-print, #delivery-note-print * { visibility: visible; }
              #delivery-note-print { position: absolute; inset: 0; width: 100%; }
              .print\\:hidden { display: none !important; }
            }`}</style>
            <div className="w-full max-w-lg rounded-xl overflow-hidden bg-white print:shadow-none print:max-w-full" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
              <div id="delivery-note-print" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--ht-primary)' }}>ד״ר פיתה — תעודת משלוח #{note.noteId}</h2>
                  <span className="text-xs opacity-50"><bdi dir="ltr">{new Date(note.createdAt).toLocaleString('he-IL')}</bdi></span>
                </div>
                <div className="text-sm space-y-1 mb-4">
                  <p><span className="opacity-50">לקוח: </span><span className="font-medium">{order.customerName}</span></p>
                  <p><span className="opacity-50">כתובת: </span>{order.address}</p>
                  <p><span className="opacity-50">הזמנה: </span>#{order.orderId}</p>
                </div>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ht-border)' }}>
                      <th className="text-start pb-1.5 text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>מוצר</th>
                      <th className="text-start pb-1.5 text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>כמות</th>
                      <th className="text-end pb-1.5 text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>סה״כ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                        <td className="py-1.5">{it.productName}</td>
                        <td className="py-1.5"><bdi dir="ltr">{it.quantity.toLocaleString()}</bdi></td>
                        <td className="py-1.5 text-end"><bdi dir="ltr">{(it.quantity * it.unitPrice).toLocaleString()}</bdi> ₪</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-sm font-bold text-end mb-4">סה״כ לתשלום: <bdi dir="ltr">{order.totalAmount.toLocaleString()}</bdi> ₪</p>
                <div>
                  <p className="text-xs opacity-50 mb-1">נחתם ע״י: {note.signerName || '—'}</p>
                  {note.digitalSignature && (
                    <img src={note.digitalSignature} alt="חתימה" className="rounded-lg" style={{ maxHeight: 90, border: '1px solid var(--ht-border)' }} />
                  )}
                </div>
              </div>
              <div className="flex gap-2 p-4 pt-0 print:hidden">
                <button onClick={() => window.print()} className="btn-primary flex-1 py-2 text-sm">הדפסה</button>
                <button onClick={() => setViewNoteOrderId(null)} className="btn-ghost px-4 py-2 text-sm">סגירה</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
