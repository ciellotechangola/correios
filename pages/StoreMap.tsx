// pages/StoreMap.tsx — VERSÃO COMPLETA COM ROTAS FUNCIONAIS COMO GOOGLE MAPS
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Store } from '../types';
import { loadGoogleMapsScript, calculateDistance } from '../services/googleMaps';
import {
  EntityType,
  subscribeToLocations,
  buscarLojasProximas,
  updateLocation,
  getEntityType,
  PedidoAtivo,
  buscarPedidosAtivos,
} from '../services/realtimeTracking';
import {
  ArrowLeft, MapPin, Star, Navigation, Store as StoreIcon,
  ShieldCheck, X, ChevronRight, Maximize2, Minimize2,
  Crosshair, Package, Clock,
} from 'lucide-react';

// Cores como Google Maps
const COLORS: Record<string, string> = {
  ROUTE_BLUE: '#1A73E8',
  CLIENT_BLUE: '#4285F4',
  STORE_RED: '#EA4335',
  OPEN_GREEN: '#34A853',
  CLOSED_GRAY: '#9E9E9E',
};

const STORE_COLORS = ['#FF3B30', '#34C759', '#FF9500', '#5856D6', '#007AFF'];

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

export const StoreMap: React.FC = () => {
  const { goBack, selectStore, setView, stores: STORES, user, orders, setDirectionsMode, setMapConfig } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const storeMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const endMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [closestStore, setClosestStore] = useState<Store | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [nearbyEntities, setNearbyEntities] = useState<any[]>([]);
  const [activePedidos, setActivePedidos] = useState<PedidoAtivo[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<number>(0);

  // ============ TRAÇAR ROTA (MÉTODO GOOGLE MAPS) ============
  const calculateRoute = useCallback((origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, storeName: string) => {
    console.log('🗺️ [ROUTE] Traçando rota para:', storeName);
    
    if (!mapInstance.current) {
      console.error('🗺️ [ROUTE] Mapa não inicializado');
      return;
    }

    // Limpar rota anterior
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.setMap(null);
      endMarkerRef.current = null;
    }

    // Criar serviço e renderer
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }

    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map: mapInstance.current,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: COLORS.ROUTE_BLUE,
        strokeOpacity: 1.0,
        strokeWeight: 8,
      },
    });

    // Solicitar rota
    directionsServiceRef.current.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        console.log('🗺️ [ROUTE] Status:', status);
        
        if (status === 'OK' && result && result.routes.length > 0) {
          console.log('🗺️ [ROUTE] ✅ Rota encontrada!');
          
          directionsRendererRef.current?.setDirections(result);

          const leg = result.routes[0].legs[0];
          setRouteInfo({
            duration: leg.duration?.text || '',
            distance: leg.distance?.text || '',
          });

          // Marcador de início (você)
          startMarkerRef.current = new google.maps.Marker({
            position: origin,
            map: mapInstance.current!,
            title: 'Você está aqui',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: COLORS.CLIENT_BLUE,
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            },
            zIndex: 1000,
          });

          // Marcador de fim (loja)
          endMarkerRef.current = new google.maps.Marker({
            position: destination,
            map: mapInstance.current!,
            title: storeName,
            icon: {
              path: google.maps.SymbolPath.MARKER,
              scale: 30,
              fillColor: COLORS.STORE_RED,
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
            zIndex: 999,
          });

          // Ajustar bounds
          const bounds = new google.maps.LatLngBounds();
          result.routes[0].steps.forEach(step => {
            step.lat_lngs.forEach(latLng => bounds.extend(latLng));
          });
          mapInstance.current?.fitBounds(bounds, { top: 120, right: 50, bottom: 280, left: 50 });
          
          console.log('🗺️ [ROUTE] ✅ Rota desenhada!');
        } else {
          console.error('🗺️ [ROUTE] ❌ Erro:', status);
          setErrorMsg('Não foi possível calcular a rota');
        }
      }
    );
  }, []);

  // ============ LIMPAR ROTA ============
  const clearRoute = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.setMap(null);
      endMarkerRef.current = null;
    }
    setRouteInfo(null);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    setIsTracking(false);
  }, []);

  // ============ INICIALIZAÇÃO DO MAPA ============
  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        console.log('🗺️ [MAP] Carregando Google Maps...');
        await loadGoogleMapsScript({ libraries: ['places', 'geometry', 'directions'] });

        if (!isMounted || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: -8.8390, lng: 13.2894 },
          zoom: 13,
          disableDefaultUI: true,
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: MAP_STYLES,
        });

        mapInstance.current = map;
        directionsServiceRef.current = new google.maps.DirectionsService();
        setMapLoaded(true);
        console.log('🗺️ [MAP] Mapa criado!');

        // Adicionar lojas ao mapa
        addStoreMarkers(map, STORES);

        // Obter localização do usuário
        getUserPosition();

        // Carregar pedidos ativos
        if (user) {
          const perfil = user.role === 'CLIENTE' ? 'cliente' : user.role === 'VENDEDOR' ? 'vendedor' : 'entregador';
          buscarPedidosAtivos(user.id, perfil).then(setActivePedidos);
        }

        setTimeout(() => {
          if (mapInstance.current) {
            google.maps.event.trigger(mapInstance.current, 'resize');
          }
        }, 300);
      } catch (err) {
        console.error('🗺️ [MAP] ERRO:', err);
        setErrorMsg('Erro ao carregar mapa');
      }
    };

    initMap();

    return () => {
      isMounted = false;
      stopTracking();
      if (unsubscribeRef.current) unsubscribeRef.current();
      storeMarkersRef.current.forEach(marker => marker.setMap(null));
      storeMarkersRef.current.clear();
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);
      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
      if (startMarkerRef.current) startMarkerRef.current.setMap(null);
      if (endMarkerRef.current) endMarkerRef.current.setMap(null);
    };
  }, [STORES, user]);

  // ============ LOCALIZAÇÃO DO USUÁRIO ============
  const getUserPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocalização não suportada.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (isValidCoordinates(lat, lng)) {
          const loc = { lat, lng };
          setUserLocation(loc);

          if (mapInstance.current) {
            userMarkerRef.current = new google.maps.Marker({
              position: loc,
              map: mapInstance.current,
              title: 'Você',
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: COLORS.CLIENT_BLUE,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
              zIndex: 1000,
            });

            mapInstance.current.panTo(loc);
            calculateClosestStore(loc);
          }

          startTracking();
        }
      },
      (error) => {
        console.warn('🗺️ [GPS] Erro:', error);
        setErrorMsg('GPS indisponível.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation || !user) return;

    setIsTracking(true);

    unsubscribeRef.current = subscribeToLocations(
      { perfis: ['vendedor', 'loja', 'cliente'] },
      (entities) => {
        setNearbyEntities(entities);
      }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (!isValidCoordinates(lat, lng)) return;

        const loc = { lat, lng };
        setUserLocation(loc);

        if (userMarkerRef.current) {
          userMarkerRef.current.setPosition(loc);
        }

        // Enviar para Supabase com debounce
        const now = Date.now();
        if (now - lastUpdateRef.current > 5000) {
          lastUpdateRef.current = now;
          const perfil = user.role === 'CLIENTE' ? 'cliente' : user.role === 'VENDEDOR' ? 'vendedor' : 'entregador';
          await updateLocation(user.id, lat, lng, perfil);
        }
      },
      (error) => {
        console.warn('🗺️ [GPS] Erro tracking:', error);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
  }, [user]);

  // ============ MARKERS DE LOJAS ============
  const addStoreMarkers = useCallback((map: google.maps.Map, stores: Store[]) => {
    storeMarkersRef.current.forEach(marker => marker.setMap(null));
    storeMarkersRef.current.clear();

    const validStores = stores.filter(store =>
      typeof store.lat === 'number' && typeof store.lng === 'number' &&
      isValidCoordinates(store.lat, store.lng)
    );

    if (validStores.length === 0) return;

    validStores.forEach((store, index) => {
      const color = STORE_COLORS[index % STORE_COLORS.length];

      const marker = new google.maps.Marker({
        position: { lat: store.lat, lng: store.lng },
        map,
        title: store.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        animation: google.maps.Animation.DROP,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: createStoreInfoWindowContent(store, color),
      });

      marker.addListener('click', () => {
        setSelectedStore(store);
        infoWindow.open(map, marker);
        map.setZoom(16);
        map.panTo({ lat: store.lat, lng: store.lng });

        if (userLocation) {
          calculateRoute(userLocation, { lat: store.lat, lng: store.lng }, store.name);
        }
      });

      storeMarkersRef.current.set(store.id, marker);
    });

    const bounds = new google.maps.LatLngBounds();
    validStores.forEach(store => bounds.extend({ lat: store.lat, lng: store.lng }));
    map.fitBounds(bounds, { top: 100, right: 50, bottom: 100, left: 50 });
  }, [calculateRoute, userLocation]);

  // ============ UTILITÁRIOS (CORRIGIDO) ============
  const calculateClosestStore = useCallback((userLoc: { lat: number; lng: number }) => {
    let minDistance = Infinity;
    let closest: Store | null = null;

    // Log para debug
    console.log('🗺️ [StoreMap] Calculando loja mais próxima entre', STORES.length, 'lojas');
    console.log('📍 User location:', userLoc);

    STORES.forEach(store => {
      // Verificar coordenadas válidas (pode usar lat/latitude e lng/longitude)
      const storeLat = store.lat;
      const storeLng = store.lng;
      
      if (typeof storeLat === 'number' && typeof storeLng === 'number' &&
          !isNaN(storeLat) && !isNaN(storeLng) &&
          storeLat >= -90 && storeLat <= 90 &&
          storeLng >= -180 && storeLng <= 180) {
        
        const dist = calculateDistance(userLoc, { lat: storeLat, lng: storeLng });
        console.log(`  📌 ${store.name}: ${dist.toFixed(2)}km`);
        
        if (dist < minDistance) {
          minDistance = dist;
          closest = store;
        }
      } else {
        console.log(`  ⚠️ ${store.name}: coordenadas inválidas (${storeLat}, ${storeLng})`);
      }
    });

    if (closest) {
      console.log('✅ Loja mais próxima:', closest.name, '-', minDistance.toFixed(2), 'km');
    }
    
    setClosestStore(closest);
  }, [STORES]);

  const recenterMap = useCallback(() => {
    if (mapInstance.current && userLocation) {
      mapInstance.current.panTo(userLocation);
      mapInstance.current.setZoom(15);
    }
  }, [userLocation]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => {
          if (mapInstance.current) google.maps.event.trigger(mapInstance.current, 'resize');
        }, 300);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => {
          if (mapInstance.current) google.maps.event.trigger(mapInstance.current, 'resize');
        }, 300);
      });
    }
  }, []);

  // ============ RENDER ============
  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col font-['Inter']" style={{ height: '100vh', width: '100vw' }} ref={containerRef}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-[400] flex items-center justify-between gap-4 bg-gradient-to-b from-white/95 to-transparent pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            onClick={goBack}
            className="bg-white text-gray-800 p-2 rounded-full shadow-lg border border-gray-200 active:scale-95 transition-transform hover:bg-gray-50"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Mapa de Lojas</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Package size={12} />
              {STORES.length} lojas disponíveis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {isFullscreen ? (
            <button onClick={toggleFullscreen} className="bg-white text-gray-800 p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50">
              <Minimize2 size={20} />
            </button>
          ) : (
            <button onClick={toggleFullscreen} className="bg-white text-gray-800 p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50">
              <Maximize2 size={20} />
            </button>
          )}
          <button onClick={() => setView('home')} className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg active:scale-95 transition-transform hover:bg-red-600 font-bold flex items-center gap-2">
            <span className="text-sm">Sair</span>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="w-full flex-1 bg-gray-100" style={{ minHeight: '100vh' }} />

      {/* Loading */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-[350]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600 font-medium mt-4">Carregando mapa...</p>
          </div>
        </div>
      )}

      {/* Loja Mais Próxima (CORRIGIDO) */}
      {closestStore && !selectedStore && mapLoaded && (
        <div className="absolute top-20 left-4 right-4 z-[400]">
          <div
            className="bg-white/95 backdrop-blur border border-blue-200 p-3 rounded-xl shadow-lg flex items-center gap-3 cursor-pointer active:scale-95 transition-transform"
            onClick={() => {
              // Usar infraestrutura existente: FullMap com mode pickup
              setDirectionsMode(true);
              setMapConfig({
                mode: 'pickup',
                storeName: closestStore.name,
                storeLat: closestStore.lat,
                storeLng: closestStore.lng
              });
              setView('full-map');
            }}
          >
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
              <Navigation size={18} />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 text-sm font-bold">Loja mais próxima</p>
              <p className="text-gray-500 text-xs">
                {closestStore.name} • {closestStore.distance || 'N/A'}
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>
      )}

      {/* Info da Rota */}
      {routeInfo && (
        <div className="absolute top-20 left-4 right-4 z-[400]">
          <div className="bg-blue-600/95 backdrop-blur text-white p-3 rounded-xl shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={18} />
              <div>
                <p className="font-bold">{routeInfo.duration}</p>
                <p className="text-xs opacity-80">{routeInfo.distance}</p>
              </div>
            </div>
            <button onClick={clearRoute} className="p-2 hover:bg-white/20 rounded-full">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Botões de Controle */}
      <div className={`absolute right-4 z-[400] flex flex-col gap-3 ${selectedStore ? 'bottom-64' : 'bottom-28'}`}>
        <button onClick={recenterMap} className="bg-white text-gray-800 p-3 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all">
          <Crosshair size={24} />
        </button>
        <button onClick={isTracking ? stopTracking : startTracking} className={`p-3 rounded-full shadow-lg border active:scale-95 transition-all ${isTracking ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200'}`}>
          <Navigation size={24} className={isTracking ? 'animate-pulse' : ''} />
        </button>
      </div>

      {/* Painel da Loja Selecionada */}
      {selectedStore && mapLoaded && (
        <div className="absolute bottom-24 left-4 right-4 bg-white/95 backdrop-blur border border-gray-200 p-4 rounded-2xl shadow-2xl z-[400]">
          <button onClick={() => { setSelectedStore(null); clearRoute(); }} className="absolute top-3 right-3">
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gray-50 rounded-xl p-1 shrink-0 border border-gray-200">
              <img src={selectedStore.logo} alt={selectedStore.name} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-800 font-bold text-lg">{selectedStore.name}</h3>
              <p className="text-gray-500 text-xs">{selectedStore.niche} Specialist</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                  <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-bold text-gray-700">{selectedStore.rating}</span>
                </div>
                {selectedStore.isVerified && (
                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                    <ShieldCheck size={12} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600">Verificada</span>
                  </div>
                )}
                {userLocation && (
                  <span className="text-xs text-gray-500 ml-auto">
                    {calculateDistance(userLocation, { lat: selectedStore.lat, lng: selectedStore.lng }).toFixed(1)} km
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                // Usar infraestrutura existente: FullMap com mode pickup
                setDirectionsMode(true);
                setMapConfig({
                  mode: 'pickup',
                  storeName: selectedStore.name,
                  storeLat: selectedStore.lat,
                  storeLng: selectedStore.lng
                });
                setView('full-map');
              }}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform hover:bg-blue-700"
            >
              <Navigation size={18} />
              Rota
            </button>
            <button
              onClick={() => selectStore(selectedStore)}
              className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform hover:bg-emerald-700"
            >
              <StoreIcon size={18} />
              Produtos
            </button>
          </div>
        </div>
      )}

      {/* Mensagem de Erro */}
      {errorMsg && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-xs px-4 py-2 rounded-full z-[500]">
          {errorMsg}
        </div>
      )}

      {/* Status do Tracking */}
      {isTracking && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-lg z-[400] flex items-center gap-2 border border-gray-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-gray-700">Tempo real</span>
          {userLocation && (
            <span className="text-[10px] text-gray-500 font-mono">
              {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

function createStoreInfoWindowContent(store: Store, color: string): string {
  return `
    <div style="padding: 12px; min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
        <strong style="font-size: 14px;">${store.name}</strong>
      </div>
      <p style="font-size: 12px; color: #666; margin: 0;">${store.niche || 'Universal'}</p>
      <p style="font-size: 12px; color: #999; margin-top: 4px;">⭐ ${store.rating}</p>
    </div>
  `;
}

export default StoreMap;