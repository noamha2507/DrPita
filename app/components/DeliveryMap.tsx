'use client';

import { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { IconRoute, IconMapPin, IconClock, IconCheck } from './Icons';

interface Stop {
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
  stops: Stop[];
  totalDistance: string;
  totalDuration: string;
  polyline?: string;
  isMock: boolean;
}

interface DeliveryMapProps {
  stops: { customerName: string; address: string; orderId: number }[];
}

// Directions renderer component
function DirectionsRenderer({ origin, stops }: { origin: string; stops: { address: string }[] }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');

  useEffect(() => {
    if (!map || !routesLib || stops.length === 0) return;

    const directionsService = new routesLib.DirectionsService();
    const directionsRenderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#2456E8', strokeWeight: 4, strokeOpacity: 0.8 },
    });

    const waypoints = stops.slice(0, -1).map(s => ({ location: s.address, stopover: true }));

    directionsService.route({
      origin,
      destination: stops[stops.length - 1].address,
      waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
      region: 'IL',
    }).then(result => {
      directionsRenderer.setDirections(result);
    }).catch(err => {
      console.error('Directions error:', err);
    });

    return () => { directionsRenderer.setMap(null); };
  }, [map, routesLib, origin, stops]);

  return null;
}

export default function DeliveryMap({ stops: inputStops }: DeliveryMapProps) {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasApiKey = apiKey.length > 10;

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

  if (inputStops.length === 0) {
    return <p className="text-sm opacity-40 text-center py-4">אין תחנות לתכנון מסלול</p>;
  }

  return (
    <div className="space-y-4">
      {/* Map */}
      {hasApiKey ? (
        <APIProvider apiKey={apiKey} language="he" region="IL">
          <div className="rounded-xl overflow-hidden" style={{ height: '300px', border: '1px solid var(--ht-border)' }}>
            <Map
              defaultCenter={{ lat: 31.95, lng: 34.8 }}
              defaultZoom={10}
              mapId="delivery-map"
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              streetViewControl={false}
              mapTypeControl={false}
              fullscreenControl={true}
            >
              <DirectionsRenderer
                origin="אזור תעשייה, לוד, ישראל"
                stops={inputStops.map(s => ({ address: s.address }))}
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

      {/* Route summary */}
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

          {routeData.isMock && (
            <p className="text-xs text-center opacity-30 mb-2">נתוני מסלול משוערים (ללא Google Maps API)</p>
          )}

          {/* Stops timeline */}
          <div className="space-y-2">
            {/* Origin */}
            <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--ht-success-bg)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--ht-success)' }}>
                <IconMapPin size={14} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">מפעל ד״ר פיתה — נקודת יציאה</p>
                <p className="text-xs opacity-50">{routeData.origin} · יציאה 08:00</p>
              </div>
            </div>

            {routeData.stops.map((stop, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--ht-surface-container)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--ht-accent)' }}>
                  {stop.stopNumber}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{stop.customerName}</p>
                  <p className="text-xs opacity-50">{stop.address}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--ht-accent)' }}>{stop.eta}</p>
                  <p className="text-[10px] opacity-40">{stop.distance} · {stop.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
