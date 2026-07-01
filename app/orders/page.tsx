'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { input, inputFocus, inputBlur, btnPrimary, btnGhost, getStatusBadgeStyle } from '../components/styles';
import { IconCheck, IconX, IconAlertTriangle, IconCreditCard, IconInventory, IconOrders, IconPitaWhite } from '../components/Icons';

interface Product { productId: number; productName: string; basePrice: number; }
interface Customer { customerId: number; businessName: string; creditLimit: number; currentBalance: number; }
interface OrderItemRow { productId: number; productName: string; quantity: number; unitPrice: number; }
interface OrderHistoryItem { orderItemId: number; orderId: number; productId: number; quantity: number; unitPrice: number; productName: string; }

const orderStatusLabels: Record<string, string> = { Draft: 'טיוטה', Approved: 'מאושרת', Rejected: 'נדחתה', Delivered: 'נמסרה' };

const getProductIcon = () => <IconPitaWhite size={28} />;

// Supabase returns "timestamp without time zone" values (no 'Z' suffix)
// that are actually UTC. Append 'Z' so JS parses them as UTC, not local —
// otherwise a just-created order looks "3 hours ago" in Israel (UTC+3).
function parseUTC(iso: string): number {
  if (!iso) return 0;
  const hasTz = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTz ? iso : iso + 'Z').getTime();
}

function relativeTime(iso: string): string {
  if (!iso) return '';
  const diffMin = Math.floor((Date.now() - parseUTC(iso)) / 60000);
  if (diffMin < 1) return 'הרגע';
  if (diffMin < 60) return `לפני ${diffMin} דק׳`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const dys = Math.floor(h / 24);
  if (dys === 1) return 'אתמול';
  if (dys < 7) return `לפני ${dys} ימים`;
  return new Date(parseUTC(iso)).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

function getRejectionDetails(reason: string): { icon: React.ReactNode; title: string; explanation: string } {
  if (reason.includes('אשראי')) return { icon: <IconCreditCard size={20} />, title: 'חריגה ממסגרת אשראי', explanation: 'סכום ההזמנה חורג מהמסגרת שהוגדרה ללקוח.' };
  if (reason.includes('זמינ') || reason.includes('מוצר')) return { icon: <IconInventory size={20} />, title: 'מוצרים לא זמינים במלאי', explanation: 'חלק מהמוצרים שנבחרו אינם זמינים כרגע.' };
  return { icon: <IconAlertTriangle size={20} />, title: 'ההזמנה לא אושרה', explanation: '' };
}

export default function OrdersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // ---- order list filter / search ----
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // mode: 'new' = creation form, number = viewing an existing order
  const [mode, setMode] = useState<'new' | number>('new');

  // creation form state
  const [selectedCustomer, setSelectedCustomer] = useState<number>(0);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // order detail state
  const [detailItems, setDetailItems] = useState<OrderHistoryItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // new customer modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ businessName: '', phone: '', email: '', address: '', creditLimit: '' });
  const [newCustLoading, setNewCustLoading] = useState(false);
  const [newCustError, setNewCustError] = useState('');

  const router = useRouter();

  const loadCustomers = async () => {
    const c = await (await fetch('/api/customers')).json();
    if (Array.isArray(c)) setCustomers(c);
  };
  const loadOrders = async () => {
    const o = await (await fetch('/api/orders')).json();
    if (Array.isArray(o)) setOrders(o);
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/orders').then(r => r.json()),
    ]).then(([c, p, o]) => {
      if (Array.isArray(c)) setCustomers(c);
      if (Array.isArray(p)) setProducts(p);
      if (Array.isArray(o)) setOrders(o);
    }).catch(console.error).finally(() => setPageLoading(false));
  }, [router]);

  // ---- creation handlers ----
  const addItem = (product: Product) => {
    if (items.find(i => i.productId === product.productId)) return;
    setItems([...items, { productId: product.productId, productName: product.productName, quantity: 100, unitPrice: product.basePrice }]);
  };
  const updateQuantity = (pid: number, qty: number) => setItems(items.map(i => i.productId === pid ? { ...i, quantity: Math.max(1, qty) } : i));
  const removeItem = (pid: number) => setItems(items.filter(i => i.productId !== pid));
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const selectedCust = customers.find(c => c.customerId === selectedCustomer);

  const startNewOrder = () => {
    setMode('new'); setSelectedCustomer(0); setItems([]); setRequiredDeliveryDate(''); setResult(null);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || items.length === 0) return;
    setLoading(true); setResult(null);
    try {
      const body: any = {
        customerId: selectedCustomer,
        itemsList: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      };
      if (requiredDeliveryDate) body.requiredDeliveryDate = requiredDeliveryDate;
      const data = await (await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
      setResult(data);
      if (data.success) { setItems([]); setSelectedCustomer(0); setRequiredDeliveryDate(''); }
      await loadOrders();
    } catch { setResult({ success: false, reason: 'שגיאת חיבור לשרת' }); }
    finally { setLoading(false); }
  };

  const handleCreateCustomer = async () => {
    if (!newCustForm.businessName.trim() || !newCustForm.phone.trim()) { setNewCustError('שם העסק וטלפון הם שדות חובה'); return; }
    if (!/^0\d{9}$/.test(newCustForm.phone.replace(/\D/g, ''))) { setNewCustError('מספר טלפון לא תקין — יש להזין 10 ספרות המתחילות ב-0'); return; }
    setNewCustLoading(true); setNewCustError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: newCustForm.businessName.trim(), phone: newCustForm.phone.trim(),
          email: newCustForm.email.trim(), address: newCustForm.address.trim(),
          creditLimit: Number(newCustForm.creditLimit) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadCustomers();
        setSelectedCustomer(data.customerId);
        setShowNewCustomerModal(false);
        setNewCustForm({ businessName: '', phone: '', email: '', address: '', creditLimit: '' });
      } else setNewCustError(data.error || 'שגיאה ביצירת לקוח');
    } catch { setNewCustError('שגיאת חיבור לשרת'); }
    finally { setNewCustLoading(false); }
  };

  // ---- open existing order detail ----
  const openOrder = async (orderId: number) => {
    setMode(orderId); setResult(null); setDetailLoading(true); setDetailItems([]);
    try {
      const data = await (await fetch(`/api/orders/items?orderId=${orderId}`)).json();
      if (Array.isArray(data)) setDetailItems(data);
    } catch {} finally { setDetailLoading(false); }
  };

  const currentStep = !selectedCustomer ? 1 : items.length === 0 ? 2 : 3;
  const selectedOrder = typeof mode === 'number' ? orders.find((o: any) => (o.orderId || o.order_id) === mode) : null;

  // Apply search (customer name / order number) + status filter to the list
  const filteredOrders = orders.filter((o: any) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const oid = String(o.orderId || o.order_id || '');
    return (o.businessName || '').toLowerCase().includes(q) || oid.includes(q.replace('#', ''));
  });
  const statusFilters = [
    { k: 'all', l: 'הכל' },
    { k: 'Approved', l: 'מאושרת' },
    { k: 'Delivered', l: 'נמסרה' },
    { k: 'Rejected', l: 'נדחתה' },
    { k: 'Draft', l: 'טיוטה' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — ניהול הזמנות" />

      <div className="flex h-[calc(100vh-56px)]">
        {/* ========== SIDEBAR ========== */}
        <div className="w-72 shrink-0 overflow-y-auto p-3 space-y-3" style={{ background: 'var(--ht-primary)' }}>
          <button onClick={startNewOrder}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            style={{ background: mode === 'new' ? '#fff' : 'var(--ht-accent)', color: mode === 'new' ? 'var(--ht-accent)' : '#fff' }}>
            <IconOrders size={16} /> הזמנה חדשה
          </button>

          {/* ----- search + status filter ----- */}
          <div className="space-y-2 px-0.5">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי לקוח או מס׳ הזמנה"
                className="w-full ps-3 pe-8 py-2 rounded-lg text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--ht-accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="ניקוי חיפוש"
                  className="absolute top-1/2 -translate-y-1/2 end-2 w-5 h-5 flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                  <IconX size={11} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {statusFilters.map(s => (
                <button key={s.k} onClick={() => setStatusFilter(s.k)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: statusFilter === s.k ? '#fff' : 'rgba(255,255,255,0.08)',
                    color: statusFilter === s.k ? 'var(--ht-accent)' : 'rgba(255,255,255,0.6)',
                  }}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs font-bold px-2 pt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {filteredOrders.length === orders.length
              ? `הזמנות (${orders.length})`
              : `${filteredOrders.length} מתוך ${orders.length} הזמנות`}
          </p>

          {pageLoading ? (
            <div className="text-center py-4"><div className="inline-block w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}></div></div>
          ) : orders.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>אין הזמנות עדיין</p>
          ) : filteredOrders.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>לא נמצאו הזמנות תואמות</p>
          ) : filteredOrders.map((o: any) => {
            const oid = o.orderId || o.order_id;
            const isSel = mode === oid;
            return (
              <button key={oid} onClick={() => openOrder(oid)}
                className="w-full text-start p-3 rounded-xl transition-all"
                style={{ background: isSel ? 'rgba(36,86,232,0.3)' : 'rgba(255,255,255,0.05)', border: isSel ? '1px solid var(--ht-accent)' : '1px solid transparent' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-bold text-white truncate">{o.businessName || `הזמנה #${oid}`}</span>
                  <span style={{ ...getStatusBadgeStyle(o.status), fontSize: '10px', padding: '1px 6px' }}>{orderStatusLabels[o.status] || o.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{relativeTime(o.orderDate || o.created_at)}</span>
                  <span className="text-xs font-bold text-white"><bdi dir="ltr">{(o.totalAmount || o.total_amount || 0).toLocaleString()}</bdi> ₪</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ========== MAIN ========== */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ===== MODE: NEW ORDER ===== */}
          {mode === 'new' && (
            <>
              <div className="flex items-center gap-3">
                <IconOrders size={22} />
                <div>
                  <h1 className="text-xl font-bold" style={{ color: 'var(--ht-primary)' }}>הזמנה חדשה</h1>
                  <p className="text-xs opacity-50">קליטת הזמנה עם בדיקת אשראי ומלאי אוטומטית</p>
                </div>
              </div>

              {/* Step tracker (LTR for correct order) */}
              <div className="py-4 px-6 rounded-xl" dir="ltr" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <div className="flex items-center">
                  {[{ n: 1, label: 'בחירת לקוח' }, { n: 2, label: 'בחירת מוצרים' }, { n: 3, label: 'סיכום ושליחה' }].map((step, i, arr) => (
                    <div key={step.n} className="flex items-center" style={{ flex: i < arr.length - 1 ? 1 : 'none' }}>
                      <div className="flex flex-col items-center gap-1.5" style={{ minWidth: '70px' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                          background: currentStep >= step.n ? 'var(--ht-accent)' : 'var(--ht-surface-container)',
                          border: currentStep === step.n ? '3px solid var(--ht-accent)' : 'none',
                          boxShadow: currentStep === step.n ? '0 0 0 4px var(--ht-accent-soft)' : 'none',
                        }}>
                          <span className="text-sm font-bold" style={{ color: currentStep >= step.n ? '#fff' : 'var(--ht-on-surface)', opacity: currentStep >= step.n ? 1 : 0.3 }}>{step.n}</span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: currentStep >= step.n ? 'var(--ht-accent)' : 'var(--ht-on-surface)', opacity: currentStep >= step.n ? 1 : 0.4 }}>{step.label}</span>
                      </div>
                      {i < arr.length - 1 && <div className="flex-1 h-0.5 mx-1 rounded-full" style={{ background: currentStep > step.n ? 'var(--ht-accent)' : 'var(--ht-border)', minWidth: '24px' }}></div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 1: customer */}
              <div className="p-5 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>בחירת לקוח</h2>
                <div className="flex gap-2">
                  <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(Number(e.target.value))}
                    className="flex-1 px-4 py-2.5 outline-none transition-all" style={input}
                    onFocus={(e) => Object.assign(e.target.style, inputFocus)} onBlur={(e) => Object.assign(e.target.style, inputBlur)}>
                    <option value={0}>יש לבחור לקוח...</option>
                    {customers.map(c => <option key={c.customerId} value={c.customerId}>{c.businessName}</option>)}
                  </select>
                  <button onClick={() => setShowNewCustomerModal(true)} className="px-4 py-2.5 font-bold text-sm whitespace-nowrap rounded-lg" style={btnPrimary}>+ לקוח חדש</button>
                </div>
                {selectedCust && (
                  <>
                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ht-on-surface)' }}>תאריך אספקה נדרש</label>
                      <input type="date" value={requiredDeliveryDate} onChange={(e) => setRequiredDeliveryDate(e.target.value)}
                        className="w-full max-w-xs px-4 py-2.5 outline-none transition-all" style={input} dir="ltr"
                        min={new Date().toISOString().split('T')[0]}
                        onFocus={(e) => Object.assign(e.target.style, inputFocus)} onBlur={(e) => Object.assign(e.target.style, inputBlur)} />
                    </div>
                  </>
                )}
              </div>

              {/* Step 2: products */}
              <div className="p-5 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)', opacity: selectedCustomer ? 1 : 0.5 }}>
                <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>בחירת מוצרים</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {products.map(p => {
                    const inCart = !!items.find(i => i.productId === p.productId);
                    return (
                      <button key={p.productId} onClick={() => addItem(p)} disabled={!selectedCustomer || inCart}
                        className="p-4 text-center transition-all disabled:cursor-not-allowed rounded-xl"
                        style={{ background: inCart ? 'var(--ht-info-bg)' : 'var(--ht-surface-container)', border: inCart ? '2px solid var(--ht-accent)' : '1px solid var(--ht-border)', opacity: !selectedCustomer ? 0.5 : 1 }}>
                        <div className="flex justify-center mb-1">{getProductIcon()}</div>
                        <div className="font-bold text-sm" style={{ color: 'var(--ht-primary)' }}>{p.productName}</div>
                        <div className="text-xs opacity-60 mt-1"><bdi dir="ltr">{p.basePrice} ₪</bdi> ליחידה</div>
                        {inCart && <div className="text-xs mt-1 flex items-center justify-center gap-1" style={{ color: 'var(--ht-accent)' }}><IconCheck size={12} /> בעגלה</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: cart */}
              {items.length > 0 && (
                <div className="p-5 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>סיכום הזמנה</h2>
                  <table className="w-full text-start text-sm">
                    <thead><tr style={{ borderBottom: '2px solid var(--ht-accent)' }}>
                      <th className="pb-2 text-start">מוצר</th><th className="pb-2 text-start">כמות</th><th className="pb-2 text-start">מחיר יחידה</th><th className="pb-2 text-start">סה״כ</th><th></th>
                    </tr></thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.productId} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                          <td className="py-3 font-medium">{item.productName}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateQuantity(item.productId, item.quantity - 10)} className="w-7 h-7 rounded flex items-center justify-center text-xs" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>-</button>
                              <input type="number" min={1} value={item.quantity} onChange={(e) => updateQuantity(item.productId, Number(e.target.value))} className="w-20 px-2 py-1 text-center outline-none text-sm" style={{ ...input, borderRadius: '6px' }} dir="ltr" />
                              <button onClick={() => updateQuantity(item.productId, item.quantity + 10)} className="w-7 h-7 rounded flex items-center justify-center text-xs" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>+</button>
                            </div>
                          </td>
                          <td className="py-3"><bdi dir="ltr">{item.unitPrice} ₪</bdi></td>
                          <td className="py-3 font-bold"><bdi dir="ltr">{(item.quantity * item.unitPrice).toLocaleString()} ₪</bdi></td>
                          <td className="py-3"><button onClick={() => removeItem(item.productId)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--ht-danger)' }}>הסרה</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '2px solid var(--ht-primary)' }}>
                    <span className="text-lg font-bold" style={{ color: 'var(--ht-primary)' }}>סה״כ הזמנה:</span>
                    <span className="text-2xl font-bold" style={{ color: 'var(--ht-accent)' }}><bdi dir="ltr">{total.toLocaleString()} ₪</bdi></span>
                  </div>
                  <button onClick={handleSubmit} disabled={loading} className="w-full font-bold py-3 mt-4 disabled:opacity-50 rounded-lg" style={btnPrimary}>
                    {loading ? <span className="flex items-center justify-center gap-2"><span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>מעבד הזמנה...</span> : 'שליחת הזמנה'}
                  </button>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="p-5 rounded-xl" style={{ background: result.success ? 'var(--ht-success-bg)' : 'var(--ht-danger-bg)', border: '1px solid var(--ht-border)' }}>
                  {result.success ? (
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--ht-success)' }}><IconCheck size={20} /> ההזמנה נוצרה בהצלחה</h3>
                      <p className="mt-1">מספר הזמנה: <strong>#{result.orderId}</strong> · <span style={getStatusBadgeStyle('Approved')}>מאושרת</span></p>
                    </div>
                  ) : (() => {
                    const reasonText = result.reason || result.error || 'ההזמנה לא אושרה';
                    const det = getRejectionDetails(reasonText);
                    return (
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span>{det.icon}</span>
                          <div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--ht-danger)' }}>{det.title}</h3>
                            {det.explanation && <p className="text-sm mt-0.5 opacity-80">{det.explanation}</p>}
                          </div>
                        </div>
                        <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--ht-border)' }}>
                          <span className="font-medium">פירוט: </span>{reasonText}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {/* ===== MODE: ORDER DETAIL ===== */}
          {typeof mode === 'number' && selectedOrder && (() => {
            const o = selectedOrder;
            const oid = o.orderId || o.order_id;
            const cust = customers.find(c => c.customerId === (o.customerId || o.customer_id));
            const amount = o.totalAmount || o.total_amount || 0;
            const qty = detailItems.reduce((s, it) => s + (it.quantity || 0), 0);
            // derive rejection reason from credit (same logic as validateOrder)
            let rejectionReason = '';
            if (o.status === 'Rejected' && cust) {
              rejectionReason = (cust.currentBalance + amount > cust.creditLimit) ? 'חריגת מסגרת אשראי' : 'מלאי לא זמין';
            }
            return (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconOrders size={22} />
                    <div>
                      <h1 className="text-xl font-bold" style={{ color: 'var(--ht-primary)' }}>{o.businessName || `הזמנה #${oid}`}</h1>
                      <p className="text-xs opacity-50">הזמנה #{oid} · {relativeTime(o.orderDate || o.created_at)}</p>
                    </div>
                  </div>
                  <span style={getStatusBadgeStyle(o.status)}>{orderStatusLabels[o.status] || o.status}</span>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: <><bdi dir="ltr">{amount.toLocaleString()}</bdi> ₪</>, label: 'סכום ההזמנה' },
                    { value: qty > 0 ? qty.toLocaleString() : '—', label: 'כמות פיתות' },
                    { value: o.requiredDeliveryDate || o.required_delivery_date ? new Date(o.requiredDeliveryDate || o.required_delivery_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : '—', label: 'תאריך אספקה' },
                  ].map((k, i) => (
                    <div key={i} className="rounded-xl p-4 text-center" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                      <p className="text-xl font-bold" style={{ color: 'var(--ht-primary)' }}>{k.value}</p>
                      <p className="text-xs opacity-50 mt-0.5">{k.label}</p>
                    </div>
                  ))}
                </div>

                {/* Rejection reason */}
                {o.status === 'Rejected' && rejectionReason && (
                  <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--ht-danger-bg)', border: '1px solid var(--ht-border)' }}>
                    <IconX size={18} />
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--ht-danger)' }}>{rejectionReason}</p>
                      <p className="text-xs opacity-70 mt-0.5">ההזמנה לא אושרה אוטומטית במהלך הקליטה</p>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="p-5 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>פריטי ההזמנה</h3>
                  {detailLoading ? (
                    <div className="text-center py-4"><div className="inline-block w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div></div>
                  ) : detailItems.length === 0 ? (
                    <p className="text-sm opacity-50">אין פריטים להצגה {o.status === 'Rejected' && '(הזמנה שנדחתה — פריטים לא נשמרו)'}</p>
                  ) : (
                    <table className="w-full text-start text-sm">
                      <thead><tr style={{ borderBottom: '2px solid var(--ht-border)' }}>
                        <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>מוצר</th>
                        <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>כמות</th>
                        <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>מחיר יחידה</th>
                        <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>סה״כ</th>
                      </tr></thead>
                      <tbody>
                        {detailItems.map(it => (
                          <tr key={it.orderItemId} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                            <td className="py-2.5 font-medium">{it.productName}</td>
                            <td className="py-2.5"><bdi dir="ltr">{it.quantity.toLocaleString()}</bdi></td>
                            <td className="py-2.5"><bdi dir="ltr">{it.unitPrice} ₪</bdi></td>
                            <td className="py-2.5 font-bold"><bdi dir="ltr">{(it.quantity * it.unitPrice).toLocaleString()} ₪</bdi></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewCustomerModal(false); }}>
          <div className="w-full max-w-md mx-4 p-6 rounded-xl" style={{ background: 'var(--ht-surface)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ht-primary)' }}>הוספת לקוח חדש</h2>
            <div className="space-y-3">
              {[
                { k: 'businessName', label: 'שם העסק *', ph: 'שם העסק', dir: 'rtl' },
                { k: 'phone', label: 'טלפון *', ph: '050-0000000', dir: 'ltr' },
                { k: 'email', label: 'אימייל', ph: 'email@example.com', dir: 'ltr' },
                { k: 'address', label: 'כתובת', ph: 'כתובת העסק', dir: 'rtl' },
                { k: 'creditLimit', label: 'מסגרת אשראי', ph: '0', dir: 'ltr' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  <input type={f.k === 'creditLimit' ? 'number' : 'text'} value={(newCustForm as any)[f.k]}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (f.k === 'phone') {
                        v = v.replace(/\D/g, '').slice(0, 10);
                        if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
                      }
                      setNewCustForm({ ...newCustForm, [f.k]: v });
                    }}
                    inputMode={f.k === 'phone' ? 'tel' : undefined}
                    className="w-full px-4 py-2.5 outline-none transition-all" style={input} placeholder={f.ph} dir={f.dir as any}
                    onFocus={(e) => Object.assign(e.target.style, inputFocus)} onBlur={(e) => Object.assign(e.target.style, inputBlur)} />
                </div>
              ))}
            </div>
            {newCustError && <p className="mt-3 text-sm font-medium" style={{ color: 'var(--ht-danger)' }}>{newCustError}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={handleCreateCustomer} disabled={newCustLoading} className="flex-1 font-bold py-2.5 disabled:opacity-50 rounded-lg" style={btnPrimary}>
                {newCustLoading ? 'יוצר...' : 'יצירת לקוח'}
              </button>
              <button onClick={() => { setShowNewCustomerModal(false); setNewCustError(''); }} className="px-6 py-2.5 font-medium rounded-lg" style={btnGhost}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
