import { supabase } from '../db/supabase';

// [תרשים מחלקות] DeliveryNote — תעודת משלוח — נוצרת ב-FR3 · טבלה: delivery_notes.
export class DeliveryNote {
  noteId: number;
  deliveryId: number;
  orderId: number | null;
  signerName: string | null;
  createdAt: string;
  digitalSignature: string | null;
  sentToEmail: boolean;

  constructor(data: Partial<DeliveryNote> & { noteId: number }) {
    this.noteId = data.noteId;
    this.deliveryId = data.deliveryId || 0;
    this.orderId = data.orderId ?? null;
    this.signerName = data.signerName ?? null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.digitalSignature = data.digitalSignature || null;
    this.sentToEmail = data.sentToEmail ?? false;
  }

  // CD method
  generatePDF(): string {
    return `delivery_note_${this.noteId}.pdf`;
  }

  // SD3 message #9: createDeliveryNote(deliveryId, signatureFile, orderId, signerName)
  // Each business on the route signs its own note, so the note is tied to
  // the specific order it was issued for (not just the whole route).
  static async createDeliveryNote(deliveryId: number, signatureFile: string, orderId: number, signerName: string): Promise<number> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .insert({
        delivery_id: deliveryId,
        order_id: orderId,
        signer_name: signerName,
        digital_signature: signatureFile,
        sent_to_email: false,
      })
      .select('note_id')
      .single();
    if (error) throw error;
    return data.note_id;
  }

  static async findByDeliveryId(deliveryId: number): Promise<DeliveryNote | null> {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*')
      .eq('delivery_id', deliveryId)
      .single();
    if (error) return null;
    return new DeliveryNote({
      noteId: data.note_id,
      deliveryId: data.delivery_id,
      createdAt: data.created_at,
      digitalSignature: data.digital_signature,
      sentToEmail: data.sent_to_email,
    });
  }

  static async markEmailSent(noteId: number): Promise<void> {
    const { error } = await supabase
      .from('delivery_notes')
      .update({ sent_to_email: true })
      .eq('note_id', noteId);
    if (error) throw error;
  }
}
