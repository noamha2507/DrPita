import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { OrderItem } from '../models/OrderItem';

interface OrderItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
}

// [בקר · תרשים זרימה FR1] נקודת הכניסה לקליטת הזמנה. processOrder() מממש את הודעות SD1 (#2–#8): בדיקת מלאי → בדיקת אשראי → אימות → יצירת הזמנה.
export class OrderController {
  // SD1 message #2: processOrder(customerId, itemsList)
  static async processOrder(
    customerId: number,
    itemsList: OrderItemInput[],
    requiredDeliveryDate?: string | null
  ): Promise<{ success: boolean; orderId?: number; reason?: string }> {
    // SD1 message #3: checkStockAvailability(itemsList)
    const productsStockList = await Product.checkStockAvailability(
      itemsList.map(i => ({ productId: i.productId, quantity: i.quantity }))
    );

    // SD1 message #4: checkCreditLimit(customerId)
    const creditDetails = await Customer.checkCreditLimit(customerId);

    // SD1 message #5: validateOrder(productsStockList, creditDetails, itemsList)
    const totalAmount = itemsList.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const validation = OrderController.validateOrder(productsStockList, creditDetails, itemsList, totalAmount);

    if (validation.approved) {
      // SD1: alt path — approved
      // SD1 message #6: createNewOrder(customerId, totalAmount, 'Approved')
      const newOrderId = await Order.createNewOrder(customerId, totalAmount, 'Approved', requiredDeliveryDate);

      // SD1 message #8: loop — addOrderItem(newOrderId, productId, quantity, unitPrice)
      for (const item of itemsList) {
        await OrderItem.addOrderItem(newOrderId, item.productId, item.quantity, item.unitPrice);
      }

      return { success: true, orderId: newOrderId };
    } else {
      // SD1: else path — rejected
      // SD1: createNewOrder(customerId, totalAmount, 'Rejected')
      await Order.createNewOrder(customerId, totalAmount, 'Rejected', requiredDeliveryDate);

      return { success: false, reason: validation.reason };
    }
  }

  // SD1 message #5: validateOrder(productsStockList, creditDetails, itemsList)
  private static validateOrder(
    productsStockList: { available: boolean; details: any[] },
    creditDetails: { approved: boolean; creditLimit: number; currentBalance: number },
    itemsList: OrderItemInput[],
    totalAmount: number
  ): { approved: boolean; reason?: string } {
    if (!productsStockList.available) {
      const unavailable = productsStockList.details.filter(d => !d.available);
      return {
        approved: false,
        reason: `מוצרים לא זמינים: ${unavailable.map(u => u.productName).join(', ')}`,
      };
    }

    if (!creditDetails.approved) {
      return {
        approved: false,
        reason: `חריגת אשראי: יתרה ${creditDetails.currentBalance} מתוך ${creditDetails.creditLimit}`,
      };
    }

    if (creditDetails.currentBalance + totalAmount > creditDetails.creditLimit) {
      return {
        approved: false,
        reason: `סכום ההזמנה (${totalAmount}) חורג ממסגרת האשראי הנותרת (${creditDetails.creditLimit - creditDetails.currentBalance})`,
      };
    }

    return { approved: true };
  }
}
