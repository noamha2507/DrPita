'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { input, inputFocus, inputBlur } from '../components/styles';
import { IconInventory, IconAlertTriangle, IconCheck, IconCircleFull, IconPhone, IconUser } from '../components/Icons';

interface Material {
  materialId: number;
  materialName: string;
  unit: string;
  currentQuantity: number;
  minimumThreshold: number;
  supplierName: string | null;
  supplierPhone: string | null;
  isLow: boolean;
  isCritical: boolean;
}

interface ShortageAlert {
  alertId: number;
  materialId: number;
  materialName: string;
  unit: string;
  message: string;
  createdAt: string;
}

export default function InventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [alerts, setAlerts] = useState<ShortageAlert[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateModal, setUpdateModal] = useState<Material | null>(null);
  const [addQty, setAddQty] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    loadMaterials(true);
  }, [router]);

  const loadMaterials = async (autoSelect = false) => {
    try {
      const data = await (await fetch('/api/inventory')).json();
      if (Array.isArray(data.materials)) {
        setMaterials(data.materials);
        setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
        // Auto-select first critical/low, else first material
        if (autoSelect && data.materials.length > 0) {
          const priority = data.materials.find((m: Material) => m.isCritical) || data.materials.find((m: Material) => m.isLow) || data.materials[0];
          setSelectedId(priority.materialId);
        }
      }
    } catch { setError('שגיאה בטעינת נתוני מלאי'); }
    finally { setLoading(false); }
  };

  const resolveAlert = async (alertId: number) => {
    try {
      await fetch('/api/inventory/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alertId }) });
      setAlerts(prev => prev.filter(a => a.alertId !== alertId));
    } catch { /* non-fatal — alert stays visible, user can retry */ }
  };

  const handleUpdate = async () => {
    if (!updateModal || addQty <= 0) return;
    setUpdating(true);
    try {
      const data = await (await fetch('/api/inventory', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: updateModal.materialId, addQuantity: addQty }),
      })).json();
      if (data.success) {
        setResult({ success: true, message: `${updateModal.materialName}: נוספו ${addQty.toLocaleString()} ${updateModal.unit}` });
        setUpdateModal(null); setAddQty(0);
        await loadMaterials();
      } else setResult({ success: false, message: data.error || 'שגיאה בעדכון' });
    } catch { setResult({ success: false, message: 'שגיאת חיבור' }); }
    finally { setUpdating(false); }
  };

  const tone = (m: Material) => m.isCritical ? 'danger' : m.isLow ? 'warning' : 'success';
  const stockColor = (m: Material) => `var(--ht-${tone(m)})`;
  const stockBg = (m: Material) => `var(--ht-${tone(m)}-bg)`;
  const stockLabel = (m: Material) => m.isCritical ? 'קריטי' : m.isLow ? 'נמוך' : 'תקין';

  // bar: current relative to a "healthy" level (3× threshold)
  const stockPercent = (m: Material) => {
    if (m.minimumThreshold === 0) return 100;
    return Math.min(100, Math.round((m.currentQuantity / (m.minimumThreshold * 3)) * 100));
  };
  const thresholdPercent = (m: Material) => {
    if (m.minimumThreshold === 0) return 0;
    return Math.min(100, Math.round((m.minimumThreshold / (m.minimumThreshold * 3)) * 100)); // = 33%
  };

  const criticalCount = materials.filter(m => m.isCritical).length;
  const lowCount = materials.filter(m => m.isLow && !m.isCritical).length;
  const okCount = materials.filter(m => !m.isLow && !m.isCritical).length;
  const selected = materials.find(m => m.materialId === selectedId) || null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — מלאי חומרי גלם" />

      {/* Toast */}
      {result && (
        <div className="fixed top-20 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ background: result.success ? 'var(--ht-success)' : 'var(--ht-danger)', color: '#fff', left: '50%', transform: 'translateX(-50%)' }}>
          {result.message}
        </div>
      )}

      <div className="flex h-[calc(100vh-56px)]">
        {/* ========== SIDEBAR ========== */}
        <div className="w-72 shrink-0 overflow-y-auto p-3 space-y-2" style={{ background: 'var(--ht-primary)' }}>
          <p className="text-xs font-bold px-2 pt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>מצב המלאי</p>

          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-1.5 px-1 pb-1">
            {[
              { n: criticalCount, label: 'קריטי', color: 'var(--ht-danger)' },
              { n: lowCount, label: 'נמוך', color: 'var(--ht-warning)' },
              { n: okCount, label: 'תקין', color: 'var(--ht-success)' },
            ].map((c, i) => (
              <div key={i} className="rounded-lg py-2 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-lg font-bold" style={{ color: c.color }}>{c.n}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs font-bold px-2 pt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>חומרי גלם ({materials.length})</p>

          {loading ? (
            <div className="text-center py-6"><div className="inline-block w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}></div></div>
          ) : materials.map(m => {
            const isSel = selectedId === m.materialId;
            return (
              <button key={m.materialId} onClick={() => setSelectedId(m.materialId)}
                className="w-full text-start p-3 rounded-xl transition-all"
                style={{ background: isSel ? 'rgba(36,86,232,0.3)' : 'rgba(255,255,255,0.05)', border: isSel ? '1px solid var(--ht-accent)' : '1px solid transparent' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stockColor(m) }}></span>
                    <span className="text-sm font-bold text-white truncate">{m.materialName}</span>
                  </div>
                  <span style={{ background: stockBg(m), color: stockColor(m), fontSize: '10px', padding: '1px 6px', borderRadius: '999px' }}>{stockLabel(m)}</span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <bdi dir="ltr">{m.currentQuantity.toLocaleString()}</bdi> {m.unit}
                </p>
              </button>
            );
          })}
        </div>

        {/* ========== MAIN ========== */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-xl p-4" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
              <p className="font-bold text-sm">{error}</p>
              <button onClick={() => { setError(''); loadMaterials(true); }} className="text-xs underline mt-1">נסה שוב</button>
            </div>
          )}

          {/* Production shortage alerts — synced from the production plan screen.
              Single source of truth for this: clicking a row jumps to that
              material's own page instead of also repeating the same alert there. */}
          {alerts.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: 'var(--ht-danger-bg)', border: '1px solid var(--ht-danger)' }}>
              <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5" style={{ color: 'var(--ht-danger)' }}>
                <IconAlertTriangle size={16} /> חוסרים שעצרו תוכנית ייצור ({alerts.length})
              </h3>
              <p className="text-xs opacity-60 mb-3">חומרי הגלם הבאים אינם מספיקים לתוכנית ייצור קרובה — יש להזמין מהספק</p>
              <div className="space-y-2">
                {alerts.map(a => (
                  <button key={a.alertId} onClick={() => setSelectedId(a.materialId)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-lg text-start transition-all"
                    style={{ background: 'var(--ht-surface)', border: selectedId === a.materialId ? '1px solid var(--ht-danger)' : '1px solid transparent' }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>{a.materialName}</p>
                      <p className="text-xs opacity-60 mt-0.5">{a.message}</p>
                    </div>
                    <span onClick={(e) => { e.stopPropagation(); resolveAlert(a.alertId); }}
                      className="btn-ghost px-3 py-1.5 text-xs shrink-0 whitespace-nowrap">
                      סמן כטופל
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!selected && !loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center opacity-30">
                <IconInventory size={48} className="mx-auto" />
                <p className="mt-3 text-sm">יש לבחור חומר גלם מהרשימה</p>
              </div>
            </div>
          )}

          {selected && (() => {
            const m = selected;
            const diff = m.currentQuantity - m.minimumThreshold;
            return (
              <>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconInventory size={22} />
                    <div>
                      <h1 className="text-xl font-bold" style={{ color: 'var(--ht-primary)' }}>{m.materialName}</h1>
                      <p className="text-xs opacity-50">חומר גלם · מק״ט #{m.materialId}</p>
                    </div>
                  </div>
                  <span style={{ background: stockBg(m), color: stockColor(m), fontSize: '13px', padding: '4px 12px', borderRadius: '999px', fontWeight: 700 }}>
                    {stockLabel(m)}
                  </span>
                </div>

                {/* Critical alert banner */}
                {m.isCritical && (
                  <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--ht-danger-bg)', border: '1px solid var(--ht-danger)' }}>
                    <IconAlertTriangle size={20} className="shrink-0" />
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--ht-danger)' }}>מלאי מתחת לסף המינימום</p>
                      <p className="text-xs opacity-70 mt-0.5">יש להזמין סחורה מהספק בהקדם כדי לא לעצור את הייצור</p>
                    </div>
                  </div>
                )}

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: <><bdi dir="ltr">{m.currentQuantity.toLocaleString()}</bdi> {m.unit}</>, label: 'מלאי נוכחי', color: stockColor(m) },
                    { value: <><bdi dir="ltr">{m.minimumThreshold.toLocaleString()}</bdi> {m.unit}</>, label: 'סף מינימום', color: 'var(--ht-primary)' },
                    { value: <>{diff >= 0 ? '+' : ''}<bdi dir="ltr">{diff.toLocaleString()}</bdi> {m.unit}</>, label: diff >= 0 ? 'עודף מעל הסף' : 'חוסר מתחת לסף', color: diff >= 0 ? 'var(--ht-success)' : 'var(--ht-danger)' },
                  ].map((k, i) => (
                    <div key={i} className="ht-card p-4 text-center">
                      <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
                      <p className="text-xs opacity-50 mt-0.5">{k.label}</p>
                    </div>
                  ))}
                </div>

                {/* Stock gauge with threshold marker */}
                <div className="ht-card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>מד מלאי</h3>
                    <span className="text-xs opacity-50">ביחס לרמה מומלצת (×3 מהסף)</span>
                  </div>
                  <div className="relative h-5 rounded-full" style={{ background: 'var(--ht-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${stockPercent(m)}%`, background: stockColor(m) }}></div>
                    {/* threshold marker */}
                    <div className="absolute top-0 bottom-0" style={{ insetInlineStart: `${thresholdPercent(m)}%`, width: '2px', background: 'var(--ht-primary)' }}></div>
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="opacity-50">0</span>
                    <span style={{ color: 'var(--ht-primary)', fontWeight: 600 }}>↑ סף מינימום <bdi dir="ltr">{m.minimumThreshold.toLocaleString()}</bdi></span>
                    <span className="opacity-50"><bdi dir="ltr">{(m.minimumThreshold * 3).toLocaleString()}</bdi> {m.unit}</span>
                  </div>
                </div>

                {/* Supplier + action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="ht-card p-5">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--ht-primary)' }}><IconUser size={14} /> ספק</h3>
                    {m.supplierName ? (
                      <>
                        <p className="text-sm font-medium">{m.supplierName}</p>
                        {m.supplierPhone && <p className="text-xs opacity-60 mt-1 flex items-center gap-1.5"><IconPhone size={12} /> <bdi dir="ltr">{m.supplierPhone}</bdi></p>}
                      </>
                    ) : <p className="text-sm opacity-40">לא הוגדר ספק</p>}
                  </div>

                  <div className="p-5 rounded-xl flex flex-col justify-between" style={{ background: 'var(--ht-info-bg)', border: '1px solid var(--ht-border)' }}>
                    <div>
                      <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--ht-accent)' }}>קבלת סחורה</h3>
                      <p className="text-xs opacity-60 mb-3">עדכון המלאי לאחר קבלת משלוח מהספק</p>
                    </div>
                    <button onClick={() => { setUpdateModal(m); setAddQty(0); }}
                      className="btn-primary w-full py-2.5 text-sm">+ עדכון כמות</button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Update Modal */}
      {updateModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setUpdateModal(null)}>
          <div className="ht-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--ht-primary)' }}>קבלת סחורה — {updateModal.materialName}</h3>
            <p className="text-sm opacity-50 mb-4">מלאי נוכחי: <bdi dir="ltr">{updateModal.currentQuantity.toLocaleString()}</bdi> {updateModal.unit}</p>
            <label className="block text-sm font-medium mb-1">כמות שהתקבלה ({updateModal.unit})</label>
            <input type="number" min={1} value={addQty || ''} onChange={(e) => setAddQty(Number(e.target.value))}
              className="w-full px-4 py-2.5 outline-none transition-all mb-2" style={input} dir="ltr"
              onFocus={(e) => Object.assign(e.target.style, inputFocus)} onBlur={(e) => Object.assign(e.target.style, inputBlur)} placeholder="0" />
            {addQty > 0 && (
              <p className="text-sm mb-4" style={{ color: 'var(--ht-success)' }}>
                מלאי לאחר עדכון: <bdi dir="ltr">{(updateModal.currentQuantity + addQty).toLocaleString()}</bdi> {updateModal.unit}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setUpdateModal(null)} className="btn-ghost flex-1 py-2.5 text-sm">ביטול</button>
              <button onClick={handleUpdate} disabled={updating || addQty <= 0} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
                {updating ? 'מעדכן...' : 'עדכון מלאי'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
