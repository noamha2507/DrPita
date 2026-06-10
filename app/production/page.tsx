'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { card, input, inputFocus, inputBlur, getStatusBadgeStyle } from '../components/styles';
import { IconCheck, IconX, IconAlertTriangle, IconOrders, IconInventory, IconProduction, IconGear, IconClock } from '../components/Icons';

interface PlanItem { planId: number; planDate: string; status: string; }
interface PlanDetail {
  plan: { planId: number; planDate: string; status: string; createdAt: string };
  items: { planItemId: number; productId: number; productName: string; plannedQuantity: number; producedQuantity: number; progress: number }[];
  materials: { materialName: string; required: number; current: number; unit: string; sufficient: boolean; shortage: number }[];
  relatedOrders: { orderId: number; customerName: string; totalAmount: number; status: string }[];
}

const planTransitions: Record<string, { next: string; label: string; type: 'primary' | 'danger' }[]> = {
  'Waiting For Materials': [
    { next: 'In Progress', label: 'חומרי גלם הגיעו — התחל ייצור', type: 'primary' },
    { next: 'Cancelled', label: 'ביטול תוכנית', type: 'danger' },
  ],
  'In Progress': [
    { next: 'Completed', label: 'סיום ייצור — סגירת תוכנית', type: 'primary' },
    { next: 'Cancelled', label: 'ביטול תוכנית', type: 'danger' },
  ],
};

const statusLabels: Record<string, string> = {
  'Draft': 'טיוטה', 'Waiting For Materials': 'ממתין לחומרים', 'In Progress': 'בייצור',
  'Completed': 'הושלם', 'Cancelled': 'בוטל', 'InProgress': 'בייצור',
};

const statusGuidance: Record<string, string> = {
  'Waiting For Materials': 'יש להמתין להגעת חומרי הגלם לפני התחלת הייצור',
  'In Progress': 'יש לעדכן כמויות שיוצרו או לסיים את הייצור',
  'Completed': 'התוכנית הסתיימה ונשמרה במערכת',
  'Cancelled': 'התוכנית בוטלה',
};

const stateSteps = [
  { key: 'Draft', label: 'טיוטה' },
  { key: 'Waiting For Materials', label: 'ממתין לחומרים' },
  { key: 'In Progress', label: 'בייצור' },
  { key: 'Completed', label: 'הושלם' },
];

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const getStateIndex = (status: string) => {
  if (status === 'InProgress' || status === 'In Progress') return 2;
  if (status === 'WaitingForMaterials' || status === 'Waiting For Materials') return 1;
  if (status === 'Completed') return 3;
  return 0;
};

export default function ProductionPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [planDetail, setPlanDetail] = useState<PlanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<{ planId: number; nextStatus: string } | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: number; value: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    loadPlans();
  }, [router]);

  const loadPlans = async () => {
    try {
      const data = await (await fetch('/api/production')).json();
      if (Array.isArray(data)) setPlans(data);
    } catch {} finally { setPageLoading(false); }
  };

  const loadDetail = async (planId: number) => {
    setSelectedPlanId(planId); setDetailLoading(true); setPlanDetail(null);
    try {
      const data = await (await fetch(`/api/production/detail?planId=${planId}`)).json();
      if (data.plan) setPlanDetail(data);
    } catch {} finally { setDetailLoading(false); }
  };

  const handleGenerate = async () => {
    setLoading(true); setResult(null);
    try {
      const data = await (await fetch('/api/production', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetDate: selectedDate }) })).json();
      setResult(data);
      await loadPlans();
      if (data.planId) loadDetail(data.planId);
    } catch { setResult({ success: false, error: 'שגיאת חיבור' }); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (planId: number, newStatus: string) => {
    if (newStatus === 'Cancelled') { setConfirmCancel({ planId, nextStatus: newStatus }); return; }
    await executeStatusChange(planId, newStatus);
  };

  const executeStatusChange = async (planId: number, newStatus: string) => {
    setLoading(true);
    try {
      const data = await (await fetch('/api/production', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, newStatus }) })).json();
      if (data.success) { await loadPlans(); if (selectedPlanId === planId) loadDetail(planId); setResult({ success: true, statusMessage: `תוכנית עודכנה ל${statusLabels[newStatus] || newStatus}` }); }
    } catch {} finally { setLoading(false); }
  };

  const handleUpdateProduced = async (planItemId: number, newQuantity: number) => {
    setUpdatingItemId(planItemId);
    try {
      const data = await (await fetch('/api/production/items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planItemId, producedQuantity: newQuantity }) })).json();
      if (data.success && selectedPlanId) await loadDetail(selectedPlanId);
    } catch {} finally { setUpdatingItemId(null); }
  };

  // Filter plans by selected date
  const plansForDate = plans.filter(p => {
    const planDate = p.planDate || (p as any).plan_date;
    return planDate === selectedDate;
  });

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedPlanId(null);
    setPlanDetail(null);
  };

  // Date helpers for sidebar
  const selectedDateObj = new Date(selectedDate);
  const dayName = dayNames[selectedDateObj.getDay()];
  const dateDisplay = selectedDateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  const deliveryDateObj = new Date(selectedDateObj);
  deliveryDateObj.setDate(deliveryDateObj.getDate() + 1);
  const deliveryDateStr = deliveryDateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });

  const totalPlanned = planDetail?.items.reduce((s, i) => s + i.plannedQuantity, 0) || 0;
  const totalProduced = planDetail?.items.reduce((s, i) => s + i.producedQuantity, 0) || 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — תכנון ייצור" />

      {/* Toast */}
      {result?.statusMessage && (
        <div className="fixed top-20 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ background: 'var(--ht-success)', color: '#fff', left: '50%', transform: 'translateX(-50%)' }}>
          {result.statusMessage}
        </div>
      )}

      <div className="flex h-[calc(100vh-56px)]">
        {/* ========== SIDEBAR — dark ========== */}
        <div className="w-72 shrink-0 overflow-y-auto p-3 space-y-3" style={{ background: 'var(--ht-primary)' }}>
          <p className="text-xs font-bold px-2 pt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>בחירת יום ייצור</p>

          {/* Date picker */}
          <div className="px-1">
            <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" dir="ltr"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
          </div>

          {/* Selected date info */}
          <div className="px-2 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-white font-bold text-sm">יום {dayName}, {dateDisplay}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>ייצור בלילה → אספקה ב-{deliveryDateStr}</p>
          </div>

          {/* Plans for this date */}
          <p className="text-xs font-bold px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            תוכניות ליום זה ({plansForDate.length})
          </p>

          {pageLoading ? (
            <div className="text-center py-4"><div className="inline-block w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}></div></div>
          ) : plansForDate.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>אין תוכנית ליום זה</p>
              <button onClick={handleGenerate} disabled={loading}
                className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">
                {loading ? 'מפיק...' : 'הפקת תוכנית יומית'}
              </button>
            </div>
          ) : (
            plansForDate.slice(0, 1).map(plan => (
              <div key={plan.planId}>
                <button onClick={() => loadDetail(plan.planId)}
                  className="w-full text-start p-3 rounded-xl transition-all"
                  style={{
                    background: selectedPlanId === plan.planId ? 'rgba(36,86,232,0.3)' : 'rgba(255,255,255,0.05)',
                    border: selectedPlanId === plan.planId ? '1px solid var(--ht-accent)' : '1px solid transparent',
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">תוכנית יומית</span>
                    <span style={{ ...getStatusBadgeStyle(plan.status), fontSize: '10px', padding: '1px 6px' }}>
                      {statusLabels[plan.status] || plan.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {statusGuidance[plan.status] || ''}
                  </p>
                </button>
                {!selectedPlanId && (
                  <p className="text-xs text-center mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>לחצו לצפייה בפירוט</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* ========== MAIN CONTENT ========== */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!selectedPlanId && !detailLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center opacity-30">
                <IconProduction size={48} className="mx-auto" />
                <p className="mt-3 text-sm">
                  {plansForDate.length > 0 ? 'יש לבחור תוכנית מהרשימה' : 'אין תוכנית ליום זה — ניתן להפיק חדשה'}
                </p>
              </div>
            </div>
          )}

          {/* Generation result */}
          {result && !result.statusMessage && (
            <div className="p-4 rounded-xl" style={{ background: result.success ? 'var(--ht-success-bg)' : result.exists ? 'var(--ht-info-bg)' : result.planId ? 'var(--ht-warning-bg)' : 'var(--ht-danger-bg)', border: '1px solid var(--ht-border)' }}>
              {result.exists ? (
                <p className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ht-accent)' }}><IconOrders size={16} /> כבר קיימת תוכנית ליום זה — לחצו עליה בצד ימין לצפייה</p>
              ) : result.success ? (
                <p className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ht-success)' }}><IconCheck size={16} /> תוכנית יומית נוצרה בהצלחה</p>
              ) : result.planId ? (
                <div>
                  <p className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ht-warning)' }}><IconAlertTriangle size={16} /> תוכנית נוצרה — ממתין לחומרי גלם</p>
                  {result.missingMaterials?.map((m: any, i: number) => (
                    <span key={i} className="inline-block px-2 py-0.5 rounded text-xs mt-1 me-1" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                      {m.materialName}: חסר {m.shortage?.toFixed(1)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ht-danger)' }}><IconX size={16} /> {result.error || 'אין הזמנות מאושרות לתאריך זה'}</p>
              )}
            </div>
          )}

          {detailLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div>
            </div>
          )}

          {planDetail && !detailLoading && (() => {
            const idx = getStateIndex(planDetail.plan.status);
            return (
              <>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconProduction size={22} />
                    <div>
                      <h1 className="text-xl font-bold" style={{ color: 'var(--ht-primary)' }}>תוכנית ייצור — יום {dayName}, {dateDisplay}</h1>
                      <p className="text-xs opacity-50">תוכנית #{planDetail.plan.planId} · ייצור בלילה · אספקה ב-{deliveryDateStr}</p>
                    </div>
                  </div>
                  <span style={getStatusBadgeStyle(planDetail.plan.status)}>{statusLabels[planDetail.plan.status] || planDetail.plan.status}</span>
                </div>

                {/* Progress tracker (LTR) */}
                <div className="py-4 px-6 rounded-xl" dir="ltr" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                  <div className="flex items-center">
                    {stateSteps.map((step, i) => {
                      const done = i <= idx;
                      const current = i === idx;
                      return (
                        <div key={step.key} className="flex items-center" style={{ flex: i < stateSteps.length - 1 ? 1 : 'none' }}>
                          <div className="flex flex-col items-center gap-1.5" style={{ minWidth: '56px' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                              background: done ? 'var(--ht-accent)' : 'var(--ht-surface-container)',
                              border: current ? '3px solid var(--ht-accent)' : done ? 'none' : '2px solid var(--ht-border)',
                              boxShadow: current ? '0 0 0 4px var(--ht-accent-soft)' : 'none',
                            }}>
                              {done && !current ? <IconCheck size={16} className="text-white" /> : (
                                <span className="text-xs font-bold" style={{ color: done ? '#fff' : 'var(--ht-on-surface)', opacity: done ? 1 : 0.3 }}>{i + 1}</span>
                              )}
                            </div>
                            <span className="text-xs font-medium" style={{ color: current ? 'var(--ht-accent)' : 'var(--ht-on-surface)', opacity: current ? 1 : done ? 0.7 : 0.3 }}>{step.label}</span>
                          </div>
                          {i < stateSteps.length - 1 && (
                            <div className="flex-1 h-0.5 mx-1 rounded-full" style={{ background: i < idx ? 'var(--ht-accent)' : 'var(--ht-border)', minWidth: '20px' }}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: <IconInventory size={20} />, value: `${totalPlanned.toLocaleString()}`, label: 'פיתות מתוכננות' },
                    { icon: <IconGear size={20} />, value: `${totalProduced.toLocaleString()}`, label: 'פיתות שיוצרו' },
                    { icon: <IconOrders size={20} />, value: `${planDetail.relatedOrders.length}`, label: 'הזמנות מקור' },
                    { icon: <IconClock size={20} />, value: totalPlanned > 0 ? `${Math.round((totalProduced / totalPlanned) * 100)}%` : '0%', label: 'התקדמות' },
                  ].map((kpi, i) => (
                    <div key={i} className="rounded-xl p-4 text-center" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                      <div className="flex justify-center mb-2"><span style={{ color: 'var(--ht-accent)' }}>{kpi.icon}</span></div>
                      <p className="text-xl font-bold" style={{ color: 'var(--ht-primary)' }}>{kpi.value}</p>
                      <p className="text-xs opacity-50 mt-0.5">{kpi.label}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {planTransitions[planDetail.plan.status] && (
                  <div className="flex gap-2">
                    {planTransitions[planDetail.plan.status].map(t => (
                      <button key={t.next} onClick={() => handleStatusChange(planDetail.plan.planId, t.next)} disabled={loading}
                        className={`${t.type === 'danger' ? 'btn-danger' : 'btn-primary'} px-4 py-2 text-sm disabled:opacity-50`}>{t.label}</button>
                    ))}
                  </div>
                )}

                {/* Production items + Materials side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Products */}
                  <div className="p-5 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}>
                      <IconProduction size={16} /> מוצרים לייצור
                    </h3>
                    {planDetail.items.map(item => (
                      <div key={item.planItemId} className="py-3" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{item.productName}</span>
                          <span className="text-sm font-bold" style={{ color: item.progress === 100 ? 'var(--ht-success)' : 'var(--ht-primary)' }}>
                            <bdi dir="ltr">{item.producedQuantity.toLocaleString()}</bdi> / <bdi dir="ltr">{item.plannedQuantity.toLocaleString()}</bdi>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 rounded-full" style={{ background: 'var(--ht-border)' }}>
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${item.progress}%`,
                              background: item.progress === 100 ? 'var(--ht-success)' : item.progress > 0 ? 'var(--ht-accent)' : 'var(--ht-border)'
                            }}></div>
                          </div>
                          <span className="text-xs font-bold w-10 text-end" style={{ color: item.progress === 100 ? 'var(--ht-success)' : 'var(--ht-primary)' }}>{item.progress}%</span>
                          {planDetail.plan.status === 'In Progress' && (
                            editingItem?.id === item.planItemId ? (
                              <div className="flex items-center gap-1">
                                <input type="number" min={0} max={item.plannedQuantity} value={editingItem.value}
                                  onChange={(e) => setEditingItem({ id: item.planItemId, value: Number(e.target.value) })}
                                  className="w-16 px-1 py-0.5 text-center text-sm rounded" dir="ltr"
                                  style={{ border: '1px solid var(--ht-accent)' }} autoFocus
                                  onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateProduced(item.planItemId, editingItem.value); setEditingItem(null); } if (e.key === 'Escape') setEditingItem(null); }} />
                                <button onClick={() => { handleUpdateProduced(item.planItemId, editingItem.value); setEditingItem(null); }} className="btn-success px-1.5 py-0.5 text-xs"><IconCheck size={12} /></button>
                              </div>
                            ) : (
                              <button onClick={() => setEditingItem({ id: item.planItemId, value: item.producedQuantity })}
                                className="btn-ghost px-2 py-0.5 text-xs" style={{ color: 'var(--ht-accent)' }}>עדכן</button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Materials */}
                  <div className="p-5 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}>
                      <IconInventory size={16} /> חומרי גלם נדרשים
                    </h3>
                    {planDetail.materials.map((m, i) => {
                      const isClose = m.sufficient && m.current <= m.required * 1.3;
                      return (
                        <div key={i} className="py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                          <div>
                            <p className="font-medium text-sm">{m.materialName}</p>
                            <p className="text-xs opacity-50">
                              נדרש: <bdi dir="ltr">{m.required.toLocaleString()}</bdi> {m.unit} · במלאי: <bdi dir="ltr">{m.current.toLocaleString()}</bdi> {m.unit}
                            </p>
                          </div>
                          {m.sufficient ? (
                            isClose ? (
                              <span className="px-2 py-0.5 rounded text-xs flex items-center gap-1" style={{ background: 'var(--ht-warning-bg)', color: 'var(--ht-warning)' }}><IconAlertTriangle size={10} /> קרוב</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs flex items-center gap-1" style={{ background: 'var(--ht-success-bg)', color: 'var(--ht-success)' }}><IconCheck size={12} /> מספיק</span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs flex items-center gap-1" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}><IconX size={12} /> חסר {m.shortage}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Source orders */}
                {planDetail.relatedOrders.length > 0 && (
                  <div className="p-5 rounded-xl" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}>
                      <IconOrders size={16} /> הזמנות שמרכיבות את התוכנית
                    </h3>
                    <div className="space-y-2">
                      {planDetail.relatedOrders.map(o => (
                        <div key={o.orderId} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--ht-surface-container)' }}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold" style={{ color: 'var(--ht-accent)' }}>#{o.orderId}</span>
                            <span className="text-sm">{o.customerName}</span>
                          </div>
                          <span className="text-sm font-medium"><bdi dir="ltr">{o.totalAmount.toLocaleString()}</bdi> ₪</span>
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

      {/* Cancel modal */}
      {confirmCancel && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmCancel(null)}>
          <div onClick={(e) => e.stopPropagation()} className="rounded-xl p-6" style={{ background: 'var(--ht-surface)', maxWidth: '400px', width: '90%' }}>
            <h3 className="text-base font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>ביטול תוכנית ייצור</h3>
            <p className="text-sm mb-5 opacity-80">האם לבטל את תוכנית הייצור? פעולה זו לא ניתנת לביטול.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmCancel(null)} className="btn-ghost px-4 py-2 text-sm">חזרה</button>
              <button onClick={() => { const c = confirmCancel; setConfirmCancel(null); executeStatusChange(c.planId, c.nextStatus); }}
                className="btn-danger px-4 py-2 text-sm text-white">אישור ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
