import { supabase } from '../db/supabase';
import { ProductionPlan } from '../models/ProductionPlan';
import { ProductionController } from '../controllers/ProductionController';
import { OrderItem } from '../models/OrderItem';
import { BillOfMaterials } from '../models/BillOfMaterials';
import { RawMaterial } from '../models/RawMaterial';
import { InventoryAlert } from '../models/InventoryAlert';

// Logical delivery route, derived from a customer's city.
export type RouteKey = 'shfela' | 'tel_aviv' | 'sharon' | 'other';
interface RouteInfo { key: RouteKey; label: string; cities: string[]; }

/**
 * Automation layer triggered AFTER an order is created.
 *
 * Does NOT change SD1/SD2/SD3, Class Diagrams, or State Diagrams.
 * Simply orchestrates calls to existing controllers/models.
 *
 * Business rule: when a new order with required_delivery_date X is created:
 *   1. Auto-update or auto-create production plan for date X
 *      (production happens overnight before delivery date)
 *   2. Auto-attach to an existing delivery for date X
 *      (or create one if no active delivery exists)
 */
// 🟧 תוספת חלק ג׳ (מסומנת בתרשים המחלקות): שכבת אוטומציה שמתזמרת את הזרימות הקיימות. אינה חלק מליבת FR1/2/3.
export class AutoAssignmentService {

  // ===========================================================================
  // ROUTE GROUPING — map a customer address to a logical delivery route.
  // (folded in from the former RoutePlanner module so the whole automation
  //  lives in a single service class.)
  // ===========================================================================
  private static readonly ROUTES: RouteInfo[] = [
    { key: 'shfela', label: 'קו רמלה ולוד', cities: ['רמלה', 'לוד', 'מודיעין', 'נס ציונה', 'רחובות', 'ראשון לציון', 'יבנה'] },
    { key: 'tel_aviv', label: 'קו תל אביב ויפו', cities: ['יפו', 'תל אביב', 'נמל יפו', 'בת ים', 'חולון', 'גבעתיים', 'רמת גן'] },
    { key: 'sharon', label: 'קו פתח תקווה והשרון', cities: ['פתח תקווה', 'ראש העין', 'הוד השרון', 'כפר סבא', 'רעננה', 'הרצליה'] },
  ];
  private static readonly FALLBACK_ROUTE: RouteInfo = { key: 'other', label: 'קו כללי', cities: [] };

  static getRouteKeyFromAddress(address: string | null | undefined): RouteKey {
    if (!address) return 'other';
    for (const route of AutoAssignmentService.ROUTES) {
      for (const city of route.cities) {
        if (address.includes(city)) return route.key;
      }
    }
    return 'other';
  }

  static getRouteLabel(key: RouteKey): string {
    const route = AutoAssignmentService.ROUTES.find(r => r.key === key);
    return route ? route.label : AutoAssignmentService.FALLBACK_ROUTE.label;
  }

  static getAllRoutes(): RouteInfo[] {
    return [...AutoAssignmentService.ROUTES, AutoAssignmentService.FALLBACK_ROUTE];
  }

  /**
   * Run automation after an order is successfully created (Approved).
   * Safe to fail silently — order creation already succeeded.
   */
  static async runAfterOrderCreated(
    orderId: number,
    requiredDeliveryDate: string | null
  ): Promise<{ planId?: number; deliveryId?: number; warnings: string[] }> {
    const warnings: string[] = [];

    if (!requiredDeliveryDate) {
      warnings.push('הזמנה ללא תאריך אספקה — לא בוצעה הצמדה אוטומטית');
      return { warnings };
    }

    const deliveryDate = requiredDeliveryDate.substring(0, 10);

    // Production happens the NIGHT BEFORE the delivery date.
    // Order delivered on day X → Production plan dated X-1
    const productionDate = new Date(deliveryDate);
    productionDate.setDate(productionDate.getDate() - 1);
    const productionDateStr = productionDate.toISOString().split('T')[0];

    // ===== 1. Production plan automation =====
    let planId: number | undefined;
    try {
      planId = await AutoAssignmentService.attachToProductionPlan(productionDateStr);
    } catch (e: any) {
      warnings.push(`שיוך לתוכנית ייצור נכשל: ${e.message}`);
    }

    // ===== 2. Delivery automation =====
    let deliveryId: number | undefined;
    try {
      deliveryId = await AutoAssignmentService.attachOrderToDelivery(orderId, deliveryDate);
    } catch (e: any) {
      warnings.push(`שיוך למשלוח נכשל: ${e.message}`);
    }

    // ===== 3. Consolidation pass =====
    // Merge same-route deliveries, absorb stops along the way (shfela into tel_aviv/sharon)
    try {
      const consolidation = await AutoAssignmentService.consolidateForDate(deliveryDate);
      if (consolidation.warnings.length > 0) warnings.push(...consolidation.warnings);
    } catch (e: any) {
      warnings.push(`איחוד משלוחים נכשל: ${e.message}`);
    }

    return { planId, deliveryId, warnings };
  }

  /**
   * Ensure a production plan exists for the date and includes all approved orders.
   * - If plan doesn't exist → call ProductionController.generatePlan
   * - If plan exists and is editable (Waiting For Materials / In Progress) → regenerate items
   * - If plan is Completed or Cancelled → don't touch (warn)
   */
  private static async attachToProductionPlan(productionDate: string): Promise<number | undefined> {
    const existingPlan = await ProductionPlan.findByDate(productionDate);

    if (!existingPlan) {
      // No plan exists — create one (will pull orders for productionDate+1)
      const result = await ProductionController.generatePlan(productionDate);
      if (result.status === 'Waiting For Materials') {
        await AutoAssignmentService.createShortageAlerts(productionDate, result.missingMaterials);
      }
      return result.planId;
    }

    // Plan exists — check if editable
    if (existingPlan.status === 'Completed' || existingPlan.status === 'Cancelled') {
      // Don't touch finalized plans
      return existingPlan.planId;
    }

    // Editable plan — regenerate items from current approved orders
    await AutoAssignmentService.regeneratePlanItems(existingPlan.planId, productionDate);
    return existingPlan.planId;
  }

  /**
   * Refresh plan items to reflect current approved orders.
   * targetDate is the PRODUCTION date — orders are pulled for targetDate+1.
   * Recomputes status (In Progress vs Waiting For Materials) based on stock.
   */
  private static async regeneratePlanItems(planId: number, productionDate: string): Promise<void> {
    // Get current approved order items for this production date (delivery = +1 day)
    const approvedItems = await OrderItem.getApprovedOrderItems(productionDate);
    if (!approvedItems || approvedItems.length === 0) return;

    // Aggregate by product
    const productQuantities = new Map<number, number>();
    for (const item of approvedItems) {
      const current = productQuantities.get(item.product_id) || 0;
      productQuantities.set(item.product_id, current + item.quantity);
    }

    // Delete existing items
    await supabase.from('production_plan_items').delete().eq('plan_id', planId);

    // Re-add aggregated items
    for (const [productId, quantity] of productQuantities) {
      await ProductionPlan.addItem(planId, productId, quantity);
    }

    // Re-check materials and update plan status if needed
    const aggregatedItems = Array.from(productQuantities.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    const requiredMaterials = await BillOfMaterials.getRequiredMaterials(aggregatedItems);
    const currentStock = await RawMaterial.verifyPhysicalStock(requiredMaterials);
    const allAvailable = currentStock.every(m => m.sufficient);

    // Update plan status based on new totals (but only if currently in a non-final state)
    const { data: planData } = await supabase
      .from('production_plans')
      .select('status')
      .eq('plan_id', planId)
      .single();

    if (planData && (planData.status === 'In Progress' || planData.status === 'Waiting For Materials')) {
      const newStatus = allAvailable ? 'In Progress' : 'Waiting For Materials';
      if (newStatus !== planData.status) {
        await supabase.from('production_plans').update({ status: newStatus }).eq('plan_id', planId);
      }
      if (!allAvailable) {
        const missingMaterials = currentStock.filter(m => !m.sufficient).map(m => ({
          materialName: m.materialName, required: m.requiredQty, available: m.currentQty, shortage: m.requiredQty - m.currentQty,
        }));
        await AutoAssignmentService.createShortageAlerts(productionDate, missingMaterials);
      }
    }
  }

  /**
   * Persist a low-stock alert per material blocking a production plan, so the
   * inventory screen shows exactly what's missing and how much to reorder.
   * Looked up by material name since the shortage payload doesn't carry the id.
   * Uses InventoryAlert.createAlert() — an existing, previously-unwired class
   * diagram method — without touching ProductionController/FR2 at all.
   *
   * Skips materials that already have an unresolved ('New') alert, since this
   * now also runs on every recheckUpcomingShortages() pass — without the
   * guard, viewing the inventory screen twice would create duplicate alerts.
   */
  static async createShortageAlerts(
    productionDate: string,
    missingMaterials: { materialName: string; required: number; available: number; shortage: number }[] | undefined
  ): Promise<void> {
    if (!missingMaterials || missingMaterials.length === 0) return;
    const { data: rawMaterials } = await supabase.from('raw_materials').select('material_id, material_name, unit');
    const { data: openAlerts } = await supabase.from('inventory_alerts').select('material_id').eq('alert_status', 'New');
    const materialsWithOpenAlert = new Set((openAlerts || []).map((a: any) => a.material_id));
    for (const m of missingMaterials) {
      const match = (rawMaterials || []).find((r: any) => r.material_name === m.materialName);
      if (!match || materialsWithOpenAlert.has(match.material_id)) continue;
      const message = `חוסר לתוכנית ייצור ${productionDate}: נדרש ${m.required} ${match.unit}, במלאי ${m.available} ${match.unit} (חוסר ${m.shortage} ${match.unit})`;
      await InventoryAlert.createAlert(match.material_id, message);
    }
  }

  /**
   * Re-verify material availability for the plan about to go into production
   * (today — production runs tonight) and the one a day out (tomorrow — one
   * day of lead time to reorder before it's blocked). Runs whenever the
   * inventory screen is opened, since stock can change independently of any
   * order event (restocked, or consumed by another plan) between when a plan
   * was first created and its actual production night.
   */
  static async recheckUpcomingShortages(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    for (const productionDate of [today, tomorrow]) {
      try {
        await AutoAssignmentService.recheckMaterialAvailability(productionDate);
      } catch {
        // non-fatal — one date's recheck failing shouldn't block the other or the page load
      }
    }
  }

  /**
   * Re-checks stock for an existing plan's current items without touching
   * the items themselves (those only change via a new/changed order) — just
   * refreshes status + alerts against today's raw_materials quantities.
   */
  private static async recheckMaterialAvailability(productionDate: string): Promise<void> {
    const plan = await ProductionPlan.findByDate(productionDate);
    if (!plan || plan.status === 'Completed' || plan.status === 'Cancelled') return;

    const { data: items } = await supabase
      .from('production_plan_items')
      .select('product_id, planned_quantity')
      .eq('plan_id', plan.planId);
    if (!items || items.length === 0) return;

    const aggregatedItems = items.map((i: any) => ({ productId: i.product_id, quantity: i.planned_quantity }));
    const requiredMaterials = await BillOfMaterials.getRequiredMaterials(aggregatedItems);
    const currentStock = await RawMaterial.verifyPhysicalStock(requiredMaterials);
    const allAvailable = currentStock.every(m => m.sufficient);

    const newStatus = allAvailable ? 'In Progress' : 'Waiting For Materials';
    if (newStatus !== plan.status) {
      await supabase.from('production_plans').update({ status: newStatus }).eq('plan_id', plan.planId);
    }
    if (!allAvailable) {
      const missingMaterials = currentStock.filter(m => !m.sufficient).map(m => ({
        materialName: m.materialName, required: m.requiredQty, available: m.currentQty, shortage: m.requiredQty - m.currentQty,
      }));
      await AutoAssignmentService.createShortageAlerts(productionDate, missingMaterials);
    }
  }

  /**
   * Attach an order to a delivery for the given date.
   * - If active delivery exists (Planned/Assigned/Loaded) → assign order to it
   * - If no active delivery → create new one with first available driver/vehicle
   */
  private static async attachOrderToDelivery(orderId: number, deliveryDate: string): Promise<number | undefined> {
    // Determine the customer + route for this order
    const { data: orderInfo } = await supabase
      .from('orders')
      .select('customer_id, customers(address)')
      .eq('order_id', orderId)
      .maybeSingle();

    const newOrderCustomerId = (orderInfo as any)?.customer_id;
    const customerAddress = (orderInfo as any)?.customers?.address || '';
    const newOrderRouteKey: RouteKey = AutoAssignmentService.getRouteKeyFromAddress(customerAddress);

    // Look for existing active deliveries (Planned/Assigned/Loaded)
    const { data: existingDeliveries } = await supabase
      .from('deliveries')
      .select('delivery_id, status, created_at')
      .in('status', ['Planned', 'Assigned', 'Loaded'])
      .order('created_at', { ascending: false });

    let targetDeliveryId: number | undefined;

    if (existingDeliveries && existingDeliveries.length > 0) {
      // Pre-load orders for all candidate deliveries (one round-trip)
      const candidateIds = existingDeliveries.map((d: any) => d.delivery_id);
      const { data: allOrdersInCandidates } = await supabase
        .from('orders')
        .select('order_id, delivery_id, customer_id, required_delivery_date, customers(address)')
        .in('delivery_id', candidateIds);

      // Group by delivery
      const ordersByDelivery = new Map<number, any[]>();
      for (const o of allOrdersInCandidates || []) {
        if (!ordersByDelivery.has(o.delivery_id)) ordersByDelivery.set(o.delivery_id, []);
        ordersByDelivery.get(o.delivery_id)!.push(o);
      }

      // PRIORITY 1: same-customer match — if this customer already has a
      // delivery on this date, ALWAYS use it. Same customer + same day = one truck.
      for (const del of existingDeliveries) {
        const orders = ordersByDelivery.get(del.delivery_id) || [];
        if (orders.length === 0) continue;
        const matchesDate = orders.every((o: any) => o.required_delivery_date?.substring(0, 10) === deliveryDate);
        if (!matchesDate) continue;
        const hasCustomer = orders.some((o: any) => o.customer_id === newOrderCustomerId);
        if (hasCustomer) {
          targetDeliveryId = del.delivery_id;
          break;
        }
      }

      // PRIORITY 2: same-route match — fall back to grouping by area
      if (!targetDeliveryId) {
        for (const del of existingDeliveries) {
          const orders = ordersByDelivery.get(del.delivery_id) || [];
          if (orders.length === 0) continue;
          const matchesDate = orders.every((o: any) => o.required_delivery_date?.substring(0, 10) === deliveryDate);
          if (!matchesDate) continue;
          const firstAddress = (orders[0] as any).customers?.address || '';
          const deliveryRouteKey: RouteKey = AutoAssignmentService.getRouteKeyFromAddress(firstAddress);
          if (deliveryRouteKey !== newOrderRouteKey) continue;
          targetDeliveryId = del.delivery_id;
          break;
        }
      }
    }

    if (!targetDeliveryId) {
      // No existing delivery — create new one.
      // Pick a driver who is FREE on this delivery date (no other delivery).
      // Business rule: one driver = at most one delivery per day.
      const driverEmployee = await AutoAssignmentService.pickFreeDriverForDate(deliveryDate);
      if (!driverEmployee) {
        throw new Error('לא נמצא נהג פנוי לתאריך זה');
      }

      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('vehicle_id')
        .limit(1)
        .maybeSingle();
      if (!vehicle) {
        throw new Error('לא נמצא רכב זמין');
      }

      const { data: newDelivery, error: delErr } = await supabase
        .from('deliveries')
        .insert({
          driver_id: driverEmployee.employee_id,
          vehicle_id: vehicle.vehicle_id,
          status: 'Planned',
        })
        .select('delivery_id')
        .single();
      if (delErr) throw delErr;
      targetDeliveryId = newDelivery.delivery_id;
    }

    // Assign the order to this delivery
    await supabase
      .from('orders')
      .update({ delivery_id: targetDeliveryId })
      .eq('order_id', orderId);

    return targetDeliveryId;
  }

  // ===========================================================================
  // CONSOLIDATION — merge same-route deliveries and absorb stops along the way
  // ===========================================================================

  /**
   * Routes that "pass through" smaller-area routes on their way out of מצליח.
   *   tel_aviv ⊇ shfela    — TA truck passes through Ramla/Lod
   *   sharon   ⊇ shfela    — Sharon truck passes through Lod on the way east
   *   other is treated as shfela (close enough to absorb)
   */
  private static readonly ABSORPTION_RULES: Array<{ broader: RouteKey; absorbs: RouteKey[] }> = [
    { broader: 'tel_aviv', absorbs: ['shfela', 'other'] },
    { broader: 'sharon', absorbs: ['shfela', 'other'] },
  ];

  /**
   * For a given delivery date:
   *   1. Merge multiple active deliveries on the same route into one
   *   2. Absorb shfela/other deliveries into tel_aviv or sharon deliveries
   *      (since the truck physically passes through Shfela on the way)
   *
   * Only touches Planned/Assigned deliveries — Loaded and On The Way are
   * already physically committed and cannot be modified.
   */
  static async consolidateForDate(
    deliveryDate: string
  ): Promise<{ mergedSameRoute: number; absorbedAlongWay: number; mergedSameCustomer: number; warnings: string[] }> {
    const warnings: string[] = [];
    let mergedSameRoute = 0;
    let absorbedAlongWay = 0;
    let mergedSameCustomer = 0;

    // Load all editable active deliveries
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('delivery_id, status, created_at')
      .in('status', ['Planned', 'Assigned'])
      .order('created_at', { ascending: true });

    if (!deliveries || deliveries.length === 0) {
      return { mergedSameRoute, absorbedAlongWay, mergedSameCustomer, warnings };
    }

    // Gather orders per delivery (for the chosen date) + their route + customer ids
    type DeliveryRouteInfo = {
      deliveryId: number;
      createdAt: string;
      routeKey: RouteKey;
      orderIds: number[];
      customerIds: Set<number>;
    };
    const dateMatched: DeliveryRouteInfo[] = [];

    for (const del of deliveries) {
      const { data: ordersInDel } = await supabase
        .from('orders')
        .select('order_id, customer_id, required_delivery_date, customers(address)')
        .eq('delivery_id', del.delivery_id);

      if (!ordersInDel || ordersInDel.length === 0) continue;

      const matchesDate = ordersInDel.every(
        (o: any) => o.required_delivery_date?.substring(0, 10) === deliveryDate
      );
      if (!matchesDate) continue;

      const firstAddress = (ordersInDel[0] as any).customers?.address || '';
      dateMatched.push({
        deliveryId: del.delivery_id,
        createdAt: del.created_at,
        routeKey: AutoAssignmentService.getRouteKeyFromAddress(firstAddress),
        orderIds: ordersInDel.map((o: any) => o.order_id),
        customerIds: new Set(ordersInDel.map((o: any) => o.customer_id)),
      });
    }

    if (dateMatched.length === 0) {
      return { mergedSameRoute, absorbedAlongWay, mergedSameCustomer, warnings };
    }

    // -----------------------------------------------------------------------
    // STEP 0: same-customer merge — if a customer appears in 2+ deliveries
    // on this date, force-merge them. Same customer + same day = one truck.
    // -----------------------------------------------------------------------
    const customerToDeliveries = new Map<number, DeliveryRouteInfo[]>();
    for (const d of dateMatched) {
      for (const custId of d.customerIds) {
        if (!customerToDeliveries.has(custId)) customerToDeliveries.set(custId, []);
        const list = customerToDeliveries.get(custId)!;
        if (!list.includes(d)) list.push(d);
      }
    }

    // Build merge groups for customers that span multiple deliveries
    const mergedDeliveryIds = new Set<number>();
    for (const [, dels] of customerToDeliveries) {
      if (dels.length < 2) continue;
      // Skip if any of these were already absorbed in a previous iteration
      const stillAlive = dels.filter(d => !mergedDeliveryIds.has(d.deliveryId));
      if (stillAlive.length < 2) continue;
      const keeper = stillAlive[0]; // oldest
      for (let i = 1; i < stillAlive.length; i++) {
        const losing = stillAlive[i];
        await AutoAssignmentService.reassignOrdersAndDeleteDelivery(
          losing.orderIds,
          losing.deliveryId,
          keeper.deliveryId
        );
        keeper.orderIds.push(...losing.orderIds);
        for (const c of losing.customerIds) keeper.customerIds.add(c);
        mergedSameCustomer += losing.orderIds.length;
        mergedDeliveryIds.add(losing.deliveryId);
      }
    }

    // Filter out absorbed ones
    const stillAlive = dateMatched.filter(d => !mergedDeliveryIds.has(d.deliveryId));

    // -----------------------------------------------------------------------
    // STEP 1: same-route merge — keep the oldest delivery per route, move
    // all orders from later deliveries into it, delete the empty ones.
    // -----------------------------------------------------------------------
    const byRoute = new Map<RouteKey, DeliveryRouteInfo[]>();
    for (const d of stillAlive) {
      if (!byRoute.has(d.routeKey)) byRoute.set(d.routeKey, []);
      byRoute.get(d.routeKey)!.push(d);
    }

    for (const [, group] of byRoute) {
      if (group.length < 2) continue;
      const keeper = group[0]; // oldest
      const toMerge = group.slice(1);
      for (const merge of toMerge) {
        await AutoAssignmentService.reassignOrdersAndDeleteDelivery(
          merge.orderIds,
          merge.deliveryId,
          keeper.deliveryId
        );
        keeper.orderIds.push(...merge.orderIds);
        mergedSameRoute += merge.orderIds.length;
      }
    }

    // Rebuild survivors
    const survivors: DeliveryRouteInfo[] = [];
    for (const [, group] of byRoute) survivors.push(group[0]);

    // -----------------------------------------------------------------------
    // STEP 2: along-the-way absorption — pour shfela/other into tel_aviv or
    // sharon, since the truck for those routes already passes the area.
    // -----------------------------------------------------------------------
    for (const rule of AutoAssignmentService.ABSORPTION_RULES) {
      const broader = survivors.find(s => s.routeKey === rule.broader);
      if (!broader) continue;

      for (const narrowerKey of rule.absorbs) {
        const narrower = survivors.find(s => s.routeKey === narrowerKey);
        if (!narrower) continue;
        if (narrower.deliveryId === broader.deliveryId) continue;

        await AutoAssignmentService.reassignOrdersAndDeleteDelivery(
          narrower.orderIds,
          narrower.deliveryId,
          broader.deliveryId
        );
        broader.orderIds.push(...narrower.orderIds);
        absorbedAlongWay += narrower.orderIds.length;

        // Remove from survivors so it isn't processed twice
        const idx = survivors.indexOf(narrower);
        if (idx >= 0) survivors.splice(idx, 1);
      }
    }

    // -----------------------------------------------------------------------
    // STEP 3: driver rebalance — enforce "one driver = one delivery per day".
    // After all the merges above, the same driver may still hold two
    // deliveries on this date if they go in different geographic directions
    // (Tel Aviv vs Petah Tikva), so we swap one onto a free driver here.
    // -----------------------------------------------------------------------
    try {
      await AutoAssignmentService.rebalanceDriversForDate(deliveryDate);
    } catch {
      // non-fatal — leave the warning to higher-level callers
    }

    return { mergedSameRoute, absorbedAlongWay, mergedSameCustomer, warnings };
  }

  /**
   * Run consolidation for EVERY date that has active editable deliveries.
   * Catches stale data from older orders that pre-dated consolidation.
   * Cheap to run because most dates have 0 or 1 delivery and exit fast.
   */
  static async consolidateAllUpcoming(): Promise<{
    datesProcessed: number;
    totalMerges: number;
  }> {
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('delivery_id')
      .in('status', ['Planned', 'Assigned']);

    if (!deliveries || deliveries.length === 0) {
      return { datesProcessed: 0, totalMerges: 0 };
    }

    // Collect every distinct delivery date that appears in active deliveries
    const deliveryIds = deliveries.map((d: any) => d.delivery_id);
    const { data: orders } = await supabase
      .from('orders')
      .select('required_delivery_date')
      .in('delivery_id', deliveryIds);

    const dates = new Set<string>();
    for (const o of orders || []) {
      const rd = (o as any).required_delivery_date;
      if (rd) dates.add(rd.substring(0, 10));
    }

    let totalMerges = 0;
    for (const date of dates) {
      try {
        const r = await AutoAssignmentService.consolidateForDate(date);
        totalMerges += r.mergedSameRoute + r.absorbedAlongWay + r.mergedSameCustomer;
      } catch {
        // continue — one bad date shouldn't block the others
      }
    }
    return { datesProcessed: dates.size, totalMerges };
  }

  /**
   * Move orders from a source delivery to a target delivery, then delete
   * the now-empty source delivery.
   */
  private static async reassignOrdersAndDeleteDelivery(
    orderIds: number[],
    fromDeliveryId: number,
    toDeliveryId: number
  ): Promise<void> {
    if (orderIds.length > 0) {
      await supabase
        .from('orders')
        .update({ delivery_id: toDeliveryId })
        .in('order_id', orderIds);
    }
    await supabase
      .from('deliveries')
      .delete()
      .eq('delivery_id', fromDeliveryId);
  }

  // ===========================================================================
  // DRIVER ASSIGNMENT — one driver = one delivery per day
  // ===========================================================================

  /**
   * Returns the employee_id of an active Driver who is NOT yet assigned to
   * any delivery on the given date. If every driver is taken, falls back to
   * the driver who currently has the fewest deliveries that day (still tries
   * to be fair). Returns null if there are no drivers at all.
   */
  private static async pickFreeDriverForDate(
    deliveryDate: string
  ): Promise<{ employee_id: number } | null> {
    // All active drivers
    const { data: allDrivers } = await supabase
      .from('employees')
      .select('employee_id')
      .eq('role', 'Driver')
      .eq('is_active', true);

    if (!allDrivers || allDrivers.length === 0) return null;

    // Who is already busy on this date?
    const busyDriverIds = await AutoAssignmentService.getBusyDriverIdsForDate(deliveryDate);

    const free = allDrivers.find(d => !busyDriverIds.has(d.employee_id));
    if (free) return { employee_id: free.employee_id };

    // Everyone is busy — fall back to first driver (caller can decide to warn)
    return { employee_id: allDrivers[0].employee_id };
  }

  /**
   * Set of driver_ids who already have an active delivery on the given date.
   * Active = anything that isn't Delivered or Failed.
   */
  private static async getBusyDriverIdsForDate(deliveryDate: string): Promise<Set<number>> {
    // Find all delivery_ids that hold orders for this date
    const { data: ordersOnDate } = await supabase
      .from('orders')
      .select('delivery_id')
      .gte('required_delivery_date', deliveryDate + 'T00:00:00')
      .lt('required_delivery_date', deliveryDate + 'T23:59:59');

    const deliveryIds = [...new Set(
      (ordersOnDate || []).map((o: any) => o.delivery_id).filter((id: any) => id !== null)
    )];

    if (deliveryIds.length === 0) return new Set();

    // Which of those deliveries are still active (not Delivered/Failed)?
    const { data: activeDels } = await supabase
      .from('deliveries')
      .select('driver_id, status')
      .in('delivery_id', deliveryIds);

    const busy = new Set<number>();
    for (const d of activeDels || []) {
      if (d.status !== 'Delivered' && d.status !== 'Failed') busy.add(d.driver_id);
    }
    return busy;
  }

  /**
   * After consolidation, if the same driver was independently assigned to
   * two different Planned/Assigned deliveries on the same date (e.g. one
   * Tel Aviv route + one Petah Tikva route — different directions, can't
   * be merged), swap one of them onto a free driver.
   *
   * Called by consolidateForDate as a final step.
   */
  static async rebalanceDriversForDate(deliveryDate: string): Promise<{ swapped: number }> {
    let swapped = 0;

    // All editable deliveries
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('delivery_id, driver_id, status, created_at')
      .in('status', ['Planned', 'Assigned'])
      .order('created_at', { ascending: true });
    if (!deliveries || deliveries.length === 0) return { swapped };

    // Filter to those whose orders are for this date
    const deliveryIds = deliveries.map((d: any) => d.delivery_id);
    const { data: orders } = await supabase
      .from('orders')
      .select('delivery_id, required_delivery_date')
      .in('delivery_id', deliveryIds);

    const dateDeliveryIds = new Set<number>();
    for (const o of orders || []) {
      if ((o as any).required_delivery_date?.substring(0, 10) === deliveryDate) {
        dateDeliveryIds.add((o as any).delivery_id);
      }
    }

    const onThisDate = deliveries.filter(d => dateDeliveryIds.has(d.delivery_id));
    if (onThisDate.length < 2) return { swapped };

    // Group by driver — anyone with >1 delivery is over-assigned
    const byDriver = new Map<number, typeof onThisDate>();
    for (const d of onThisDate) {
      if (!byDriver.has(d.driver_id)) byDriver.set(d.driver_id, []);
      byDriver.get(d.driver_id)!.push(d);
    }

    // All active driver ids
    const { data: allDrivers } = await supabase
      .from('employees')
      .select('employee_id')
      .eq('role', 'Driver')
      .eq('is_active', true);
    if (!allDrivers) return { swapped };

    // Who is already busy after this round?
    const busy = new Set<number>();
    for (const [driverId, dels] of byDriver) {
      // Keep the oldest delivery — driver stays on that one
      busy.add(driverId);
      // Try to move the rest onto free drivers
      for (let i = 1; i < dels.length; i++) {
        const overflow = dels[i];
        const freeDriver = allDrivers.find(d => !busy.has(d.employee_id));
        if (!freeDriver) break; // nothing we can do
        await supabase
          .from('deliveries')
          .update({ driver_id: freeDriver.employee_id })
          .eq('delivery_id', overflow.delivery_id);
        busy.add(freeDriver.employee_id);
        swapped++;
      }
    }

    return { swapped };
  }
}
