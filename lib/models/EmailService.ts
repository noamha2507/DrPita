export class EmailService {
  // SD3 message #11: sendDeliveryNotePDF(customerEmail, deliveryNoteId)
  static async sendDeliveryNotePDF(customerEmail: string, deliveryNoteId: number): Promise<boolean> {
    try {
      console.log(`[EmailService] Sending delivery note PDF #${deliveryNoteId} to ${customerEmail}`);
      // In production, integrate with Resend/EmailJS. For demo, log success.
      return true;
    } catch (error) {
      console.error(`[EmailService] Failed to send email to ${customerEmail}:`, error);
      return false;
    }
  }

  // CD method (same logical operation as sendDeliveryNotePDF)
  static async sendDeliveryNote(): Promise<boolean> {
    return true;
  }
}
