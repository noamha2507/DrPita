'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { card, input, inputFocus, inputBlur, btnPrimary, btnGhost, getStatusBadgeStyle } from '../components/styles';
import { IconCheck, IconX, IconAlertTriangle, IconCreditCard, IconInventory, IconPitaWhite, IconPitaWhole, IconPitaTabun, IconLafa, IconPitaMini } from '../components/Icons';

interface Product { productId: number; productName: string; basePrice: number; }
interface Customer { customerId: number; businessName: string; creditLimit: number; currentBalance: number; }
interface OrderItemRow { productId: number; productName: string; quantity: number; unitPrice: number; }
interface OrderHistoryItem { orderItemId: number; orderId: number; productId: number; quantity: number; unitPrice: number; productName: string; }

const orderStatusLabels: Record<string, string> = { Draft: 'טיוטה', Approved: 'מאושרת', Rejected: 'נדחתה', Delivered: 'נמסרה' };

// Product icon components for visual distinction
const productIcons: Record<string, React.ReactNode> = {
  'פיתה רגילה': <IconPitaWhite size={28} />,
};
const getProductIcon = (name: string) => productIcons[name] || <IconPitaWhite size={28} />;

// --- Fix 1: Rejection reason classifier ---
function getRejectionDetails(reason: string): { icon: React.ReactNode; title: string; explanation: string } {
  if (reason.includes('אשראי')) {
    return {
      icon: <IconCreditCard size={20} />,
      title: 'חריגה ממסגרת אשראי',
      explanation: 'סכום ההזמנה חורג מהמסגרת שהוגדרה ללקוח.',
    };
  }
  if (reason.includes('זמינ') || reason.includes('מוצר')) {
    return {
      icon: <IconInventory size={20} />,
      title: 'מוצרים לא זמינים במלאי',
      explanation: 'חלק מהמוצרים שנבחרו אינם זמינים כרגע.',
    };
  }
  return {
    icon: <IconAlertTriangle size={20} />,
    title: 'ההזמנה לא אושרה',
    explanation: '',
  };
}

export default function OrdersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number>(0);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState('');
  // Fix 2: new customer modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ businessName: '', phone: '', email: '', address: '', creditLimit: '' });
  const [newCustLoading, setNewCustLoading] = useState(false);
  const [newCustError, setNewCustError] = useState('');
  // Fix 3: expandable order history
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<Record<number, OrderHistoryItem[]>>({});
  const [orderItemsLoading, setOrderItemsLoading] = useState<number | null>(null);
  const router = useRouter();

  const loadCustomers = async () => {
    const c = await (await fetch('/api/customers')).json();
    if (Array.isArray(c)) setCustomers(c);
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

  const addItem = (product: Product) => {
    if (items.find(i => i.productId === product.productId)) return;
    setItems([...items, { productId: product.productId, productName: product.productName, quantity: 100, unitPrice: product.basePrice }]);
  };
  const updateQuantity = (pid: number, qty: number) => setItems(items.map(i => i.productId === pid ? { ...i, quantity: Math.max(1, qty) } : i));
  const removeItem = (pid: number) => setItems(items.filter(i => i.productId !== pid));
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const selectedCust = customers.find(c => c.customerId === selectedCustomer);

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
      const o = await (await fetch('/api/orders')).json();
      if (Array.isArray(o)) setOrders(o);
    } catch { setResult({ success: false, reason: 'שגיאת חיבור לשרת' }); }
    finally { setLoading(false); }
  };

  // Fix 2: Create new customer
  const handleCreateCustomer = async () => {
    if (!newCustForm.businessName.trim() || !newCustForm.phone.trim()) {
      setNewCustError('שם העסק וטלפון הם שדות חובה');
      return;
    }
    setNewCustLoading(true);
    setNewCustError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: newCustForm.businessName.trim(),
          phone: newCustForm.phone.trim(),
          email: newCustForm.email.trim(),
          address: newCustForm.address.trim(),
          creditLimit: Number(newCustForm.creditLimit) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadCustomers();
        setSelectedCustomer(data.customerId);
        setShowNewCustomerModal(false);
        setNewCustForm({ businessName: '', phone: '', email: '', address: '', creditLimit: '' });
      } else {
        setNewCustError(data.error || 'שגיאה ביצירת לקוח');
      }
    } catch {
      setNewCustError('שגיאת חיבור לשרת');
    } finally {
      setNewCustLoading(false);
    }
  };

  // Fix 3: Load order items on expand
  const toggleOrderExpand = async (orderId: number) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(orderId);
    if (!orderItems[orderId]) {
      setOrderItemsLoading(orderId);
      try {
        const data = await (await fetch(`/api/orders/items?orderId=${orderId}`)).json();
        if (Array.isArray(data)) {
          setOrderItems(prev => ({ ...prev, [orderId]: data }));
        }
      } catch { /* ignore */ }
      finally { setOrderItemsLoading(null); }
    }
  };

  // Step indicator
  const currentStep = !selectedCustomer ? 1 : items.length === 0 ? 2 : 3;

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — ניהול הזמנות" />
      <main id="main-content" className="max-w-5xl mx-auto p-6 space-y-5">

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-3">
          {[{ n: 1, label: 'בחירת לקוח' }, { n: 2, label: 'בחירת מוצרים' }, { n: 3, label: 'סיכום ושליחה' }].map((step, i) => (
            <div key={step.n} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: currentStep >= step.n ? 'var(--ht-accent)' : 'var(--ht-border)', color: currentStep >= step.n ? '#fff' : 'var(--ht-on-surface)' }}>
                  {step.n}
                </span>
                <span className="text-sm font-medium" style={{ color: currentStep >= step.n ? 'var(--ht-accent)' : '#9ca3af' }}>{step.label}</span>
              </div>
              {i < 2 && <span className="w-12 h-px mx-1" style={{ background: currentStep > step.n ? 'var(--ht-accent)' : 'var(--ht-border)' }}></span>}
            </div>
          ))}
        </div>

        {/* Step 1: Customer */}
        <div className="p-6" style={card}>
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>שלב 1 — בחירת לקוח</h2>
          <div className="flex gap-2">
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(Number(e.target.value))}
              className="flex-1 px-4 py-2.5 outline-none transition-all" style={input}
              onFocus={(e) => Object.assign(e.target.style, inputFocus)} onBlur={(e) => Object.assign(e.target.style, inputBlur)}>
              <option value={0}>יש לבחור לקוח...</option>
              {customers.map(c => <option key={c.customerId} value={c.customerId}>{c.businessName} (אשראי: {c.creditLimit?.toLocaleString()} ₪ | יתרה: {c.currentBalance?.toLocaleString()} ₪)</option>)}
            </select>
            {/* Fix 2: New customer button */}
            <button
              onClick={() => setShowNewCustomerModal(true)}
              className="px-4 py-2.5 font-bold text-sm whitespace-nowrap transition-all rounded-lg"
              style={btnPrimary}
              onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'var(--ht-accent-hover)'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'var(--ht-accent)'}
            >
              + לקוח חדש
            </button>
          </div>
          {selectedCust && (
            <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: 'var(--ht-surface-container)' }}>
              <span className="font-medium">{selectedCust.businessName}</span> — מסגרת אשראי: <bdi dir="ltr">{selectedCust.creditLimit?.toLocaleString()} ₪</bdi> | נוצל: <bdi dir="ltr">{selectedCust.currentBalance?.toLocaleString()} ₪</bdi> | פנוי: <bdi dir="ltr" className="font-bold" style={{ color: 'var(--ht-success)' }}>{((selectedCust.creditLimit || 0) - (selectedCust.currentBalance || 0)).toLocaleString()} ₪</bdi>
            </div>
          )}

          {/* Fix 4: Delivery date picker */}
          {selectedCust && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ht-on-surface)' }}>תאריך אספקה נדרש</label>
              <input
                type="date"
                value={requiredDeliveryDate}
                onChange={(e) => setRequiredDeliveryDate(e.target.value)}
                className="w-full max-w-xs px-4 py-2.5 outline-none transition-all"
                style={input}
                dir="ltr"
                min={new Date().toISOString().split('T')[0]}
                onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                onBlur={(e) => Object.assign(e.target.style, inputBlur)}
              />
            </div>
          )}
        </div>

        {/* Step 2: Products */}
        <div className="p-6" style={{ ...card, opacity: selectedCustomer ? 1 : 0.5 }}>
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>שלב 2 — בחירת מוצרים</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {products.map(p => {
              const inCart = !!items.find(i => i.productId === p.productId);
              return (
                <button key={p.productId} onClick={() => addItem(p)} disabled={!selectedCustomer || inCart}
                  className="p-4 text-center transition-all disabled:cursor-not-allowed rounded-xl"
                  style={{ background: inCart ? 'var(--ht-info-bg)' : 'var(--ht-surface-container)', border: inCart ? '2px solid var(--ht-accent)' : '1px solid var(--ht-border)', opacity: !selectedCustomer ? 0.5 : inCart ? 0.7 : 1 }}>
                  <div className="flex justify-center mb-1">{getProductIcon(p.productName)}</div>
                  <div className="font-bold text-sm" style={{ color: 'var(--ht-primary)' }}>{p.productName}</div>
                  <div className="text-xs opacity-60 mt-1"><bdi dir="ltr">{p.basePrice} ₪</bdi> ליחידה</div>
                  {inCart && <div className="text-xs mt-1 flex items-center justify-center gap-1" style={{ color: 'var(--ht-accent)' }}><IconCheck size={12} className="inline" /> בעגלה</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Cart Review */}
        {items.length > 0 && (
          <div className="p-6" style={card}>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>שלב 3 — סיכום הזמנה</h2>
            <table className="w-full text-start text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--ht-accent)' }}>
                  <th className="pb-2 text-start">מוצר</th><th className="pb-2 text-start">כמות</th><th className="pb-2 text-start">מחיר יחידה</th><th className="pb-2 text-start">סה״כ שורה</th><th></th>
                </tr>
              </thead>
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
                    <td className="py-3"><button onClick={() => removeItem(item.productId)} className="text-sm px-2 py-1 rounded transition-all" style={{ color: 'var(--ht-danger)' }}>הסרה</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '2px solid var(--ht-primary)' }}>
              <span className="text-lg font-bold" style={{ color: 'var(--ht-primary)' }}>סה״כ הזמנה:</span>
              <span className="text-2xl font-bold" style={{ color: 'var(--ht-accent)', fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}><bdi dir="ltr">{total.toLocaleString()} ₪</bdi></span>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading} className="w-full font-bold py-3 mt-4 transition-all disabled:opacity-50 rounded-lg" style={btnPrimary}
              onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'var(--ht-accent-hover)'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'var(--ht-accent)'}>
              {loading ? <span className="flex items-center justify-center gap-2"><span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>מעבד הזמנה...</span> : 'שליחת הזמנה'}
            </button>
          </div>
        )}

        {/* Result — Fix 1: Detailed rejection message */}
        {result && (
          <div className="p-5 rounded-xl" style={{ background: result.success ? 'var(--ht-success-bg)' : 'var(--ht-danger-bg)', border: '1px solid var(--ht-border)' }}>
            {result.success ? (
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--ht-success)' }}><IconCheck size={20} /> ההזמנה נוצרה בהצלחה</h3>
                <p className="mt-1">מספר הזמנה: <strong>#{result.orderId}</strong></p>
                <p>סטטוס: <span style={getStatusBadgeStyle('Approved')}>מאושרת</span></p>
              </div>
            ) : (
              <div>
                {(() => {
                  const reasonText = result.reason || result.error || 'ההזמנה לא אושרה';
                  const details = getRejectionDetails(reasonText);
                  return (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <span>{details.icon}</span>
                        <div>
                          <h3 className="text-lg font-bold" style={{ color: 'var(--ht-danger)' }}>{details.title}</h3>
                          {details.explanation && (
                            <p className="text-sm mt-0.5" style={{ color: 'var(--ht-on-surface)', opacity: 0.8 }}>{details.explanation}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--ht-border)' }}>
                        <span className="font-medium">פירוט: </span>{reasonText}
                      </div>
                      <p className="mt-3 text-sm" style={{ color: 'var(--ht-on-surface)', opacity: 0.7 }}>
                        ניתן לנסות להקטין כמויות או לפנות למנהל
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Order History — Fix 3: Rich with customer name and expandable items */}
        <div className="p-6" style={card}>
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>היסטוריית הזמנות</h2>
          {pageLoading ? (
            <div className="text-center py-6"><div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div></div>
          ) : orders.length === 0 ? <p className="opacity-50">אין הזמנות</p> : (
            <table className="w-full text-start text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--ht-border)' }}>
                  <th className="pb-2 text-start">מס׳</th>
                  <th className="pb-2 text-start">לקוח</th>
                  <th className="pb-2 text-start">תאריך</th>
                  <th className="pb-2 text-start">סכום</th>
                  <th className="pb-2 text-start">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => {
                  const oid = o.orderId || o.order_id;
                  const isExpanded = expandedOrder === oid;
                  const oItems = orderItems[oid];
                  const isLoadingItems = orderItemsLoading === oid;
                  return (
                    <Fragment key={oid}>
                      <tr
                        role="button" tabIndex={0}
                        onClick={() => toggleOrderExpand(oid)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOrderExpand(oid); }}}
                        style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--ht-border)', cursor: 'pointer' }}
                        className="transition-colors hover:opacity-80"
                        aria-expanded={isExpanded}
                      >
                        <td className="py-2 font-medium">
                          <span className="inline-block transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', marginLeft: '4px' }}>&#9654;</span>
                          #{oid}
                        </td>
                        <td className="py-2">{o.businessName || '-'}</td>
                        <td className="py-2"><bdi dir="ltr">{o.orderDate ? new Date(o.orderDate).toLocaleDateString('he-IL') : '-'}</bdi></td>
                        <td className="py-2"><bdi dir="ltr">{(o.totalAmount || o.total_amount || 0).toLocaleString()} ₪</bdi></td>
                        <td className="py-2"><span style={getStatusBadgeStyle(o.status)}>{orderStatusLabels[o.status] || o.status}</span></td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} style={{ background: 'var(--ht-surface-container)', padding: '12px 16px' }}>
                            {isLoadingItems ? (
                              <div className="text-center py-3"><div className="inline-block w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div></div>
                            ) : oItems && oItems.length > 0 ? (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--ht-border)' }}>
                                    <th className="pb-1 text-start text-xs font-medium opacity-60">מוצר</th>
                                    <th className="pb-1 text-start text-xs font-medium opacity-60">כמות</th>
                                    <th className="pb-1 text-start text-xs font-medium opacity-60">מחיר יחידה</th>
                                    <th className="pb-1 text-start text-xs font-medium opacity-60">סה״כ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {oItems.map((item: OrderHistoryItem) => (
                                    <tr key={item.orderItemId} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                                      <td className="py-1.5">{item.productName}</td>
                                      <td className="py-1.5"><bdi dir="ltr">{item.quantity}</bdi></td>
                                      <td className="py-1.5"><bdi dir="ltr">{item.unitPrice} ₪</bdi></td>
                                      <td className="py-1.5 font-medium"><bdi dir="ltr">{(item.quantity * item.unitPrice).toLocaleString()} ₪</bdi></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-sm opacity-50 py-2">אין פריטים להצגה</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Fix 2: New Customer Modal */}
      {showNewCustomerModal && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="new-customer-title"
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewCustomerModal(false); }}
        >
          <div className="w-full max-w-md mx-4 p-6" style={{ ...card, background: 'var(--ht-surface)' }}>
            <h2 id="new-customer-title" className="text-lg font-bold mb-4" style={{ color: 'var(--ht-primary)' }}>הוספת לקוח חדש</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">שם העסק *</label>
                <input
                  type="text"
                  value={newCustForm.businessName}
                  onChange={(e) => setNewCustForm({ ...newCustForm, businessName: e.target.value })}
                  className="w-full px-4 py-2.5 outline-none transition-all"
                  style={input}
                  placeholder="שם העסק"
                  onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, inputBlur)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">טלפון *</label>
                <input
                  type="tel"
                  value={newCustForm.phone}
                  onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 outline-none transition-all"
                  style={input}
                  placeholder="050-0000000"
                  dir="ltr"
                  onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, inputBlur)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">אימייל</label>
                <input
                  type="email"
                  value={newCustForm.email}
                  onChange={(e) => setNewCustForm({ ...newCustForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 outline-none transition-all"
                  style={input}
                  placeholder="email@example.com"
                  dir="ltr"
                  onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, inputBlur)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">כתובת</label>
                <input
                  type="text"
                  value={newCustForm.address}
                  onChange={(e) => setNewCustForm({ ...newCustForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 outline-none transition-all"
                  style={input}
                  placeholder="כתובת העסק"
                  onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, inputBlur)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">מסגרת אשראי</label>
                <input
                  type="number"
                  value={newCustForm.creditLimit}
                  onChange={(e) => setNewCustForm({ ...newCustForm, creditLimit: e.target.value })}
                  className="w-full px-4 py-2.5 outline-none transition-all"
                  style={input}
                  placeholder="0"
                  dir="ltr"
                  onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, inputBlur)}
                />
              </div>
            </div>

            {newCustError && (
              <p className="mt-3 text-sm font-medium" style={{ color: 'var(--ht-danger)' }}>{newCustError}</p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleCreateCustomer}
                disabled={newCustLoading}
                className="flex-1 font-bold py-2.5 transition-all disabled:opacity-50 rounded-lg"
                style={btnPrimary}
                onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'var(--ht-accent-hover)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'var(--ht-accent)'}
              >
                {newCustLoading ? 'יוצר...' : 'יצירת לקוח'}
              </button>
              <button
                onClick={() => { setShowNewCustomerModal(false); setNewCustError(''); }}
                className="px-6 py-2.5 font-medium transition-all rounded-lg"
                style={btnGhost}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
