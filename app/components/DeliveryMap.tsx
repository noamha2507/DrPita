'use client';

import { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary, Pin } from '@vis.gl/react-google-maps';
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
const FACTORY_COORDS = { lat: 31.9099, lng: 34.8519 }; // מושב מצליח (Moshav Matzliah, near Ramla)

// Polyline-only renderer (suppresses default markers — we render our own)
function PolylineRenderer({ stops }: { stops: { address: string }[] }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');

  useEffect(() => {
    if (!map || !routesLib || stops.length === 0) return;

    const directionsService = new routesLib.DirectionsService();
    const directionsRenderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true, // We'll render custom markers
      polylineOptions: { strokeColor: '#2456E8', strokeWeight: 4, strokeOpacity: 0.7 },
    });

    const waypoints = stops.slice(0, -1).map(s => ({ location: s.address, stopover: true }));

    directionsService.route({
      origin: FACTORY_COORDS, // Precise coords anchor the start at מושב מצליח
      destination: stops[stops.length - 1].address,
      waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
      region: 'IL',
    }).then(result => {
      directionsRenderer.setDirections(result);

      // Fit bounds to show all stops
      const bounds = new google.maps.LatLngBounds();
      result.routes[0].legs.forEach(leg => {
        bounds.extend(leg.start_location);
        bounds.extend(leg.end_location);
      });
      map.fitBounds(bounds, 80);
    }).catch(err => console.error('Directions error:', err));

    return () => { directionsRenderer.setMap(null); };
  }, [map, routesLib, origin, stops]);

  return null;
}

// Geocoder helper for getting coordinates
function useGeocodedStops(stops: InputStop[]) {
  const geocoding = useMapsLibrary('geocoding');
  const [geocoded, setGeocoded] = useState<Array<InputStop & { lat: number; lng: number }>>([]);

  useEffect(() => {
    if (!geocoding || stops.length === 0) return;
    const geocoder = new geocoding.Geocoder();
    const promises = stops.map(stop =>
      geocoder.geocode({ address: stop.address, region: 'IL' }).then(result => {
        const loc = result.results[0]?.geometry.location;
        return {
          ...stop,
          lat: loc?.lat() ?? FACTORY_COORDS.lat,
          lng: loc?.lng() ?? FACTORY_COORDS.lng,
        };
      }).catch(() => ({ ...stop, lat: FACTORY_COORDS.lat, lng: FACTORY_COORDS.lng }))
    );
    Promise.all(promises).then(setGeocoded);
  }, [geocoding, stops]);

  return geocoded;
}

// Custom marker with hover info window
function StopMarker({
  position,
  stopNumber,
  stop,
  routeStop,
}: {
  position: { lat: number; lng: number };
  stopNumber: number;
  stop: InputStop;
  routeStop?: RouteStop;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdvancedMarker
        position={position}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
      >
        <Pin background="#2456E8" borderColor="#0A1A2F" glyphColor="#fff">
          <span style={{ fontWeight: 700 }}>{stopNumber}</span>
        </Pin>
      </AdvancedMarker>
      {open && (
        <InfoWindow position={position} onCloseClick={() => setOpen(false)} headerDisabled>
          <div style={{
            direction: 'rtl', fontFamily: 'Heebo, sans-serif',
            padding: '6px 10px', minWidth: '220px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: '#2456E8', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
              }}>{stopNumber}</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0A1A2F' }}>{stop.customerName}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px', lineHeight: 1.4 }}>
              📍 {stop.address}
            </div>
            {stop.phone && (
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }} dir="ltr">
                ☎️ {stop.phone}
              </div>
            )}
            {routeStop && (
              <div style={{
                marginTop: '8px', paddingTop: '8px',
                borderTop: '1px solid #eee',
                display: 'flex', gap: '12px', fontSize: '11px', color: '#777',
              }}>
                <span>⏱ הגעה: <strong style={{ color: '#2456E8' }} dir="ltr">{routeStop.eta}</strong></span>
                <span>📏 {routeStop.distance}</span>
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// Factory origin marker
function FactoryMarker({ position }: { position: { lat: number; lng: number } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AdvancedMarker
        position={position}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <Pin background="#22c55e" borderColor="#0A1A2F" glyphColor="#fff" />
      </AdvancedMarker>
      {open && (
        <InfoWindow position={position} onCloseClick={() => setOpen(false)} headerDisabled>
          <div style={{
            direction: 'rtl', fontFamily: 'Heebo, sans-serif',
            padding: '6px 10px',
          }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0A1A2F', marginBottom: '4px' }}>
              🏭 מפעל ד״ר פיתה
            </div>
            <div style={{ fontSize: '12px', color: '#555' }}>{FACTORY_ADDRESS}</div>
            <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px', fontWeight: 600 }}>
              נקודת יציאה • 08:00
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
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
    // Use precise coordinates so the route always starts at the factory in מושב מצליח
    const origin = `${FACTORY_COORDS.lat},${FACTORY_COORDS.lng}`;
    const destination = encodeURIComponent(inputStops[inputStops.length - 1].address);
    const waypoints = inputStops.slice(0, -1).map(s => encodeURIComponent(s.address)).join('|');
    // No dir_action=navigate → Google Maps shows the route preview with A, B, C, D stops
    // Driver can review the plan and tap "Start" to begin turn-by-turn navigation
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    window.open(url, '_blank');
    onStartDelivery?.();
  };

  if (inputStops.length === 0) {
    return <p className="text-sm opacity-40 text-center py-4">אין תחנות לתכנון מסלול</p>;
  }

  return (
    <div className="space-y-4">
      {/* Driver navigation banner */}
      {isDriver && (deliveryStatus === 'Loaded' || deliveryStatus === 'On The Way') && (
        <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #2456E8 0%, #1a3a6b 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="text-white">
              <p className="font-bold text-base mb-0.5">מוכן לצאת לדרך?</p>
              <p className="text-xs opacity-80">פתח את Google Maps במצב ניווט מלא עם כל התחנות</p>
            </div>
            <button
              onClick={openInGoogleMaps}
              className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
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
              mapId="delivery-map"
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              streetViewControl={false}
              mapTypeControl={false}
              fullscreenControl={true}
            >
              <PolylineRenderer stops={inputStops.map(s => ({ address: s.address }))} />
              <MapMarkers inputStops={inputStops} routeData={routeData} />
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
                  <p className="text-sm font-bold" style={{ color: 'var(--ht-accent)' }} dir="ltr">{stop.eta}</p>
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

// Helper component: renders factory + stop markers, geocoding addresses internally
function MapMarkers({ inputStops, routeData }: { inputStops: InputStop[]; routeData: RouteData | null }) {
  const geocoded = useGeocodedStops(inputStops);

  return (
    <>
      <FactoryMarker position={FACTORY_COORDS} />
      {geocoded.map((stop, i) => (
        <StopMarker
          key={stop.orderId}
          position={{ lat: stop.lat, lng: stop.lng }}
          stopNumber={i + 1}
          stop={stop}
          routeStop={routeData?.stops[i]}
        />
      ))}
    </>
  );
}
