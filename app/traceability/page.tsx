'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import { card } from '../components/styles';

/* ───── Tab definitions ───── */
const tabs = [
  { key: 'fr1', label: 'FR1 — הזמנות' },
  { key: 'fr2', label: 'FR2 — ייצור' },
  { key: 'fr3', label: 'FR3 — משלוחים' },
  { key: 'state', label: 'State Diagram' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

/* ───── Traceability rows ───── */
interface TraceRow {
  uiStep: string;
  sdMessage: string;
  method: string;
  file: string;
}

const fr1Rows: TraceRow[] = [
  { uiStep: 'בחירת לקוח ומוצרים', sdMessage: 'SD1 #2', method: 'OrderController.processOrder()', file: 'lib/controllers/OrderController.ts' },
  { uiStep: 'בדיקת מלאי', sdMessage: 'SD1 #3', method: 'Product.checkStockAvailability()', file: 'lib/models/Product.ts' },
  { uiStep: 'בדיקת אשראי', sdMessage: 'SD1 #4', method: 'Customer.checkCreditLimit()', file: 'lib/models/Customer.ts' },
  { uiStep: 'אימות הזמנה', sdMessage: 'SD1 #5', method: 'OrderController.validateOrder()', file: 'lib/controllers/OrderController.ts' },
  { uiStep: 'יצירת הזמנה', sdMessage: 'SD1 #6', method: 'Order.createNewOrder()', file: 'lib/models/Order.ts' },
  { uiStep: 'הוספת פריטים', sdMessage: 'SD1 #8', method: 'OrderItem.addOrderItem() [loop]', file: 'lib/models/OrderItem.ts' },
];

const fr2Rows: TraceRow[] = [
  { uiStep: 'הפקת תוכנית', sdMessage: 'SD2 #2', method: 'ProductionController.generatePlan()', file: 'lib/controllers/ProductionController.ts' },
  { uiStep: 'שליפת הזמנות מאושרות', sdMessage: 'SD2 #3', method: 'OrderItem.getApprovedOrderItems()', file: 'lib/models/OrderItem.ts' },
  { uiStep: 'חישוב חומרים נדרשים', sdMessage: 'SD2 #4', method: 'BillOfMaterials.getRequiredMaterials()', file: 'lib/models/BillOfMaterials.ts' },
  { uiStep: 'בדיקת מלאי פיזי', sdMessage: 'SD2 #5', method: 'RawMaterial.verifyPhysicalStock()', file: 'lib/models/RawMaterial.ts' },
  { uiStep: 'בדיקת זמינות', sdMessage: 'SD2 #6', method: 'ProductionController.checkComponentAvailability()', file: 'lib/controllers/ProductionController.ts' },
  { uiStep: 'יצירת תוכנית', sdMessage: 'SD2 #8', method: 'ProductionPlan.createProductionPlan()', file: 'lib/models/ProductionPlan.ts' },
  { uiStep: 'הוספת פריט לתוכנית', sdMessage: 'SD2 #9', method: 'ProductionPlan.addItem() [loop]', file: 'lib/models/ProductionPlan.ts' },
];

const fr3Rows: TraceRow[] = [
  { uiStep: 'סגירת משלוח', sdMessage: 'SD3 #2', method: 'DeliveryController.completeDelivery()', file: 'lib/controllers/DeliveryController.ts' },
  { uiStep: 'פרטי משלוח', sdMessage: 'SD3 #3', method: 'Delivery.getDeliveryDetails()', file: 'lib/models/Delivery.ts' },
  { uiStep: 'הזמנות במשלוח', sdMessage: 'SD3 #5', method: 'Order.getOrdersByDelivery()', file: 'lib/models/Order.ts' },
  { uiStep: 'עדכון סטטוס משלוח', sdMessage: 'SD3 #6', method: 'Delivery.updateStatus()', file: 'lib/models/Delivery.ts' },
  { uiStep: 'עדכון סטטוס הזמנות', sdMessage: 'SD3 #7-8', method: 'Order.updateStatus() [loop]', file: 'lib/models/Order.ts' },
  { uiStep: 'יצירת תעודת משלוח', sdMessage: 'SD3 #9', method: 'DeliveryNote.createDeliveryNote()', file: 'lib/models/DeliveryNote.ts' },
  { uiStep: 'שליפת מייל לקוח', sdMessage: 'SD3 #10', method: 'Customer.getCustomerEmailByDelivery()', file: 'lib/models/Customer.ts' },
  { uiStep: 'שליחת תעודה במייל', sdMessage: 'SD3 #11', method: 'EmailService.sendDeliveryNotePDF()', file: 'lib/models/EmailService.ts' },
];

const dataMap: Record<string, TraceRow[]> = { fr1: fr1Rows, fr2: fr2Rows, fr3: fr3Rows };

/* ───── State Diagram data ───── */
interface StateFlow {
  entity: string;
  states: { name: string; color: string; bg: string }[];
  transitions: string[];
}

const stateFlows: StateFlow[] = [
  {
    entity: 'Order (הזמנה)',
    states: [
      { name: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
      { name: 'Approved', color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
      { name: 'Rejected', color: 'var(--ht-danger)', bg: 'var(--ht-danger-bg)' },
      { name: 'Delivered', color: 'var(--ht-accent)', bg: 'var(--ht-info-bg)' },
    ],
    transitions: [
      'Draft → Approved (אישור הזמנה)',
      'Draft → Rejected (דחיית הזמנה)',
      'Approved → Delivered (סגירת משלוח)',
    ],
  },
  {
    entity: 'Production (ייצור)',
    states: [
      { name: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
      { name: 'Waiting For Materials', color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
      { name: 'In Progress', color: 'var(--ht-accent)', bg: 'var(--ht-info-bg)' },
      { name: 'Completed', color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
      { name: 'Cancelled', color: 'var(--ht-danger)', bg: 'var(--ht-danger-bg)' },
    ],
    transitions: [
      'Draft → Waiting For Materials (חומרים חסרים)',
      'Draft → In Progress (כל החומרים זמינים)',
      'In Progress → Completed (ייצור הושלם)',
      'Draft → Cancelled (ביטול)',
      'Waiting For Materials → Cancelled (ביטול)',
    ],
  },
  {
    entity: 'Delivery (משלוח)',
    states: [
      { name: 'Planned', color: '#6b7280', bg: '#f3f4f6' },
      { name: 'Assigned', color: 'var(--ht-accent)', bg: 'var(--ht-info-bg)' },
      { name: 'Loaded', color: '#6d28d9', bg: '#f5f3ff' },
      { name: 'On The Way', color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
      { name: 'Delivered', color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
      { name: 'Failed', color: 'var(--ht-danger)', bg: 'var(--ht-danger-bg)' },
    ],
    transitions: [
      'Planned → Assigned (שיוך נהג)',
      'Assigned → Loaded (טעינה)',
      'Loaded → On The Way (יציאה לדרך)',
      'On The Way → Delivered (מסירה מוצלחת)',
      'On The Way → Failed (מסירה נכשלה)',
    ],
  },
];

/* ───── Reusable table component ───── */
function TraceTable({ rows }: { rows: TraceRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--ht-border)' }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--ht-accent)', color: 'var(--ht-on-accent)' }}>
            <th className="px-4 py-3 text-start font-semibold">#</th>
            <th className="px-4 py-3 text-start font-semibold">שלב ב-UI</th>
            <th className="px-4 py-3 text-start font-semibold">הודעה ב-SD</th>
            <th className="px-4 py-3 text-start font-semibold">שם מתודה בקוד</th>
            <th className="px-4 py-3 text-start font-semibold">קובץ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? 'var(--ht-surface)' : 'var(--ht-surface-container)',
                borderBottom: '1px solid var(--ht-border)',
              }}
            >
              <td className="px-4 py-3 font-mono opacity-50" dir="ltr">{i + 1}</td>
              <td className="px-4 py-3">{r.uiStep}</td>
              <td className="px-4 py-3">
                <span dir="ltr" className="inline-block px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--ht-info-bg)', color: 'var(--ht-accent)' }}>
                  {r.sdMessage}
                </span>
              </td>
              <td className="px-4 py-3">
                <code dir="ltr" className="inline-block text-xs px-2 py-1 rounded" style={{ background: 'var(--ht-surface-container)', color: 'var(--ht-primary)', fontFamily: 'monospace' }}>
                  {r.method}
                </code>
              </td>
              <td className="px-4 py-3">
                <span dir="ltr" className="inline-block text-xs opacity-70 font-mono">{r.file}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───── State Diagram section ───── */
function StateDiagramSection() {
  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60">תרשימי מצבים עבור הישויות העיקריות במערכת</p>
      {stateFlows.map((flow) => (
        <div key={flow.entity} className="p-5 rounded-xl" style={card}>
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ht-primary)', fontFamily: 'var(--font-display), Heebo, sans-serif' }}>
            {flow.entity}
          </h3>

          {/* States visual */}
          <div className="flex flex-wrap gap-2 mb-4">
            {flow.states.map((s) => (
              <span
                key={s.name}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}
              >
                <span dir="ltr">{s.name}</span>
              </span>
            ))}
          </div>

          {/* Transitions */}
          <div className="space-y-1">
            {flow.transitions.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1" style={{ borderBottom: '1px solid var(--ht-border)' }}>
                <span className="opacity-30 text-xs font-mono" dir="ltr">{i + 1}.</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───── Main page ───── */
export default function TraceabilityPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('fr1');
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--ht-surface-container)' }}>
      <AppHeader title="מיפוי קוד לתרשימים — Traceability" />

      <main id="main-content" className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Description */}
        <div className="p-5 rounded-xl" style={card}>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ht-primary)', fontFamily: 'var(--font-display), Heebo, sans-serif' }}>
            מיפוי עקיבות — Sequence Diagram, Class Diagram ו-State Diagram לקוד
          </h2>
          <p className="text-sm opacity-60">
            עמוד זה מציג את המיפוי בין שלבי ה-UI, ההודעות ב-Sequence Diagram, שמות המתודות בקוד והקבצים הרלוונטיים.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={
                activeTab === t.key
                  ? { background: 'var(--ht-accent)', color: 'var(--ht-on-accent)' }
                  : { background: 'var(--ht-surface)', color: 'var(--ht-on-surface)', border: '1px solid var(--ht-border)' }
              }
              onMouseEnter={(e) => {
                if (activeTab !== t.key) e.currentTarget.style.borderColor = 'var(--ht-accent)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== t.key) e.currentTarget.style.borderColor = 'var(--ht-border)';
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab !== 'state' ? (
          <TraceTable rows={dataMap[activeTab]} />
        ) : (
          <StateDiagramSection />
        )}
      </main>
    </div>
  );
}
