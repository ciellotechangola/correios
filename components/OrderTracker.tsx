import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Phone, MessageCircle, Package, MapPin, Truck, X, Clock, CheckCircle2, Navigation } from 'lucide-react';
import { formatCurrency } from '../services/utils';
import { loadGoogleMapsScript, calculateDistance } from '../services/googleMaps';

interface OrderTrackerProps {
  onBack: () => void;
}

// Cores otimizadas conforme especificação
const COLORS = {
  routeMain: '#FF3B30',      // Vermelho forte - linha principal
  routeGlow: '#FFD60A',      // Amarelo - glow/linha secundária
  client: '#007AFF',         // Azul iOS - cliente
  store: '#000000',          // Preto - loja
  delivery: '#34C759',       // Verde - entregador
};

export const OrderTracker: React.FC<OrderTrackerProps> = ({ onBack }) => {
  const {
    selectedOrder, stores, realTimeLocations, subscribeToOrderLocations,
    unsubscribeFromLocations, startGpsTracking, stopGpsTracking,
    user, updateOrderStatus, selectChatStore, setView
  } = useApp();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{[key: string]: google.maps.Marker | null}>({});
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);

  const order = selectedOrder;
  const store = stores.find(s => s.id === order?.storeId);

  if (!order || !store) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-800">Pedido não encontrado</p>
          <button onClick={onBack} className="mt-4 text-blue-500 text-sm font-bold">Voltar</button>
        </div>
      </div>
    );
  }

  const isDelivery = order.tipo_entrega === 'delivery';
  const isFinished = order.status === 'ENTREGUE' || order.status === 'CANCELADO';
  const isVendor = user?.role === 'VENDEDOR' || user?.role === 'ENTREGADOR';

  // Obter localizacoes em tempo real
  const clientLocation = realTimeLocations.find(l => l.tipo_localizacao === 'cliente');
  const entregadorLocation = realTimeLocations.find(l => l.tipo_localizacao === 'entregador');
  const lojaLocation = realTimeLocations.find(l => l.tipo_localizacao === 'loja');

  // Destino e origem dependem do tipo de entrega
  const storeLat = store.lat || -8.839988;
  const storeLng = store.lng || 13.289437;

  // Inicializar mapa e subscriptions
  useEffect(() => {
    if (!order || isFinished) return;

    subscribeToOrderLocations(order.id);

    if (user?.role === 'CLIENTE') {
      startGpsTracking(order.id, 'cliente');
    } else if (user?.role === 'ENTREGADOR') {
      startGpsTracking(order.id, 'entregador');
    }

    return () => {
      unsubscribeFromLocations();
      stopGpsTracking();
    };
  }, [order?.id, isFinished]);

  // Inicializar Google Maps
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript();
        
        if (!mapRef.current || mapInstance.current) return;
        
        // Wait a bit to ensure DOM is ready
        setTimeout(() => {
          if (mapRef.current && !mapInstance.current) {
            const map = new google.maps.Map(mapRef.current, {
              center: { lat: storeLat, lng: storeLng },
              zoom: 14,
              disableDefaultUI: true,
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              zoomControl: true,
              gestureHandling: 'greedy',
            });

            mapInstance.current = map;
            setMapLoaded(true);
            
            // Force resize to ensure map renders correctly
            google.maps.event.trigger(map, 'resize');
          }
        }, 300);
      } catch (err) {
        console.error('Erro ao carregar Google Maps:', err);
        setErrorMsg('Erro ao inicializar mapa');
      }
    };

    initMap();

    return () => {
      // Cleanup markers and directions renderer
      Object.values(markersRef.current).forEach((marker: google.maps.Marker | null) => {
        if (marker) marker.setMap(null);
      });
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, []);

  // Fallback: tentar obter localização do cliente
  const [localClientLocation, setLocalClientLocation] = useState<any>(null);
  
  useEffect(() => {
    if (!clientLocation && !isVendor && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocalClientLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          });
        },
        (err) => console.warn('Fallback GPS error:', err.message),
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 }
      );
    }
  }, [clientLocation, isVendor]);

  // Usar localização local se não houver do contexto
  const effectiveClientLocation = clientLocation || localClientLocation;

  // Atualizar marcadores e rota quando localizações mudam
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !order || !mapLoaded) return;

    // Limpar marcadores anteriores
    Object.values(markersRef.current).forEach((marker: google.maps.Marker | null) => {
      if (marker) marker.setMap(null);
    });
    markersRef.current = {};

    // Remover rota anterior
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    // Marcador da Loja
    const storeMarker = new google.maps.Marker({
      position: { lat: storeLat, lng: storeLng },
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: COLORS.store,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: store.name,
    });
    markersRef.current.store = storeMarker;

    // Marcador do Cliente
    if (effectiveClientLocation) {
      const clientMarker = new google.maps.Marker({
        position: { lat: effectiveClientLocation.latitude, lng: effectiveClientLocation.longitude },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: COLORS.client,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Você (Cliente)',
      });
      markersRef.current.client = clientMarker;
    }

    // Marcador do Entregador
    if (entregadorLocation && isDelivery) {
      const entregadorMarker = new google.maps.Marker({
        position: { lat: entregadorLocation.latitude, lng: entregadorLocation.longitude },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 13,
          fillColor: COLORS.delivery,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Entregador',
        animation: google.maps.Animation.BOUNCE,
      });
      markersRef.current.entregador = entregadorMarker;
    }

    // Desenhar rota usando Google Directions API
    drawRoute(map);

  }, [realTimeLocations, order?.id, mapLoaded, effectiveClientLocation, entregadorLocation]);

  const drawRoute = useCallback((map: google.maps.Map) => {
    if (!order) return;

    let originLat: number | undefined, originLng: number | undefined, destLat: number, destLng: number;

    if (isDelivery && order.status === 'EM_ROTA') {
      if (entregadorLocation) {
        originLat = entregadorLocation.latitude;
        originLng = entregadorLocation.longitude;
      } else {
        originLat = storeLat;
        originLng = storeLng;
      }
      destLat = effectiveClientLocation?.latitude ?? storeLat;
      destLng = effectiveClientLocation?.longitude ?? storeLng;
    } else {
      if (effectiveClientLocation?.latitude && effectiveClientLocation?.longitude) {
        originLat = effectiveClientLocation.latitude;
        originLng = effectiveClientLocation.longitude;
      } else {
        setErrorMsg('Ative o GPS para ver a rota completa');
        map.setCenter({ lat: storeLat, lng: storeLng });
        map.setZoom(14);
        return;
      }
      destLat = storeLat;
      destLng = storeLng;
    }

    if (!isValidCoordinate(originLat, originLng) || !isValidCoordinate(destLat, destLng)) {
      setErrorMsg('Coordenadas inválidas. Verifique o GPS.');
      return;
    }

    if (Math.abs(originLat - destLat) < 0.0001 && Math.abs(originLng - destLng) < 0.0001) {
      setErrorMsg('Origem e destino muito próximos');
      return;
    }

    // Usar Google Directions API
    const directionsService = new google.maps.DirectionsService();
    const travelMode = isDelivery ? google.maps.TravelMode.DRIVING : google.maps.TravelMode.WALKING;

    directionsService.route(
      {
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        travelMode,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          // Remove old renderer
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null);
          }

          // Create new renderer with Uber-style styling
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            directions: result,
            polylineOptions: {
              strokeColor: COLORS.routeMain,
              strokeWeight: 6,
              strokeOpacity: 0.9,
            },
            suppressMarkers: true,
          });
          directionsRendererRef.current = directionsRenderer;

          // Extract route info
          const route = result.routes[0];
          const leg = route.legs[0];

          const distanceKm = (leg.distance?.value || 0) / 1000;
          const durationMin = Math.round((leg.duration?.value || 0) / 60);

          setRouteInfo({ distance: `${distanceKm.toFixed(1)} km`, duration: `${durationMin} min` });
          setErrorMsg('');

          // Ajustar mapa para mostrar todos os pontos
          const bounds = new google.maps.LatLngBounds();
          bounds.extend({ lat: originLat, lng: originLng });
          bounds.extend({ lat: destLat, lng: destLng });

          if (entregadorLocation) {
            bounds.extend({ lat: entregadorLocation.latitude, lng: entregadorLocation.longitude });
          }

          map.fitBounds(bounds, { top: 100, right: 50, bottom: 150, left: 50 });
        } else {
          console.error('Directions request failed:', status);
          setErrorMsg('Não foi possível calcular a rota');
        }
      }
    );
  }, [effectiveClientLocation, entregadorLocation, order?.status, isDelivery, storeLat, storeLng]);

  // Função de validação de coordenadas
  const isValidCoordinate = (lat: number, lng: number): boolean => {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  };

  // Atualizar rota a cada 10 segundos (mais frequente para animação)
  useEffect(() => {
    if (isFinished || !mapInstance.current) return;
    const interval = setInterval(() => drawRoute(mapInstance.current), 10000);
    return () => clearInterval(interval);
  }, [drawRoute, isFinished, mapLoaded]);

  // Status do pedido em steps
  const statusSteps = [
    { key: 'PENDENTE', label: 'Pendente', icon: Clock },
    { key: 'PAGO', label: 'Pago', icon: CheckCircle2 },
    { key: 'PREPARANDO', label: 'Preparando', icon: Package },
    { key: 'EM_ROTA', label: 'Em Rota', icon: Truck },
    { key: 'ENTREGUE', label: 'Entregue', icon: CheckCircle2 },
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);

  const handleCallStore = () => {
    if (store.phone) {
      window.location.href = `tel:${store.phone}`;
    }
  };

  const handleOpenChat = () => {
    selectChatStore(store);
    setView('chat');
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 z-[400] flex justify-between items-start pointer-events-none">
        <button
          onClick={() => {
            unsubscribeFromLocations();
            stopGpsTracking();
            onBack();
          }}
          className="bg-white/95 backdrop-blur text-gray-800 p-3 rounded-full shadow-lg border border-gray-200 active:scale-95 transition-transform pointer-events-auto"
        >
          <ArrowLeft size={24} />
        </button>

        {/* Status Badge */}
        <div className={`bg-white/95 backdrop-blur text-gray-800 px-4 py-2 rounded-xl shadow-lg border pointer-events-auto ${
          order.status === 'EM_ROTA' ? 'border-green-500' :
          order.status === 'ENTREGUE' ? 'border-green-500' :
          'border-blue-500'
        }`}>
          <div className="flex items-center gap-2">
            {order.status === 'EM_ROTA' ? (
              <Truck size={16} className="text-green-600" />
            ) : order.status === 'ENTREGUE' ? (
              <CheckCircle2 size={16} className="text-green-600" />
            ) : (
              <Navigation size={16} className="text-blue-600" />
            )}
            <span className="text-xs font-bold">
              {order.status === 'EM_ROTA' ? 'Entregador a caminho' :
               order.status === 'ENTREGUE' ? 'Pedido entregue!' :
               order.status === 'PREPARANDO' ? 'Preparando pedido' :
               order.status === 'PENDENTE' ? 'Aguardando confirmação' :
               order.status === 'PAGO' ? 'Pagamento confirmado' :
               order.status}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            unsubscribeFromLocations();
            stopGpsTracking();
            setView('home');
          }}
          className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg active:scale-95 transition-transform pointer-events-auto font-bold flex items-center gap-2"
        >
          <span className="text-sm">Sair</span>
          <X size={18} />
        </button>
      </div>

      {/* Mapa */}
      <div id="order-tracker-map" ref={mapRef} className="w-full flex-1" style={{ minHeight: '100vh' }} />

      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-[350]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 font-medium mt-4">Carregando mapa...</p>
          </div>
        </div>
      )}

      {/* Bottom Card */}
      <div className="absolute bottom-0 left-0 right-0 z-[400]">
        {/* Progress Steps */}
        {!isFinished && (
          <div className="mx-4 mb-3 bg-white/95 backdrop-blur border border-gray-200 p-4 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-2">
              {statusSteps.map((step, idx) => (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx <= currentStepIndex
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  } ${idx === currentStepIndex ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white' : ''}`}>
                    <step.icon size={14} />
                  </div>
                  <span className={`text-[9px] mt-1 font-medium ${idx <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500 ease-linear"
                style={{ width: `${Math.max(5, ((currentStepIndex + 1) / statusSteps.length) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-white/95 backdrop-blur border-t border-gray-200 p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full text-white ${order.status === 'EM_ROTA' ? 'bg-green-500' : 'bg-blue-500'}`}>
              {order.status === 'EM_ROTA' ? <Truck size={24} /> : <Package size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-gray-800 font-bold text-sm truncate">
                {store.name}
              </h3>
              <p className="text-gray-500 text-xs">
                Pedido #{order.id.slice(-6).toUpperCase()} • {formatCurrency(order.total)}
              </p>
              {routeInfo && !isFinished && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-gray-800 font-bold text-sm">{routeInfo.duration}</span>
                  <span className="text-gray-400 text-xs">{routeInfo.distance}</span>
                </div>
              )}
              {isFinished && (
                <p className="text-green-600 text-xs font-bold mt-1">Pedido finalizado</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {store.phone && (
                <button
                  onClick={handleCallStore}
                  className="bg-green-100 text-green-600 p-3 rounded-full border border-green-200"
                  title="Ligar para loja"
                >
                  <Phone size={20} />
                </button>
              )}
              <button
                onClick={handleOpenChat}
                className="bg-blue-100 text-blue-600 p-3 rounded-full border border-blue-200"
                title="Chat com loja"
              >
                <MessageCircle size={20} />
              </button>
            </div>
          </div>

          {/* Location Indicators */}
          <div className="flex gap-3 mt-3">
            <div className="flex-1 bg-gray-100 p-2 rounded-lg flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.store }} />
              <span className="text-xs text-gray-600">Loja</span>
            </div>
            {isDelivery && (
              <div className="flex-1 bg-gray-100 p-2 rounded-lg flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: COLORS.delivery }} />
                <span className="text-xs text-gray-600">Entregador</span>
              </div>
            )}
            <div className="flex-1 bg-gray-100 p-2 rounded-lg flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: COLORS.client }} />
              <span className="text-xs text-gray-600">Você</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-sm px-6 py-3 rounded-2xl z-[500] whitespace-nowrap shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {errorMsg}
        </div>
      )}
    </div>
  );
};
