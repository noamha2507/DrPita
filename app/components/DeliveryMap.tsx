'use client';

import { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { IconRoute, IconMapPin, IconClock, IconCheck, IconPhone, IconUser } from './Icons';

interface InputStop {
  customerName: string;
  address: string;
  phone?: string;
  orderId: number;
}

interface RouteStop {
  stopNumber: number;
  customerName: string;
  address: string;
  orderId: number;
  distance: string;
  duration: string;
  eta: string;
}

interface RouteData {
  origin: string;
  stops: RouteStop[];
  totalDistance: string;
  totalDuration: string;
  polyline?: string;
  isMock: boolean;
}

interface DeliveryMapProps {
  stops: InputStop[];
  userRole?: string;
  deliveryStatus?: string;
  onStartDelivery?: () => void;
}

const FACTORY_ADDRESS = 'מושב מצליח, ישראל';
const FACTORY_COORDS = { lat: 31.9099, lng: 34.8519 };

/**
 * Renders the actual route polyline and the default Google A/B/C/D markers.
 * This guarantees the stops are always visible on the map — no mapId
 * registration required, no geocoding pitfalls.
 *
 * Reports back the leg geometry so the caller can attach InfoWindow
 * overlays at the exact stop coordinates.
 */
function RouteRenderer({
  stops,
  onLegsReady,
}: {
  stops: { address: string }[];
  onLegsReady: (legs: google.maps.DirectionsLeg[]) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');

  useEffect(() => {
    if (!map || !routesLib || stops.length === 0) return;

    const directionsService = new routesLib.DirectionsService();
    const directionsRenderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: false, // Show Google's default A/B/C/D markers
      polylineOptions: { strokeColor: '#2456E8', strokeWeight: 4, strokeOpacity: 0.85 },
    });

    const waypoints = stops.slice(0, -1).map(s => ({ location: s.address, stopover: true }));

    directionsService.route({
      origin: FACTORY_COORDS,
      destination: stops[stops.length - 1].address,
      waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
      region: 'IL',
    }).then(result => {
      directionsRenderer.setDirections(result);
      onLegsReady(result.routes[0].legs);

      const bounds = new google.maps.LatLngBounds();
      result.routes[0].legs.forEach(leg => {
        bounds.extend(leg.start_location);
        bounds.extend(leg.end_location);
      });
      map.fitBounds(bounds, 80);
    }).catch(err => console.error('Directions error:', err));

    return () => { directionsRenderer.setMap(null); };
  }, [map, routesLib, stops, onLegsReady]);

  return null;
}

export default function DeliveryMap({ stops: inputStops, userRole, deliveryStatus, onStartDelivery }: DeliveryMapProps) {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasApiKey = apiKey.length > 10;
  const isDriver = userRole === 'Driver';

  const calculateRoute = useCallback(async () => {
    if (inputStops.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const data = await (await fetch('/api/delivery/route-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stops: inputStops }),
      })).json();
      if (data.error) { setError(data.error); return; }
      setRouteData(data);
    } catch { setError('שגיאה בחישוב מסלול'); }
    finally { setLoading(false); }
  }, [inputStops]);

  useEffect(() => {
    if (inputStops.length > 0) calculateRoute();
  }, [inputStops, calculateRoute]);

  const openInGoogleMaps = () => {
    if (inputStops.length === 0) return;
    const origin = `${FACTORY_COORDS.lat},${FACTORY_COORDS.lng}`;
    const destination = encodeURIComponent(inputStops[inputStops.length - 1].address);
    const waypoints = inputStops.slice(0, -1).map(s => encodeURIComponent(s.address)).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    window.open(url, '_blank');
    onStartDelivery?.();
  };

  if (inputStops.length === 0) {
    return <p className="text-sm opacity-40 text-center py-4">אין תחנות לתכנון מסלול</p>;
  }

  const showStartButton = isDriver && deliveryStatus !== 'Delivered' && deliveryStatus !== 'Failed';

  return (
    <div className="space-y-4">
      {/* Driver navigation banner — visible to drivers throughout the delivery lifecycle */}
      {showStartButton && (
        <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #2456E8 0%, #1a3a6b 100%)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-white">
              <p className="font-bold text-base mb-0.5">פתח ניווט במכשיר שלך</p>
              <p className="text-xs opacity-80">
                המסלול ייפתח ב-Google Maps עם כל התחנות מסומנות (A, B, C…) ויציאה ממושב מצליח
              </p>
            </div>
            <button
              onClick={openInGoogleMaps}
              className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap"
              style={{ background: '#fff', color: '#2456E8' }}>
              <IconRoute size={16} /> התחל ניווט
            </button>
          </div>
        </div>
      )}

      {/* Map */}
      {hasApiKey ? (
        <APIProvider apiKey={apiKey} language="he" region="IL">
          <div className="rounded-xl overflow-hidden" style={{ height: '380px', border: '1px solid var(--ht-border)' }}>
            <Map
              defaultCenter={FACTORY_COORDS}
              defaultZoom={11}
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              streetViewControl={false}
              mapTypeControl={false}
              fullscreenControl={true}
            >
              <RouteRenderer
                stops={inputStops.map(s => ({ address: s.address }))}
                onLegsReady={() => { /* legs available if we want overlays in future */ }}
              />
            </Map>
          </div>
        </APIProvider>
      ) : (
        <div className="rounded-xl p-6 text-center" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>
            <IconRoute size={32} className="mx-auto opacity-30" />
            <p className="text-sm opacity-50 mt-2">מפה לא זמינה — חסר מפתח Google Maps</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-3">
          <div className="inline-block w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ht-border)', borderTopColor: 'var(--ht-accent)' }}></div>
          <p className="text-xs mt-1 opacity-50">מחשב מסלול אופטימלי...</p>
        </div>
      )}

      {error && <p className="text-sm text-center" style={{ color: 'var(--ht-danger)' }}>{error}</p>}

      {routeData && (
        <div>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl text-center" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--ht-accent)' }}>{routeData.totalDistance}</p>
              <p className="text-xs opacity-50">מרחק כולל</p>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--ht-accent)' }}>{routeData.totalDuration}</p>
              <p className="text-xs opacity-50">זמן נסיעה</p>
            </div>
            <div className="p-3 rounded-xl text-center" style={{ background: 'var(--ht-surface-container)', border: '1px solid var(--ht-border)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--ht-accent)' }}>{routeData.stops.length}</p>
              <p className="text-xs opacity-50">תחנות</p>
            </div>
          </div>

          {/* Stops timeline — full customer details (this is the hover info, always visible) */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--ht-success-bg)', border: '1px solid var(--ht-border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'var(--ht-success)' }}>
                <IconMapPin size={14} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">מפעל ד״ר פיתה — נקודת יציאה</p>
                <p className="text-xs opacity-60">{routeData.origin} · יציאה 08:00</p>
              </div>
            </div>

            {routeData.stops.map((stop, i) => {
              const original = inputStops[i];
              const letter = String.fromCharCode(65 + i); // A, B, C...
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl transition-all hover:shadow-sm"
                  style={{ background: 'var(--ht-surface)', border: '1px solid var(--ht-border)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: 'var(--ht-accent)' }}>
                    {letter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--ht-primary)' }}>{stop.customerName}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs opacity-60">
                      <IconMapPin size={11} /> {stop.address}
                    </div>
                    {original?.phone && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs opacity-60">
                        <IconPhone size={11} /> <span dir="ltr">{original.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--ht-accent)' }} dir="ltr">{stop.eta}</p>
                    <p className="text-[10px] opacity-40">{stop.distance}</p>
                    <p className="text-[10px] opacity-40">{stop.duration}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
