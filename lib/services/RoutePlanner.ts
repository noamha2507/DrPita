/**
 * Maps a customer address to a logical delivery route.
 * Used by AutoAssignmentService to group geographically-close orders
 * into the same delivery, and route distant orders to separate deliveries.
 */

export type RouteKey = 'shfela' | 'tel_aviv' | 'sharon' | 'other';

interface RouteInfo {
  key: RouteKey;
  label: string;
  cities: string[];
}

const ROUTES: RouteInfo[] = [
  {
    key: 'shfela',
    label: 'קו רמלה ולוד',
    cities: ['רמלה', 'לוד', 'מודיעין', 'נס ציונה', 'רחובות', 'ראשון לציון', 'יבנה'],
  },
  {
    key: 'tel_aviv',
    label: 'קו תל אביב ויפו',
    cities: ['יפו', 'תל אביב', 'נמל יפו', 'בת ים', 'חולון', 'גבעתיים', 'רמת גן'],
  },
  {
    key: 'sharon',
    label: 'קו פתח תקווה והשרון',
    cities: ['פתח תקווה', 'ראש העין', 'הוד השרון', 'כפר סבא', 'רעננה', 'הרצליה'],
  },
];

const FALLBACK_ROUTE: RouteInfo = {
  key: 'other',
  label: 'קו כללי',
  cities: [],
};

/**
 * Extract the route key from a customer address.
 * Returns 'other' if no city matches.
 */
export function getRouteKeyFromAddress(address: string | null | undefined): RouteKey {
  if (!address) return 'other';

  // Find the route whose city appears in the address
  for (const route of ROUTES) {
    for (const city of route.cities) {
      if (address.includes(city)) {
        return route.key;
      }
    }
  }
  return 'other';
}

/**
 * Get a human-readable label for a route key.
 */
export function getRouteLabel(key: RouteKey): string {
  const route = ROUTES.find(r => r.key === key);
  return route ? route.label : FALLBACK_ROUTE.label;
}

/**
 * Get all routes (for UI purposes).
 */
export function getAllRoutes(): RouteInfo[] {
  return [...ROUTES, FALLBACK_ROUTE];
}
