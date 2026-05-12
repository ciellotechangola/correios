import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import { DivIcon, LatLngExpression } from 'leaflet';
import { MapPin, Navigation, Maximize2, Minimize2, Crosshair, Users, Store } from 'lucide-react';
import L from 'leaflet';

// Fix para ícones do Leaflet no Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Ícone personalizado para usuário
const userIcon = new DivIcon({
  html: `
    <div class="relative">
      <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
      <div class="absolute -inset-2 bg-blue-500/20 rounded-full animate-ping"></div>
    </div>
  `,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Ícone para lojas
const createShopIcon = (color: string = '#3b82f6') => new DivIcon({
  html: `
    <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${color}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/>
      </svg>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Ícone para cliente
const clientIcon = new DivIcon({
  html: `
    <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center bg-emerald-500">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Componente para recentralizar o mapa
const RecenterButton: React.FC<{ position: [number, number] | null }> = ({ position }) => {
  const map = useMap();
  
  const recenter = () => {
    if (position) {
      map.flyTo(position, 15, { duration: 1.5 });
    }
  };

  return (
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '80px', marginRight: '10px' }}>
      <button
        onClick={recenter}
        className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
        title="Centralizar na minha localização"
      >
        <Crosshair size={20} className="text-blue-600" />
      </button>
    </div>
  );
};

// Componente para fullscreen
const FullscreenButton: React.FC = () => {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = (map as any)._container;
    if (container) {
      containerRef.current = container;
    }
  }, [map]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => map.invalidateSize(), 300);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => map.invalidateSize(), 300);
      });
    }
  };

  return (
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '130px', marginRight: '10px' }}>
      <button
        onClick={toggleFullscreen}
        className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
        title={isFullscreen ? 'Sair do fullscreen' : 'Maximizar mapa'}
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>
    </div>
  );
};

// Componente para tracking de localização
const LocationTracker: React.FC<{
  onLocationUpdate: (lat: number, lng: number) => void;
}> = ({ onLocationUpdate }) => {
  useMapEvents({
    locationfound(e) {
      onLocationUpdate(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

// Interface do componente
interface EnhancedMapProps {
  stores?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    niche?: string;
    rating?: number;
    address?: string;
    phone?: string;
    is_open?: boolean;
    logo?: string;
  }>;
  userLocation?: { lat: number; lng: number } | null;
  showUserLocation?: boolean;
  enableRealtimeTracking?: boolean;
  onStoreClick?: (storeId: string) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  height?: string;
}

export const EnhancedMap: React.FC<EnhancedMapProps> = ({
  stores = [],
  userLocation: externalUserLocation,
  showUserLocation = true,
  enableRealtimeTracking = true,
  onStoreClick,
  initialCenter = [-8.839988, 13.289437], // Luanda
  initialZoom = 12,
  height = '500px',
}) => {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(externalUserLocation || null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(enableRealtimeTracking);
  const watchIdRef = useRef<number | null>(null);

  // Geolocalização em tempo real
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada');
      return;
    }

    setIsTracking(true);
    setLocationError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLoc({ lat: latitude, lng: longitude });
        setLocationError(null);
      },
      (error) => {
        console.error('Erro na geolocalização:', error);
        setLocationError(`Erro ao obter localização: ${error.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (enableRealtimeTracking) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enableRealtimeTracking, startTracking, stopTracking]);

  // Atualizar quando localização externa mudar
  useEffect(() => {
    if (externalUserLocation) {
      setUserLoc(externalUserLocation);
    }
  }, [externalUserLocation]);

  // Função para calcular bounds do mapa baseado nos marcadores
  const getMapBounds = () => {
    const allPoints = [
      ...stores.map(s => [s.lat, s.lng]),
      userLoc ? [userLoc.lat, userLoc.lng] : null,
    ].filter(Boolean) as [number, number][];

    if (allPoints.length === 0) return { center: initialCenter, zoom: initialZoom };

    const minLat = Math.min(...allPoints.map(p => p[0]));
    const maxLat = Math.max(...allPoints.map(p => p[0]));
    const minLng = Math.min(...allPoints.map(p => p[1]));
    const maxLng = Math.max(...allPoints.map(p => p[1]));

    const center: [number, number] = [
      (minLat + maxLat) / 2,
      (minLng + maxLng) / 2,
    ];

    return { center, zoom: initialZoom };
  };

  const { center, zoom } = getMapBounds();

  // Cores por nicho
  const nicheColors: Record<string, string> = {
    Toyota: '#3b82f6',
    Hyundai: '#ef4444',
    Nissan: '#22c55e',
    BMW: '#eab308',
    Universal: '#64748b',
  };

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '16px' }}
        zoomControl={false}
      >
        {/* Tile Layer - OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Localização do usuário */}
        {showUserLocation && userLoc && (
          <>
            <Marker
              position={[userLoc.lat, userLoc.lng]}
              icon={clientIcon}
            >
              <Popup>
                <div className="text-center">
                  <strong className="text-emerald-600">📍 Sua Localização</strong>
                  <p className="text-xs text-gray-500 mt-1">
                    Lat: {userLoc.lat.toFixed(6)}<br />
                    Lng: {userLoc.lng.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Círculo de precisão */}
            <Circle
              center={[userLoc.lat, userLoc.lng]}
              radius={50}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
          </>
        )}

        {/* Marcadores das lojas */}
        {stores.map((store) => {
          const color = nicheColors[store.niche || ''] || '#64748b';
          const icon = createShopIcon(color);

          return (
            <Marker
              key={store.id}
              position={[store.lat, store.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onStoreClick) {
                    onStoreClick(store.id);
                  }
                },
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="flex items-start gap-2 mb-2">
                    {store.logo && (
                      <img
                        src={store.logo}
                        alt={store.name}
                        className="w-10 h-10 rounded-lg object-contain bg-gray-100 p-1"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-sm">{store.name}</h3>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] text-white font-bold mt-1"
                        style={{ backgroundColor: color }}
                      >
                        {store.niche || 'Universal'}
                      </span>
                    </div>
                  </div>
                  
                  {store.rating && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                      <span>⭐</span>
                      <span>{store.rating.toFixed(1)}</span>
                    </div>
                  )}
                  
                  {store.address && (
                    <p className="text-xs text-gray-500 mb-1">{store.address}</p>
                  )}
                  
                  {store.phone && (
                    <p className="text-xs text-gray-500 mb-2">📞 {store.phone}</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <span className={`text-xs ${store.is_open ? 'text-green-600' : 'text-red-600'}`}>
                      {store.is_open ? '● Aberto' : '● Fechado'}
                    </span>
                    {onStoreClick && (
                      <button
                        onClick={() => onStoreClick(store.id)}
                        className="text-xs text-blue-600 font-bold hover:text-blue-700"
                      >
                        Ver Loja →
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Botões customizados */}
        {userLoc && <RecenterButton position={[userLoc.lat, userLoc.lng]} />}
        <FullscreenButton />
        <LocationTracker onLocationUpdate={(lat, lng) => {
          // Atualização adicional se necessária
        }} />
      </MapContainer>

      {/* Status de localização */}
      {locationError && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/90 backdrop-blur text-white px-4 py-2 rounded-lg text-xs z-[1000]">
          ⚠️ {locationError}
        </div>
      )}

      {/* Indicador de tracking */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg z-[1000] flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        <span className="text-xs font-medium">
          {isTracking ? 'Tempo real ativo' : 'Tempo real desativado'}
        </span>
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className="text-xs text-blue-600 hover:text-blue-700 ml-2 font-medium"
        >
          {isTracking ? 'Parar' : 'Iniciar'}
        </button>
      </div>

      {/* Legenda */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg z-[1000]">
        <h4 className="text-xs font-bold mb-2">Legenda</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-[10px]">Cliente</span>
          </div>
          {Object.entries(nicheColors).slice(0, 4).map(([niche, color]) => (
            <div key={niche} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-[10px]">{niche}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnhancedMap;
