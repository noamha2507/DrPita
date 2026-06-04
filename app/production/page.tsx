'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { card, input, inputFocus, inputBlur, getStatusBadgeStyle } from '../components/styles';
import { IconCheck, IconX, IconAlertTriangle, IconOrders, IconInventory, IconProduction, IconGear, IconClock } from '../components/Icons';

interface PlanItem { planId: number; planDate: string; status: string; }
interface DetailItem { planItemId: number; productId: number; productName: string; plannedQuantity: number; producedQuantity: number; progress: number; }
interface DetailMaterial { materialName: string; required: number; current: number; unit: string; sufficient: boolean; shortage: number; }
interface DetailOrder { orderId: number; customerName: string; totalAmount: number; status: string; }
interface PlanDetail {
  plan: { planId: number; planDate: string; status: string; createdAt: string };
  items: DetailItem[];
  materials: DetailMaterial[];
  relatedOrders: DetailOrder[];
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
  'Waiting For Materials': 'יש להמתין להגעת חומרי הגלם החסרים לפני התחלת הייצור',
  'In Progress': 'יש לעדכן כמויות שיוצרו או לסיים את הייצור כשהכול מוכן',
  'Completed': 'התוכנית הסתיימה בהצלחה ונשמרה במערכת',
  'Cancelled': 'התוכנית בוטלה',
};

const stateSteps = ['טיוטה', 'ממתין לחומרים', 'בייצור', 'הושלם'];

const getStateIndex = (status: string) => {
  if (status === 'InProgress' || status === 'In Progress') return 2;
  if (status === 'WaitingForMaterials' || status === 'Waiting For Materials') return 1;
  if (status === 'Completed') return 3;
  return 0;
};

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const getPlanLabel = (plan: PlanItem) => {
  const d = new Date(plan.planDate);
  const dayName = dayNames[d.getDay()];
  const dateStr = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  return `יום ${dayName}, ${dateStr}`;
};

export default function ProductionPage() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [planDetail, setPlanDetail] = useState<PlanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<{ planId: number; nextStatus: string } | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: number; value: number } | null>(null);
  const [detailTab, setDetailTab] = useState<'products' | 'materials' | 'orders'>('products');
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    loadPlans();
  }, [router]);

  const loadPlans = async () => {
    try { setPageError(null); const data = await (await fetch('/api/production')).json(); if (Array.isArray(data)) setPlans(data); }
    catch { setPageError('שגיאה בטעינת תוכניות הייצור'); }
    finally { setPageLoading(false); }
  };

  const loadDetail = async (planId: number) => {
    setSelectedPlanId(planId); setDetailLoading(true); setPlanDetail(null); setDetailTab('products');
    try { const data = await (await fetch(`/api/production/detail?planId=${planId}`)).json(); if (data.plan) setPlanDetail(data); }
    catch {} finally { setDetailLoading(false); }
  };

  const handleGenerate = async () => {
    setLoading(true); setResult(null);
    try {
      const data = await (await fetch('/api/production', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetDate }) })).json();
      setResult(data); await loadPlans();
      if (data.planId) loadDetail(data.planId);
    } catch { setResult({ success: false, error: 'שגיאת חיבור לשרת' }); }
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
      if (data.success) { await loadPlans(); if (selectedPlanId === planId) loadDetail(planId); setResult({ success: true, statusMessage: `התוכנית עודכנה ל${statusLabels[newStatus]}` }); }
    } catch { setPageError('שגיאה בעדכון הסטטוס'); }
    finally { setLoading(false); }
  };

  const handleUpdateProduced = async (planItemId: number, newQuantity: number) => {
    setUpdatingItemId(planItemId);
    try {
      const data = await (await fetch('/api/production/items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planItemId, producedQuantity: newQuantity }) })).json();
      if (data.success && selectedPlanId) await loadDetail(selectedPlanId);
    } catch {} finally { setUpdatingItemId(null); }
  };

  // Compute KPIs from plans
  const activePlans = plans.filter(p => p.status === 'In Progress' || p.status === 'InProgress');
  const waitingPlans = plans.filter(p => p.status === 'Waiting For Materials');
  const needsAttention = [...waitingPlans, ...activePlans];

  // Compute totals from detail if loaded
  const totalPlanned = planDetail ? planDetail.items.reduce((s, i) => s + i.plannedQuantity, 0) : 0;
  const totalProduced = planDetail ? planDetail.items.reduce((s, i) => s + i.producedQuantity, 0) : 0;
  const overallProgress = totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — תכנון ייצור" />
      <main id="main-content" className="max-w-6xl mx-auto p-5 space-y-4">

        {/* Info */}
        <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--ht-info-bg)', border: '1px solid var(--ht-border)' }}>
          <p style={{ color: 'var(--ht-primary)' }}>המערכת מרכזת את ההזמנות שאושרו ומפיקה מהן תוכנית עבודה לייצור, כולל בדיקת חומרי גלם במלאי.</p>
        </div>

        {pageError && (
          <div className="p-3 rounded-xl text-sm flex items-center justify-between" style={{ background: 'var(--ht-danger-bg)', border: '1px solid var(--ht-border)' }}>
            <p className="font-medium flex items-center gap-2" style={{ color: 'var(--ht-danger)' }}><IconAlertTriangle size={16} /> {pageError}</p>
            <button onClick={() => { setPageError(null); loadPlans(); }} className="btn-ghost text-xs px-3 py-1">נסה שוב</button>
          </div>
        )}

        {result?.statusMessage && (
          <div className="rounded-xl p-3" style={{ background: 'var(--ht-success-bg)', color: 'var(--ht-success)' }}><p className="font-bold text-sm flex items-center gap-2"><IconCheck size={16} /> {result.statusMessage}</p></div>
        )}

        {/* ============ SECTION 1: KPI SUMMARY ============ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'תוכניות פעילות', value: activePlans.length, color: 'var(--ht-accent)', icon: <IconGear size={16} /> },
            { label: 'ממתינות לחומרים', value: waitingPlans.length, color: waitingPlans.length > 0 ? 'var(--ht-warning)' : '#999', icon: <IconClock size={16} /> },
            { label: 'הושלמו', value: plans.filter(p => p.status === 'Completed').length, color: 'var(--ht-success)', icon: <IconCheck size={16} /> },
            { label: 'סה״כ תוכניות', value: plans.length, color: 'var(--ht-primary)', icon: <IconProduction size={16} /> },
            { label: 'דורשות טיפול', value: needsAttention.length, color: needsAttention.length > 0 ? 'var(--ht-accent)' : '#999', icon: <IconAlertTriangle size={16} /> },
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

        {/* ============ SECTION 2: ACTION CENTER ============ */}
        {needsAttention.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>דורש טיפול</h2>
            {needsAttention.map(plan => (
              <div key={plan.planId} className="p-4 rounded-xl" style={{
                background: plan.status === 'Waiting For Materials' ? 'var(--ht-warning-bg)' : 'var(--ht-info-bg)',
                border: '1px solid var(--ht-border)',
              }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {plan.status === 'Waiting For Materials' ? <IconAlertTriangle size={18} /> : <IconGear size={18} />}
                    <span className="font-bold text-sm">{getPlanLabel(plan)}</span>
                  </div>
                  <span style={{ ...getStatusBadgeStyle(plan.status), fontSize: '11px', padding: '2px 8px' }}>{statusLabels[plan.status]}</span>
                </div>
                <p className="text-xs opacity-70 mb-3">{statusGuidance[plan.status]}</p>
                <div className="flex gap-2">
                  <button onClick={() => loadDetail(plan.planId)} className="btn-ghost text-xs px-3 py-1.5">צפייה בפירוט</button>
                  {planTransitions[plan.status]?.filter(t => t.type === 'primary').map(t => (
                    <button key={t.next} onClick={() => handleStatusChange(plan.planId, t.next)} disabled={loading}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{t.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============ GENERATE NEW PLAN ============ */}
        <div className="p-4" style={card}>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>הפקת תוכנית ייצור חדשה</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="plan-date" className="block text-xs font-medium mb-1">תאריך יעד</label>
              <input id="plan-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 transition-all text-sm" style={input} dir="ltr"
                onFocus={(e) => Object.assign(e.target.style, inputFocus)} onBlur={(e) => Object.assign(e.target.style, inputBlur)} />
            </div>
            <button onClick={handleGenerate} disabled={loading} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
              {loading ? <span className="flex items-center gap-2"><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>מפיק...</span> : 'הפקת תוכנית'}
            </button>
          </div>
        </div>

        {/* Generation Result */}
        {result && !result.statusMessage && (
          <div className="p-4 rounded-xl" style={{ background: result.success ? 'var(--ht-success-bg)' : result.planId ? 'var(--ht-warning-bg)' : 'var(--ht-danger-bg)', border: '1px solid var(--ht-border)' }}>
            {result.success ? (
              <p className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ht-success)' }}><IconCheck size={16} /> תוכנית #{result.planId} נוצרה בהצלחה — לחץ עליה ברשימה לצפייה</p>
            ) : result.planId ? (
              <div>
                <p className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ht-warning)' }}><IconAlertTriangle size={16} /> תוכנית #{result.planId} נוצרה — ממתין לחומרי גלם</p>
                {result.missingMaterials?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.missingMaterials.map((m: any, i: number) => (
                      <span key={i} className="px-2 py-1 rounded text-xs" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>{m.materialName}: חסר <bdi dir="ltr">{m.shortage?.toFixed(1)}</bdi></span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--ht-danger)' }}><IconX size={16} /> {result.error || 'לא נמצאו הזמנות מאושרות לתאריך שנבחר'}</p>
            )}
          </div>
        )}

        {/* ============ SECTION 3+4: PLANS + DETAIL ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Plan cards (2/5) */}
          <div className="lg:col-span-2 space-y-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>כל התוכניות</h2>
            {pageLoading ? (
              <div className="text-center py-8"><div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div></div>
            ) : plans.length === 0 ? (
              <div className="p-6 rounded-xl text-center" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <p className="text-sm opacity-50">אין תוכניות — יש להפיק תוכנית חדשה</p>
              </div>
            ) : plans.map(plan => {
              const si = getStateIndex(plan.status);
              const isSelected = selectedPlanId === plan.planId;
              const totalItems = plan.status; // Just for display
              return (
                <div key={plan.planId} onClick={() => loadDetail(plan.planId)}
                  className="p-3 rounded-xl transition-all cursor-pointer" tabIndex={0} role="button"
                  onKeyDown={(e) => { if (e.key === 'Enter') loadDetail(plan.planId); }}
                  style={{
                    background: isSelected ? 'var(--ht-info-bg)' : 'var(--ht-surface)',
                    border: isSelected ? '2px solid var(--ht-accent)' : '1px solid var(--ht-border)',
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{getPlanLabel(plan)}</span>
                    <span style={{ ...getStatusBadgeStyle(plan.status), fontSize: '10px', padding: '2px 6px' }}>{statusLabels[plan.status]}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-0.5 mt-2">
                    {stateSteps.map((step, i) => (
                      <div key={step} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full h-1.5 rounded-full" style={{
                          background: plan.status === 'Cancelled' ? (i === 0 ? 'var(--ht-danger)' : 'var(--ht-border)')
                            : i <= si ? 'var(--ht-accent)' : 'var(--ht-border)',
                        }}></div>
                        <span className="text-[8px]" style={{ color: i === si ? 'var(--ht-accent)' : 'var(--ht-on-surface)', opacity: i === si ? 1 : 0.25, fontWeight: i === si ? 600 : 400 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel (3/5) */}
          <div className="lg:col-span-3 space-y-3">
            {!selectedPlanId && !detailLoading && (
              <div className="p-8 rounded-xl text-center" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                <IconProduction size={36} className="mx-auto opacity-20" />
                <p className="font-medium mt-3" style={{ color: 'var(--ht-primary)' }}>יש לבחור תוכנית לצפייה בפירוט</p>
              </div>
            )}

            {detailLoading && (
              <div className="p-8 text-center" style={card}><div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div></div>
            )}

            {planDetail && !detailLoading && (
              <>
                {/* Detail header */}
                <div className="p-4" style={card}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-bold" style={{ color: 'var(--ht-primary)' }}>{getPlanLabel({ planId: planDetail.plan.planId, planDate: planDetail.plan.planDate, status: planDetail.plan.status })}</h2>
                    <span style={getStatusBadgeStyle(planDetail.plan.status)}>{statusLabels[planDetail.plan.status]}</span>
                  </div>

                  {/* Overall progress */}
                  {(planDetail.plan.status === 'In Progress' || planDetail.plan.status === 'Completed') && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="opacity-60">התקדמות כללית</span>
                        <span className="font-bold" style={{ color: overallProgress === 100 ? 'var(--ht-success)' : 'var(--ht-accent)' }}><bdi dir="ltr">{totalProduced.toLocaleString()}</bdi> / <bdi dir="ltr">{totalPlanned.toLocaleString()}</bdi> יחידות (<bdi dir="ltr">{overallProgress}%</bdi>)</span>
                      </div>
                      <div className="h-2.5 rounded-full" style={{ background: 'var(--ht-border)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${overallProgress}%`, background: overallProgress === 100 ? 'var(--ht-success)' : 'var(--ht-accent)' }}></div>
                      </div>
                    </div>
                  )}

                  {/* Guidance */}
                  {statusGuidance[planDetail.plan.status] && (
                    <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: 'var(--ht-surface-container)' }}>{statusGuidance[planDetail.plan.status]}</p>
                  )}

                  {/* Action buttons */}
                  {planTransitions[planDetail.plan.status] && (
                    <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--ht-border)' }}>
                      {planTransitions[planDetail.plan.status].map(t => (
                        <button key={t.next} onClick={() => handleStatusChange(planDetail.plan.planId, t.next)} disabled={loading}
                          className={`${t.type === 'danger' ? 'btn-danger' : 'btn-primary'} px-3 py-1.5 text-xs disabled:opacity-50`}>{t.label}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1">
                  {[
                    { key: 'products' as const, label: 'מוצרים לייצור', icon: <IconProduction size={14} /> },
                    { key: 'materials' as const, label: 'חומרי גלם', icon: <IconInventory size={14} /> },
                    { key: 'orders' as const, label: 'הזמנות מקור', icon: <IconOrders size={14} /> },
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

                {/* Tab content */}
                <div className="p-4 rounded-b-xl rounded-t-none" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)', borderTop: 'none' }}>

                  {/* TAB: Products */}
                  {detailTab === 'products' && (
                    <table className="w-full text-start text-sm">
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--ht-accent)' }}>
                          <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>מוצר</th>
                          <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>מתוכנן</th>
                          <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>יוצר</th>
                          <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>התקדמות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {planDetail.items.map(item => (
                          <tr key={item.planItemId} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                            <td className="py-2.5 font-medium">{item.productName}</td>
                            <td className="py-2.5"><bdi dir="ltr">{item.plannedQuantity.toLocaleString()}</bdi></td>
                            <td className="py-2.5">
                              {editingItem?.id === item.planItemId ? (
                                <div className="flex items-center gap-1">
                                  <input type="number" min={0} max={item.plannedQuantity} value={editingItem.value}
                                    onChange={(e) => setEditingItem({ id: item.planItemId, value: Number(e.target.value) })}
                                    className="w-20 px-2 py-1 text-center text-sm rounded" dir="ltr"
                                    style={{ border: '1px solid var(--ht-accent)', background: 'var(--ht-surface)' }}
                                    autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateProduced(item.planItemId, editingItem.value); setEditingItem(null); } if (e.key === 'Escape') setEditingItem(null); }} />
                                  <button onClick={() => { handleUpdateProduced(item.planItemId, editingItem.value); setEditingItem(null); }} className="btn-success px-1.5 py-1 text-xs"><IconCheck size={12} /></button>
                                  <button onClick={() => setEditingItem(null)} className="btn-ghost px-1.5 py-1 text-xs"><IconX size={12} /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <bdi dir="ltr">{item.producedQuantity.toLocaleString()}</bdi>
                                  {planDetail.plan.status === 'In Progress' && (
                                    <button disabled={updatingItemId === item.planItemId}
                                      onClick={() => setEditingItem({ id: item.planItemId, value: item.producedQuantity })}
                                      className="btn-ghost px-2 py-0.5 text-[10px] disabled:opacity-50" style={{ color: 'var(--ht-accent)' }}>
                                      {updatingItemId === item.planItemId ? '...' : 'עדכן'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--ht-border)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${item.progress}%`, background: item.progress === 100 ? 'var(--ht-success)' : item.progress > 0 ? 'var(--ht-accent)' : 'var(--ht-border)' }}></div>
                                </div>
                                <span className="text-xs font-bold" style={{ color: item.progress === 100 ? 'var(--ht-success)' : 'var(--ht-primary)', minWidth: '28px' }}><bdi dir="ltr">{item.progress}%</bdi></span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* TAB: Materials */}
                  {detailTab === 'materials' && (
                    <table className="w-full text-start text-sm">
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--ht-border)' }}>
                          <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>חומר</th>
                          <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>נדרש</th>
                          <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>במלאי</th>
                          <th className="pb-2 text-start text-xs font-bold" style={{ color: 'var(--ht-primary)' }}>מצב</th>
                        </tr>
                      </thead>
                      <tbody>
                        {planDetail.materials.map((m, i) => {
                          const isClose = m.sufficient && m.current <= m.required * 1.3;
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--ht-border)' }}>
                              <td className="py-2.5 font-medium">{m.materialName}</td>
                              <td className="py-2.5"><bdi dir="ltr">{m.required.toLocaleString()}</bdi> {m.unit}</td>
                              <td className="py-2.5"><bdi dir="ltr">{m.current.toLocaleString()}</bdi> {m.unit}</td>
                              <td className="py-2.5">
                                {!m.sufficient ? (
                                  <span className="px-2 py-0.5 rounded text-xs flex items-center gap-1 w-fit" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}><IconX size={10} /> חסר <bdi dir="ltr">{m.shortage}</bdi> {m.unit}</span>
                                ) : isClose ? (
                                  <span className="px-2 py-0.5 rounded text-xs flex items-center gap-1 w-fit" style={{ background: 'var(--ht-warning-bg)', color: 'var(--ht-warning)' }}><IconAlertTriangle size={10} /> קרוב לסף</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-xs flex items-center gap-1 w-fit" style={{ background: 'var(--ht-success-bg)', color: 'var(--ht-success)' }}><IconCheck size={10} /> מספיק</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* TAB: Source Orders */}
                  {detailTab === 'orders' && (
                    planDetail.relatedOrders.length > 0 ? (
                      <div className="space-y-2">
                        {planDetail.relatedOrders.map(o => (
                          <div key={o.orderId} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm" style={{ color: 'var(--ht-accent)' }}>#{o.orderId}</span>
                              <span className="text-sm">{o.customerName}</span>
                            </div>
                            <span className="text-sm font-medium"><bdi dir="ltr">{o.totalAmount.toLocaleString()}</bdi> ₪</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm opacity-50 py-4 text-center">אין הזמנות מאושרות מקושרות</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Cancel modal */}
      {confirmCancel && (
        <div role="dialog" aria-modal="true" aria-labelledby="cancel-title" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmCancel(null)}>
          <div onClick={(e) => e.stopPropagation()} className="rounded-xl p-6" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)', maxWidth: '400px', width: '90%' }}>
            <h3 id="cancel-title" className="text-base font-bold mb-3" style={{ color: 'var(--ht-primary)' }}>ביטול תוכנית ייצור</h3>
            <p className="text-sm mb-5 opacity-80">האם לבטל את תוכנית הייצור? פעולה זו לא ניתנת לביטול.</p>
            <div className="flex gap-3 justify-end">
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
