import { NextRequest, NextResponse } from 'next/server';

const FACTORY_ADDRESS = 'אזור תעשייה, לוד, ישראל';
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface Stop {
  address: string;
  customerName: string;
  orderId: number;
}

// Mock route data for fallback when API unavailable
function getMockRoute(stops: Stop[]) {
  const mockDistances = [8.2, 12.5, 6.3, 15.1, 9.7];
  const mockDurations = [15, 22, 12, 28, 18];
  let totalDistance = 0;
  let totalDuration = 0;

  const legs = stops.map((stop, i) => {
    const dist = mockDistances[i % mockDistances.length];
    const dur = mockDurations[i % mockDurations.length];
    totalDistance += dist;
    totalDuration += dur;
    return {
      stopNumber: i + 1,
      customerName: stop.customerName,
      address: stop.address,
      orderId: stop.orderId,
      distance: `${dist} ק"מ`,
      duration: `${dur} דקות`,
      eta: `${8 + Math.floor(totalDuration / 60)}:${String(totalDuration % 60).padStart(2, '0')}`,
    };
  });

  return {
    origin: FACTORY_ADDRESS,
    stops: legs,
    totalDistance: `${totalDistance.toFixed(1)} ק"מ`,
    totalDuration: `${totalDuration} דקות`,
    isMock: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { stops } = await request.json() as { stops: Stop[] };

    if (!stops || stops.length === 0) {
      return NextResponse.json({ error: 'נדרשות תחנות' }, { status: 400 });
    }

    // Try real Google Directions API
    if (GOOGLE_MAPS_KEY) {
      try {
        const waypoints = stops.map(s => s.address).join('|');
        const destination = stops[stops.length - 1].address;
        const intermediates = stops.length > 1
          ? stops.slice(0, -1).map(s => s.address).join('|')
          : '';

        const params = new URLSearchParams({
          origin: FACTORY_ADDRESS,
          destination: destination,
          key: GOOGLE_MAPS_KEY,
          language: 'he',
          region: 'il',
        });
        if (intermediates) params.set('waypoints', `optimize:true|${intermediates}`);

        const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
        const data = await res.json();

        if (data.status === 'OK' && data.routes?.[0]) {
          const route = data.routes[0];
          let cumulativeDuration = 0;
          const now = new Date();
          const startHour = 8; // deliveries start at 8:00

          const legs = route.legs.map((leg: any, i: number) => {
            cumulativeDuration += leg.duration.value / 60;
            const etaMinutes = startHour * 60 + cumulativeDuration;
            return {
              stopNumber: i + 1,
              customerName: stops[i]?.customerName || `תחנה ${i + 1}`,
              address: leg.end_address,
              orderId: stops[i]?.orderId || 0,
              distance: leg.distance.text,
              duration: leg.duration.text,
              eta: `${Math.floor(etaMinutes / 60)}:${String(Math.floor(etaMinutes % 60)).padStart(2, '0')}`,
            };
          });

          const totalDistance = route.legs.reduce((s: number, l: any) => s + l.distance.value, 0);
          const totalDuration = route.legs.reduce((s: number, l: any) => s + l.duration.value, 0);

          return NextResponse.json({
            origin: FACTORY_ADDRESS,
            stops: legs,
            totalDistance: `${(totalDistance / 1000).toFixed(1)} ק"מ`,
            totalDuration: `${Math.round(totalDuration / 60)} דקות`,
            polyline: route.overview_polyline?.points || '',
            isMock: false,
          });
        }
      } catch (e) {
        console.error('Google Maps API error, falling back to mock:', e);
      }
    }

    // Fallback to mock data
    return NextResponse.json(getMockRoute(stops));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
