// Centralized Hebrew labels — single source of truth

export const statusLabels: Record<string, string> = {
  // Orders (feminine — הזמנה)
  Draft: 'טיוטה',
  Approved: 'מאושרת',
  Rejected: 'נדחתה',
  Delivered: 'נמסרה',
  // Production Plans (feminine — תוכנית)
  'In Progress': 'בייצור',
  InProgress: 'בייצור',
  'Waiting For Materials': 'ממתין לחומרים',
  Completed: 'הושלם',
  Cancelled: 'בוטל',
  // Deliveries (masculine — משלוח)
  Planned: 'מתוכנן',
  Assigned: 'שויך',
  Loaded: 'נטען',
  'On The Way': 'בדרך',
  Failed: 'נכשל',
};

// Delivery status uses masculine forms (משלוח = masculine)
export const deliveryStatusLabels: Record<string, string> = {
  Planned: 'מתוכנן',
  Assigned: 'שויך',
  Loaded: 'נטען',
  'On The Way': 'בדרך',
  Delivered: 'נמסר',
  Failed: 'נכשל',
};

export const roleLabels: Record<string, string> = {
  Manager: 'מנהל',
  ProductionWorker: 'עובד ייצור',
  WarehouseWorker: 'מחסנאי',
  Driver: 'נהג',
};

export const productIcons: Record<string, string> = {
  'פיתה לבנה רגילה': '🫓',
  'פיתה מקמח מלא': '🟤',
  'פיתה טאבון גדולה': '🔥',
  'לאפה עיראקית': '🥙',
  'פיתה מיני (אירוח)': '🧁',
};

export const getProductIcon = (name: string) => productIcons[name] || '🫓';
