import { supabase } from '../db/supabase';
import { ProductionPlan } from '../models/ProductionPlan';
import { ProductionController } from '../controllers/ProductionController';
import { OrderItem } from '../models/OrderItem';
import { BillOfMaterials } from '../models/BillOfMaterials';
import { RawMaterial } from '../models/RawMaterial';
import { getRouteKeyFromAddress, RouteKey } from './RoutePlanner';

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
export class AutoAssignmentService {

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
    }
  }

  /**
   * Attach an order to a delivery for the given date.
   * - If active delivery exists (Planned/Assigned/Loaded) → assign order to it
   * - If no active delivery → create new one with first available driver/vehicle
   */
  private static async attachOrderToDelivery(orderId: number, deliveryDate: string): Promise<number | undefined> {
    // Determine the route key for this order based on customer address
    const { data: orderInfo } = await supabase
      .from('orders')
      .select('customer_id, customers(address)')
      .eq('order_id', orderId)
      .maybeSingle();

    const customerAddress = (orderInfo as any)?.customers?.address || '';
    const newOrderRouteKey: RouteKey = getRouteKeyFromAddress(customerAddress);

    // Look for existing active deliveries (Planned/Assigned/Loaded)
    const { data: existingDeliveries } = await supabase
      .from('deliveries')
      .select('delivery_id, status, created_at')
      .in('status', ['Planned', 'Assigned', 'Loaded'])
      .order('created_at', { ascending: false });

    // Find a delivery that:
    //  1. Has orders for the same date
    //  2. Has orders for the same route (geographic area)
    let targetDeliveryId: number | undefined;
    if (existingDeliveries && existingDeliveries.length > 0) {
      for (const del of existingDeliveries) {
        const { data: ordersInDelivery } = await supabase
          .from('orders')
          .select('required_delivery_date, customers(address)')
          .eq('delivery_id', del.delivery_id);

        if (!ordersInDelivery || ordersInDelivery.length === 0) continue;

        // Check date match
        const firstOrder = ordersInDelivery[0];
        const rd = firstOrder.required_delivery_date;
        if (!rd || rd.substring(0, 10) !== deliveryDate) continue;

        // Check route match — all orders in delivery should be on the same route
        const deliveryRouteKey: RouteKey = getRouteKeyFromAddress(
          (firstOrder as any).customers?.address || ''
        );
        if (deliveryRouteKey !== newOrderRouteKey) continue;

        targetDeliveryId = del.delivery_id;
        break;
      }
    }

    if (!targetDeliveryId) {
      // No existing delivery — create new one with first available driver/vehicle

      // Find an active driver
      const { data: driverEmployee } = await supabase
        .from('employees')
        .select('employee_id')
        .eq('role', 'Driver')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!driverEmployee) {
        throw new Error('לא נמצא נהג זמין');
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
  ): Promise<{ mergedSameRoute: number; absorbedAlongWay: number; warnings: string[] }> {
    const warnings: string[] = [];
    let mergedSameRoute = 0;
    let absorbedAlongWay = 0;

    // Load all editable active deliveries for the date with their orders
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('delivery_id, status, created_at')
      .in('status', ['Planned', 'Assigned'])
      .order('created_at', { ascending: true });

    if (!deliveries || deliveries.length === 0) {
      return { mergedSameRoute, absorbedAlongWay, warnings };
    }

    // Gather orders per delivery (for the chosen date) + their route
    type DeliveryRouteInfo = {
      deliveryId: number;
      createdAt: string;
      routeKey: RouteKey;
      orderIds: number[];
    };
    const dateMatched: DeliveryRouteInfo[] = [];

    for (const del of deliveries) {
      const { data: ordersInDel } = await supabase
        .from('orders')
        .select('order_id, required_delivery_date, customers(address)')
        .eq('delivery_id', del.delivery_id);

      if (!ordersInDel || ordersInDel.length === 0) continue;

      // Only consider deliveries whose orders are for this date
      const matchesDate = ordersInDel.every(
        (o: any) => o.required_delivery_date?.substring(0, 10) === deliveryDate
      );
      if (!matchesDate) continue;

      const firstAddress = (ordersInDel[0] as any).customers?.address || '';
      dateMatched.push({
        deliveryId: del.delivery_id,
        createdAt: del.created_at,
        routeKey: getRouteKeyFromAddress(firstAddress),
        orderIds: ordersInDel.map((o: any) => o.order_id),
      });
    }

    if (dateMatched.length === 0) {
      return { mergedSameRoute, absorbedAlongWay, warnings };
    }

    // -----------------------------------------------------------------------
    // STEP 1: same-route merge — keep the oldest delivery per route, move
    // all orders from later deliveries into it, delete the empty ones.
    // -----------------------------------------------------------------------
    const byRoute = new Map<RouteKey, DeliveryRouteInfo[]>();
    for (const d of dateMatched) {
      if (!byRoute.has(d.routeKey)) byRoute.set(d.routeKey, []);
      byRoute.get(d.routeKey)!.push(d);
    }

    for (const [, group] of byRoute) {
      if (group.length < 2) continue;
      // Group is sorted by createdAt ascending because the parent query was
      const keeper = group[0];
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

    // Rebuild byRoute with the keepers only (deleted ones are gone)
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

    return { mergedSameRoute, absorbedAlongWay, warnings };
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
}
