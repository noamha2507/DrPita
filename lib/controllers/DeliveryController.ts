import { Delivery } from '../models/Delivery';
import { Order } from '../models/Order';
import { DeliveryNote } from '../models/DeliveryNote';
import { Customer } from '../models/Customer';
import { EmailService } from '../models/EmailService';

// [בקר · תרשים זרימה FR3] נקודת הכניסה לסגירת משלוח. completeDelivery() מממש את הודעות SD3: פרטי משלוח → עדכון סטטוסים → תעודת משלוח → מייל ללקוח.
export class DeliveryController {
  // SD3 message #2: completeDelivery(deliveryId, signatureFile)
  static async completeDelivery(
    deliveryId: number,
    signatureFile: string
  ): Promise<{ success: boolean; deliveryNoteId?: number; error?: string }> {
    // SD3 message #3: getDeliveryDetails(deliveryId)
    const deliveryDetails = await Delivery.getDeliveryDetails(deliveryId);
    if (!deliveryDetails) {
      return { success: false, error: 'משלוח לא נמצא' };
    }

    // SD3 message #5: getOrdersByDelivery(deliveryId)
    const ordersList = await Order.getOrdersByDelivery(deliveryId);

    // SD3: [Transaction BEGIN]
    // SD3 message #6: updateStatus(deliveryId, 'Delivered')
    await Delivery.updateStatus(deliveryId, 'Delivered');

    // SD3 message #7-8: loop — updateStatus(orderId, 'Delivered') for each order
    for (const order of ordersList) {
      await Order.updateStatus(order.orderId, 'Delivered');
    }

    // SD3 message #9: createDeliveryNote(deliveryId, signatureFile)
    const deliveryNoteId = await DeliveryNote.createDeliveryNote(deliveryId, signatureFile);
    // SD3: [Transaction COMMIT]

    // SD3: Async email process (non-blocking)
    DeliveryController.sendEmailAsync(deliveryId, deliveryNoteId).catch(err =>
      console.error('[DeliveryController] Async email failed:', err)
    );

    return { success: true, deliveryNoteId };
  }

  private static async sendEmailAsync(deliveryId: number, deliveryNoteId: number): Promise<void> {
    // SD3 message #10: getCustomerEmailByDelivery(deliveryId)
    const customerEmails = await Customer.getCustomerEmailByDelivery(deliveryId);

    // SD3 message #11: sendDeliveryNotePDF(customerEmail, deliveryNoteId)
    for (const email of customerEmails) {
      await EmailService.sendDeliveryNotePDF(email, deliveryNoteId);
    }

    await DeliveryNote.markEmailSent(deliveryNoteId);
  }
}
