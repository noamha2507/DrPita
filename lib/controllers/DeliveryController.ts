import { Delivery } from '../models/Delivery';
import { Order } from '../models/Order';
import { DeliveryNote } from '../models/DeliveryNote';
import { Customer } from '../models/Customer';
import { EmailService } from '../models/EmailService';

// [בקר · תרשים זרימה FR3] נקודת הכניסה לסגירת משלוח. A route stops at several
// businesses, so each one is signed off and closed individually — completeOrderDelivery()
// מממש את הודעות SD3: עדכון סטטוס הזמנה → תעודת משלוח → מייל ללקוח, ובודק אם כל ההזמנות
// במשלוח נמסרו כדי לסגור את כל המסלול.
export class DeliveryController {
  // SD3 message #2: completeOrderDelivery(orderId, signatureFile, signerName)
  static async completeOrderDelivery(
    orderId: number,
    signatureFile: string,
    signerName: string
  ): Promise<{ success: boolean; deliveryNoteId?: number; error?: string }> {
    const order = await Order.findById(orderId);
    if (!order || !order.deliveryId) {
      return { success: false, error: 'הזמנה לא נמצאה במשלוח' };
    }

    // SD3 message #7: updateStatus(orderId, 'Delivered')
    await Order.updateStatus(orderId, 'Delivered');

    // SD3 message #9: createDeliveryNote(deliveryId, signatureFile, orderId, signerName)
    const deliveryNoteId = await DeliveryNote.createDeliveryNote(order.deliveryId, signatureFile, orderId, signerName);

    // Once every business on the route has signed, the route itself is done.
    const siblingOrders = await Order.getOrdersByDelivery(order.deliveryId);
    const allDelivered = siblingOrders.every(o => o.orderId === orderId || o.status === 'Delivered');
    if (allDelivered) {
      await Delivery.updateStatus(order.deliveryId, 'Delivered');
    }

    // SD3: Async email process (non-blocking) — only to the customer that just signed
    DeliveryController.sendOrderEmailAsync(orderId, deliveryNoteId).catch(err =>
      console.error('[DeliveryController] Async email failed:', err)
    );

    return { success: true, deliveryNoteId };
  }

  private static async sendOrderEmailAsync(orderId: number, deliveryNoteId: number): Promise<void> {
    const order = await Order.findById(orderId);
    const customer = order ? await Customer.findById(order.customerId) : null;
    if (customer?.email) {
      // SD3 message #11: sendDeliveryNotePDF(customerEmail, deliveryNoteId)
      await EmailService.sendDeliveryNotePDF(customer.email, deliveryNoteId);
      await DeliveryNote.markEmailSent(deliveryNoteId);
    }
  }
}
