'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { card, input, inputFocus, inputBlur } from '../components/styles';

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

export default function InventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
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
    loadMaterials();
  }, [router]);

  const loadMaterials = async () => {
    try {
      const data = await (await fetch('/api/inventory')).json();
      if (Array.isArray(data)) setMaterials(data);
    } catch { setError('שגיאה בטעינת נתוני מלאי'); }
    finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    if (!updateModal || addQty <= 0) return;
    setUpdating(true);
    try {
      const data = await (await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: updateModal.materialId, addQuantity: addQty }),
      })).json();
      if (data.success) {
        setResult({ success: true, message: `${updateModal.materialName}: נוספו ${addQty} ${updateModal.unit}` });
        setUpdateModal(null); setAddQty(0);
        await loadMaterials();
      } else {
        setResult({ success: false, message: data.error || 'שגיאה בעדכון' });
      }
    } catch { setResult({ success: false, message: 'שגיאת חיבור' }); }
    finally { setUpdating(false); }
  };

  const getStockColor = (m: Material) => {
    if (m.isCritical) return 'var(--ht-danger)';
    if (m.isLow) return 'var(--ht-warning)';
    return 'var(--ht-success)';
  };

  const getStockLabel = (m: Material) => {
    if (m.isCritical) return 'קריטי';
    if (m.isLow) return 'נמוך';
    return 'תקין';
  };

  const getStockBg = (m: Material) => {
    if (m.isCritical) return 'var(--ht-danger-bg)';
    if (m.isLow) return 'var(--ht-warning-bg)';
    return 'var(--ht-success-bg)';
  };

  const stockPercent = (m: Material) => {
    if (m.minimumThreshold === 0) return 100;
    // Show as percentage of a "good" level (3x threshold)
    const good = m.minimumThreshold * 3;
    return Math.min(100, Math.round((m.currentQuantity / good) * 100));
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="ד״ר פיתה — מלאי חומרי גלם" />
      <main id="main-content" className="max-w-5xl mx-auto p-6 space-y-5">

        {/* Info */}
        <div className="p-4 rounded-xl text-sm" style={{ background: 'var(--ht-info-bg)', border: '1px solid var(--ht-border)' }}>
          <p style={{ color: 'var(--ht-primary)' }}>
            מסך זה מציג את מצב המלאי הנוכחי של חומרי הגלם במאפייה. ניתן לעדכן כמויות לאחר קבלת סחורה מספקים.
          </p>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-xl p-4" style={{ background: result.success ? 'var(--ht-success-bg)' : 'var(--ht-danger-bg)', color: result.success ? 'var(--ht-success)' : 'var(--ht-danger)' }}>
            <p className="font-bold text-sm">{result.success ? '' : ''}{result.message}</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
            <p className="font-bold text-sm">{error}</p>
            <button onClick={() => { setError(''); loadMaterials(); }} className="text-xs underline mt-1">נסה שוב</button>
          </div>
        )}

        {/* Materials Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div>
            <p className="text-sm mt-2 opacity-50">טוען נתוני מלאי...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(m => (
              <div key={m.materialId} className="p-5 rounded-xl" style={{ background: 'var(--ht-surface)', border: `1px solid ${m.isCritical ? 'var(--ht-danger)' : 'var(--ht-border)'}` }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold" style={{ color: 'var(--ht-primary)' }}>{m.materialName}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: getStockBg(m), color: getStockColor(m) }}>
                    {getStockLabel(m)}
                  </span>
                </div>

                {/* Stock bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="opacity-50">מלאי נוכחי</span>
                    <span className="font-bold" style={{ color: getStockColor(m) }}>
                      <bdi dir="ltr">{m.currentQuantity.toLocaleString()}</bdi> {m.unit}
                    </span>
                  </div>
                  <div className="h-3 rounded-full" style={{ background: 'var(--ht-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${stockPercent(m)}%`, background: getStockColor(m) }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] opacity-40 mt-0.5">
                    <span>סף מינימום: <bdi dir="ltr">{m.minimumThreshold}</bdi> {m.unit}</span>
                  </div>
                </div>

                {/* Supplier info */}
                {m.supplierName && (
                  <p className="text-xs opacity-50 mb-3">
                    ספק: {m.supplierName} {m.supplierPhone && <> | <bdi dir="ltr">{m.supplierPhone}</bdi></>}
                  </p>
                )}

                {/* Update button */}
                <button onClick={() => { setUpdateModal(m); setAddQty(0); }}
                  className="w-full py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)', color: 'var(--ht-primary)' }}>
                  קבלת סחורה
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Update Modal */}
        {updateModal && (
          <div role="dialog" aria-modal="true" aria-labelledby="stock-modal-title" className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setUpdateModal(null)}>
            <div className="p-6 rounded-xl w-full max-w-md" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }} onClick={e => e.stopPropagation()}>
              <h3 id="stock-modal-title" className="text-lg font-bold mb-1" style={{ color: 'var(--ht-primary)' }}>קבלת סחורה — {updateModal.materialName}</h3>
              <p className="text-sm opacity-50 mb-4">
                מלאי נוכחי: <bdi dir="ltr">{updateModal.currentQuantity}</bdi> {updateModal.unit}
              </p>

              <label className="block text-sm font-medium mb-1">כמות שהתקבלה ({updateModal.unit})</label>
              <input type="number" min={1} value={addQty || ''} onChange={(e) => setAddQty(Number(e.target.value))}
                className="w-full px-4 py-2.5 outline-none transition-all mb-2" style={input} dir="ltr"
                onFocus={(e) => Object.assign(e.target.style, inputFocus)} onBlur={(e) => Object.assign(e.target.style, inputBlur)}
                placeholder="0" />

              {addQty > 0 && (
                <p className="text-sm mb-4" style={{ color: 'var(--ht-success)' }}>
                  מלאי לאחר עדכון: <bdi dir="ltr">{(updateModal.currentQuantity + addQty).toLocaleString()}</bdi> {updateModal.unit}
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setUpdateModal(null)}
                  className="flex-1 py-2 rounded-lg text-sm" style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                  ביטול
                </button>
                <button onClick={handleUpdate} disabled={updating || addQty <= 0}
                  className="flex-1 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
                  style={{ background: 'var(--ht-accent)' }}>
                  {updating ? 'מעדכן...' : 'עדכון מלאי'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
