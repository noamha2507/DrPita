import { OrderItem } from '../models/OrderItem';
import { BillOfMaterials } from '../models/BillOfMaterials';
import { RawMaterial } from '../models/RawMaterial';
import { ProductionPlan } from '../models/ProductionPlan';

export class ProductionController {
  // SD2 message #2: generatePlan(targetDate)
  static async generatePlan(
    targetDate: string
  ): Promise<{ success: boolean; planId?: number; status?: string; missingMaterials?: any[] }> {
    // SD2 message #3: getApprovedOrderItems(targetDate)
    const approvedOrdersItems = await OrderItem.getApprovedOrderItems(targetDate);

    if (!approvedOrdersItems || approvedOrdersItems.length === 0) {
      return { success: false, missingMaterials: [] };
    }

    // Aggregate quantities per product
    const productQuantities = new Map<number, number>();
    for (const item of approvedOrdersItems) {
      const current = productQuantities.get(item.product_id) || 0;
      productQuantities.set(item.product_id, current + item.quantity);
    }

    const aggregatedItems = Array.from(productQuantities.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    // SD2 message #4: getRequiredMaterials(approvedOrdersItems)
    const requiredMaterialsList = await BillOfMaterials.getRequiredMaterials(aggregatedItems);

    // SD2 message #5: verifyPhysicalStock(requiredMaterialsList)
    const currentQtyList = await RawMaterial.verifyPhysicalStock(requiredMaterialsList);

    // SD2 message #6: checkComponentAvailability(requiredMaterialsList, currentQtyList)
    const availability = ProductionController.checkComponentAvailability(requiredMaterialsList, currentQtyList);

    if (availability.allAvailable) {
      // SD2: alt — sufficient materials
      // SD2 message #8: createProductionPlan(targetDate, 'In Progress')
      // State Diagram: Draft → InProgress [generatePlan, available]
      const planId = await ProductionPlan.createProductionPlan(targetDate, 'In Progress');

      // SD2 message #9: loop — createProductionPlanItem(planId, productId, plannedQty)
      // Uses ProductionPlan.addItem() per Class Diagram
      for (const [productId, quantity] of productQuantities) {
        await ProductionPlan.addItem(planId, productId, quantity);
      }

      return { success: true, planId, status: 'In Progress' };
    } else {
      // SD2: else — shortage
      // State Diagram: Draft → WaitingForMaterials [generatePlan, missing]
      const planId = await ProductionPlan.createProductionPlan(targetDate, 'Waiting For Materials');

      // Still create plan items so the plan is meaningful
      for (const [productId, quantity] of productQuantities) {
        await ProductionPlan.addItem(planId, productId, quantity);
      }

      return { success: false, planId, status: 'Waiting For Materials', missingMaterials: availability.missingMaterials };
    }
  }

  // SD2 message #6: checkComponentAvailability(requiredMaterialsList, currentQtyList)
  private static checkComponentAvailability(
    requiredMaterialsList: { materialId: number; requiredAmount: number }[],
    currentQtyList: { materialId: number; materialName: string; currentQty: number; requiredQty: number; sufficient: boolean }[]
  ): { allAvailable: boolean; missingMaterials: any[] } {
    const missingMaterials = currentQtyList.filter(m => !m.sufficient);
    return {
      allAvailable: missingMaterials.length === 0,
      missingMaterials: missingMaterials.map(m => ({
        materialName: m.materialName,
        required: m.requiredQty,
        available: m.currentQty,
        shortage: m.requiredQty - m.currentQty,
      })),
    };
  }
}
