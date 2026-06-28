# ד״ר פיתה — מפת קוד (איפה כל דבר נמצא)

מסמך זה מקשר בין **התרשימים מחלק ב׳** לבין **הקוד בפועל**, כדי שניתן יהיה להצביע במהירות
על כל רכיב בזמן ההצגה (סעיף 8.1).

> **טיפ לזיהוי מהיר בקוד:** כל מחלקת ישות פותחת בהערה `// [תרשים מחלקות] ...`,
> כל בקר פותח בהערה `// [בקר · תרשים זרימה FRx] ...`, וכל הודעה בתרשים ה-Sequence
> מסומנת בקוד בהערה `// SD# message #N: ...`. המחלקה היחידה שנוספה בחלק ג׳ מסומנת `// 🟧 תוספת חלק ג׳`.

---

## מבנה התיקיות

| תיקייה | תוכן |
|--------|------|
| `lib/models/` | **מחלקות הישות** מתרשים המחלקות (18 מחלקות) — כל קובץ = מחלקה אחת |
| `lib/controllers/` | **מחלקות הבקרה** מתרשימי ה-Sequence — נקודות הכניסה ל-FR1/FR2/FR3 |
| `lib/services/` | `AutoAssignmentService` — 🟧 תוספת חלק ג׳ (שכבת אוטומציה) |
| `lib/enums/` | 5 ה-enums מתרשים המחלקות (סטטוסים ותפקידים) |
| `lib/db/` | חיבור ל-Supabase (PostgreSQL) |
| `app/` | ממשק המשתמש (מסכים) + שכבת ה-API |
| `app/api/` | נקודות הקצה (API Routes) — הגשר בין ה-UI לבקרים |

---

## נקודות הכניסה — איפה כל דרישה מתחילה

לכל דרישה: **מסך (UI) → API Route → Controller**. חץ ה-UI→Controller שבתרשים ממומש דרך ה-API Route.

| דרישה | מסך (UI) | API Route | Controller (נקודת הכניסה) |
|-------|----------|-----------|---------------------------|
| **FR1 — מכירות** | `app/orders/page.tsx` | `app/api/orders/route.ts` | `lib/controllers/OrderController.ts` → `processOrder()` |
| **FR2 — ייצור** | `app/production/page.tsx` | `app/api/production/route.ts` | `lib/controllers/ProductionController.ts` → `generatePlan()` |
| **FR3 — הפצה** | `app/delivery/page.tsx` | `app/api/delivery/route.ts` | `lib/controllers/DeliveryController.ts` → `completeDelivery()` |

מסך כניסה והזדהות: `app/login/page.tsx` → `app/api/auth/login/route.ts`.
מסך אימות SELECT עם חותמת זמן (להדגמה): `app/verify/page.tsx` → `app/api/verify/route.ts`.

---

## מיפוי הודעה↔קוד — FR1 (קליטת הזמנה)

| # | הודעה בתרשים | מיקום בקוד |
|---|--------------|------------|
| 2 | processOrder | `OrderController.ts` → `processOrder()` |
| 3 | checkStockAvailability | `models/Product.ts` → `checkStockAvailability()` |
| 4 | checkCreditLimit | `models/Customer.ts` → `checkCreditLimit()` |
| 5 | validateOrder | `OrderController.ts` → `validateOrder()` |
| 6 | createNewOrder | `models/Order.ts` → `createNewOrder()` |
| 8 | addOrderItem (לולאה) | `models/OrderItem.ts` → `addOrderItem()` |
| — | 🟧 runAfterOrderCreated | `services/AutoAssignmentService.ts` → `runAfterOrderCreated()` |

## מיפוי הודעה↔קוד — FR2 (תכנון ייצור)

| # | הודעה בתרשים | מיקום בקוד |
|---|--------------|------------|
| 2 | generatePlan | `ProductionController.ts` → `generatePlan()` |
| — | getApprovedOrderItems | `models/OrderItem.ts` → `getApprovedOrderItems()` |
| — | getRequiredMaterials | `models/BillOfMaterials.ts` → `getRequiredMaterials()` |
| — | verifyPhysicalStock | `models/RawMaterial.ts` → `verifyPhysicalStock()` |
| 8 | createProductionPlan | `models/ProductionPlan.ts` → `createProductionPlan()` |
| 9 | createProductionPlanItem | `models/ProductionPlanItem.ts` → `createProductionPlanItem()` |

> שימו לב: בתרשים המחלקות השיטה היא `ProductionPlan.addItem()`, והיא מאצֵילה ל-`createProductionPlanItem()` (הודעת ה-Sequence). שני השמות קיימים בקוד.

## מיפוי הודעה↔קוד — FR3 (סגירת משלוח)

| # | הודעה בתרשים | מיקום בקוד |
|---|--------------|------------|
| 2 | completeDelivery | `DeliveryController.ts` → `completeDelivery()` |
| 3 | getDeliveryDetails | `models/Delivery.ts` → `getDeliveryDetails()` |
| — | getOrdersByDelivery | `models/Order.ts` → `getOrdersByDelivery()` |
| — | updateStatus (משלוח + הזמנה) | `Delivery.updateStatus()` / `Order.updateStatus()` |
| — | createDeliveryNote | `models/DeliveryNote.ts` → `createDeliveryNote()` |
| — | getCustomerEmailByDelivery | `models/Customer.ts` → `getCustomerEmailByDelivery()` |
| — | sendDeliveryNotePDF | `models/EmailService.ts` → `sendDeliveryNotePDF()` |

---

## תרשים המחלקות → קבצים

| מחלקה בתרשים | קובץ | טבלה ב-DB |
|---------------|------|-----------|
| Customer | `models/Customer.ts` | customers |
| Order | `models/Order.ts` | orders |
| OrderItem | `models/OrderItem.ts` | order_items |
| Product | `models/Product.ts` | products |
| ProductionPlan | `models/ProductionPlan.ts` | production_plans |
| ProductionPlanItem | `models/ProductionPlanItem.ts` | production_plan_items |
| BillOfMaterials | `models/BillOfMaterials.ts` | bill_of_materials |
| RawMaterial | `models/RawMaterial.ts` | raw_materials |
| InventoryAlert | `models/InventoryAlert.ts` | inventory_alerts |
| Supplier | `models/Supplier.ts` | suppliers |
| Delivery | `models/Delivery.ts` | deliveries |
| DeliveryNote | `models/DeliveryNote.ts` | delivery_notes |
| Vehicle | `models/Vehicle.ts` | vehicles |
| Employee | `models/Employee.ts` | employees |
| User | `models/User.ts` | users |
| Role | `models/Role.ts` | roles |
| EmailService | `models/EmailService.ts` | — (שירות) |
| ManagementReport | `models/ManagementReport.ts` | — (מצרף דוחות) |
| **🟧 AutoAssignmentService** | `services/AutoAssignmentService.ts` | — (תוספת חלק ג׳) |

**enums:** `enums/CustomerStatus.ts`, `OrderStatus.ts`, `ProductionPlanStatus.ts`, `EmployeeRole.ts`, `DeliveryStatus.ts`.
