/**
 * StoreMap Profissional com Tempo Real
 * - Marcadores animados por perfil
 * - Movimento suave (interpolação)
 * - Rotas entre cliente e loja
 * - Clustering
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Store } from '../types';
import { ArrowLeft, MapPin, Star, Navigation, Store as StoreIcon, X, Maximize2, Minimize2, Crosshair, Users, Eye, Route, Locate, Layers } from 'lucide-react';
import { loadGoogleMapsScript, calculateDistance, createRoutePolyline, calculateBearing } from '../services/googleMaps';
import { useRealtimeLocation } from '../hooks/useRealtimeLocation';

// Cores por perfil
const COLORS = {
  cliente: '#007AFF',    // Azul iOS
  vendedor: '#34C759',  // Verde
  entregador: '#FF9500', // Laranja
  minhaPosicao: '#007AFF',
  loja: '#FF3B30',     // Vermelho
  rota: '#007AFF',
};

const STORE_COLORS = ['#FF3B30', '#34C759', '#FF9500', '#5856D6', '#AF52DE'];

interface MarkerData {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  perfil: string;
  distancia_km?: number;
  is_online: boolean;
}

interface AnimatedMarker {
  id: string;
  marker: google.maps.Marker;
  targetLat: number;
  targetLng: number;
  currentLat: number;
  currentLng: number;
}

export const StoreMapRealtime: React.FC = () => {
  const { goBack, selectStore, setView, stores: STORES, user } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [closestStore, setClosestStore] = useState<Store | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showClients, setShowClients] = useState(true);
  const [showRoute, setShowRoute] = useState(false);
  const [activeRoute, setActiveRoute] = useState<google.maps.Polyline | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const animatedMarkersRef = useRef<Map<string, AnimatedMarker>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // Determinar perfil baseado no role do usuário
  const isVendedor = user?.role === 'VENDEDOR' || user?.role === 'ENTREGADOR';
  const perfil = isVendedor 
    ? (user?.role === 'ENTREGADOR' ? 'entregador' : 'vendedor')
    : 'cliente';

  // Hook de tracking em tempo real
  const realtime = isVendedor 
    ? useRealtimeLocation({ perfil, raioBusca: 10, atualizarIntervalo: 3000 })
    : null;

  // Criar ícone de marcador personalizado
  const createMarkerIcon = useCallback((type: string, isOnline: boolean = true) => {
    const color = type === 'loja' ? COLORS.loja : 
                type === 'minha' ? COLORS.minhaPosicao :
                COLORS[type] || COLORS.cliente;
    
    const size = type === 'loja' ? 24 : type === 'minha' ? 20 : 16;
    const opacity = isOnline ? 1 : 0.5;

    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: size / 2,
      fillColor: color,
      fillOpacity: opacity,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    };
  }, []);

  // Inicializar Google Maps
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript(['geometry', 'directions']);
        
        if (!mapRef.current) return;
        
        setTimeout(() => {
          if (mapRef.current && !mapInstance.current) {
            const map = new google.maps.Map(mapRef.current, {
              center: { lat: -8.8390, lng: 13.2894 }, // Luanda
              zoom: 14,
              disableDefaultUI: true,
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              zoomControl: true,
              gestureHandling: 'greedy',
              styles: [
                { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
              ],
            });

            mapInstance.current = map;
            setMapLoaded(true);
            google.maps.event.trigger(map, 'resize');

            // Adicionar lojas
            if (STORES.length > 0) {
              addStoreMarkers(map, STORES);
            }
          }
        }, 300);
      } catch (err) {
        console.error('Erro ao carregar Google Maps:', err);
        setErrorMsg('Erro ao carregar mapa');
      }
    };

    initMap();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Adicionar marcadores das lojas
  const addStoreMarkers = useCallback((map: google.maps.Map, stores: Store[]) => {
    // Limpar marcadores anteriores
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    const validStores = stores.filter(store => 
      typeof store.lat === 'number' && typeof store.lng === 'number' && !isNaN(store.lat) && !isNaN(store.lng)
    );

    validStores.forEach((store, idx) => {
      const icon = createMarkerIcon('loja');
      const marker = new google.maps.Marker({
        position: { lat: store.lat, lng: store.lng },
        map,
        title: store.name,
        icon,
      });

      marker.addListener('click', () => {
        setSelectedStore(store);
        map.setZoom(16);
        map.panTo({ lat: store.lat, lng: store.lng });
      });

      markersRef.current.set(`loja_${store.id}`, marker);
    });

    // Fit bounds
    const bounds = new google.maps.LatLngBounds();
    validStores.forEach(store => bounds.extend({ lat: store.lat, lng: store.lng }));
    map.fitBounds(bounds, { top: 100, right: 50, bottom: 100, left: 50 });
  }, [createMarkerIcon]);

  // Atualizar marcadores de clientes (com animação suave)
  const updateClientMarkers = useCallback((map: google.maps.Map, clients: MarkerData[]) => {
    if (!showClients) {
      // Remover todos os marcadores de cliente
      animatedMarkersRef.current.forEach((value, key) => {
        if (key.startsWith('cliente_')) {
          value.marker.setMap(null);
        }
      });
      animatedMarkersRef.current.clear();
      return;
    }

    const existingIds = new Set(animatedMarkersRef.current.keys());

    clients.forEach(client => {
      const key = `cliente_${client.id}`;
      const icon = createMarkerIcon('cliente', client.is_online);

      if (existingIds.has(key)) {
        // Atualizar posisi existente (animação suave)
        const animated = animatedMarkersRef.current.get(key);
        if (animated) {
          animated.targetLat = client.lat;
          animated.targetLng = client.lng;
        }
      } else {
        // Criar novo marcador
        const marker = new google.maps.Marker({
          position: { lat: client.lat, lng: client.lng },
          map,
          title: `Cliente: ${client.nome || 'Anonimo'}`,
          icon,
          zIndex: 999,
        });

        marker.addListener('click', () => {
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 200px;">
                <strong>📍 Cliente Próximo</strong><br/>
                <span style="font-size: 12px; color: #666;">${client.nome || 'Anonimo'}</span><br/>
                <span style="font-size: 11px; color: #999;">Distância: ${client.distancia_km?.toFixed(1)} km</span>
              </div>
            `,
          });
          infoWindow.open(map, marker);
        });

        animatedMarkersRef.current.set(key, {
          id: client.id,
          marker,
          targetLat: client.lat,
          targetLng: client.lng,
          currentLat: client.lat,
          currentLng: client.lng,
        });
      }
    });

    // Remover marcadores que não existem mais
    animatedMarkersRef.current.forEach((value, key) => {
      if (key.startsWith('cliente_')) {
        const exists = clients.some(c => `cliente_${c.id}` === key);
        if (!exists) {
          value.marker.setMap(null);
          animatedMarkersRef.current.delete(key);
        }
      }
    });
  }, [showClients, createMarkerIcon]);

  // Animação suave dos marcadores (lerp)
  const animateMarkers = useCallback(() => {
    const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
    const speed = 0.15;

    animatedMarkersRef.current.forEach((animated) => {
      if (
        Math.abs(animated.currentLat - animated.targetLat) > 0.0001 ||
        Math.abs(animated.currentLng - animated.targetLng) > 0.0001
      ) {
        animated.currentLat = lerp(animated.currentLat, animated.targetLat, speed);
        animated.currentLng = lerp(animated.currentLng, animated.targetLng, speed);
        
        animated.marker.setPosition({
          lat: animated.currentLat,
          lng: animated.currentLng,
        });
      }
    });

    animationFrameRef.current = requestAnimationFrame(animateMarkers);
  }, []);

  // Iniciar animação
  useEffect(() => {
    animateMarkers();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animateMarkers]);

  // Atualizar clientes quando hook atualizar
  useEffect(() => {
    if (!mapInstance.current || !realtime?.proximos?.length) return;
    
    const clients = realtime.proximos.map((c: any) => ({
      id: c.user_id,
      nome: c.nome,
      lat: c.lat,
      lng: c.lng,
      perfil: 'cliente',
      distancia_km: c.distancia_km,
      is_online: c.is_online,
    }));

    updateClientMarkers(mapInstance.current, clients);
  }, [realtime?.proximos, showClients, updateClientMarkers]);

  // Obter localização inicial e iniciar tracking
  useEffect(() => {
    if (!mapLoaded) return;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
            const loc = { lat: latitude, lng: longitude };
            setUserLocation(loc);

            // Adicionar marcador do usuário
            if (mapInstance.current) {
              const icon = createMarkerIcon('minha');
              const userMarker = new google.maps.Marker({
                position: loc,
                map: mapInstance.current,
                title: 'Você está aqui',
                icon,
                zIndex: 1000,
              });
              markersRef.current.set('minha', userMarker);

              // Calcular loja mais próxima
              let minDistance = Infinity;
              let closest: Store | null = null;
              const validStores = STORES.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');

              validStores.forEach(store => {
                const dist = calculateDistance(loc, { lat: store.lat, lng: store.lng });
                if (dist < minDistance) {
                  minDistance = dist;
                  closest = store;
                }
              });

              setClosestStore(closest);
            }

            // Iniciar tracking se for vendedor
            if (isVendedor && realtime) {
              realtime.startTracking();
            }
          }
        },
        (error) => setErrorMsg('Erro ao obter localização'),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    }
  }, [mapLoaded, isVendedor, realtime, STORES, createMarkerIcon]);

  // Criar rota até a loja
  const showRouteToStore = useCallback(() => {
    if (!mapInstance.current || !userLocation || !selectedStore) return;

    // Remover rota anterior
    if (activeRoute) {
      activeRoute.setMap(null);
    }

    // Criar polyline simples
    const polyline = new google.maps.Polyline({
      path: [
        { lat: userLocation.lat, lng: userLocation.lng },
        { lat: selectedStore.lat, lng: selectedStore.lng },
      ],
      geodesic: true,
      strokeColor: COLORS.rota,
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: mapInstance.current,
    });

    setActiveRoute(polyline);
    setShowRoute(true);
  }, [userLocation, selectedStore, activeRoute]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  // Centralizar no usuário
  const recenterMap = useCallback(() => {
    if (mapInstance.current && userLocation) {
      mapInstance.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      mapInstance.current.setZoom(15);
    }
  }, [userLocation]);

  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col" ref={containerRef}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-[400] bg-gradient-to-b from-white/95 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="bg-white p-2 rounded-full shadow-lg border">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {isVendedor ? 'Mapa de Clientes' : 'Mapa de Lojas'}
              </h1>
              <p className="text-xs text-gray-500">
                {isVendedor 
                  ? `${realtime?.proximos?.length || 0} cliente(s) por perto` 
                  : `${STORES.length} loja(s)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isVendedor && (
              <button
                onClick={() => setShowClients(!showClients)}
                className={`px-3 py-2 rounded-full shadow-lg font-bold text-sm flex items-center gap-1 ${
                  showClients ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'
                }`}
              >
                <Eye size={16} />
                {showClients ? 'Ocultar' : 'Ver'}
              </button>
            )}
            <button onClick={() => setView('home')} className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg font-bold">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div ref={mapRef} className="flex-1 bg-gray-100" />

      {/* Loading */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-[350] pt-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4">Carregando mapa...</p>
          </div>
        </div>
      )}

      {/* Clientes Próximos (vendedor) */}
      {isVendedor && realtime?.proximos?.length > 0 && showClients && mapLoaded && (
        <div className="absolute top-16 left-4 right-4 z-[400]">
          <div className="bg-blue-500/95 backdrop-blur p-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-white" />
              <span className="text-white font-bold">{realtime.proximos.length} clientes por perto</span>
            </div>
          </div>
        </div>
      )}

      {/* Loja Próxima (cliente) */}
      {!isVendedor && closestStore && !selectedStore && mapLoaded && (
        <div className="absolute top-16 left-4 right-4 z-[400]">
          <div className="bg-white p-3 rounded-xl shadow-lg flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-full">
              <Star size={18} className="text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Loja mais próxima</p>
              <p className="text-xs text-gray-500">{closestStore.name}</p>
            </div>
            <button onClick={() => setSelectedStore(closestStore)} className="text-blue-600 font-bold px-3 py-1 bg-blue-50 rounded-lg">
              Ver
            </button>
          </div>
        </div>
      )}

      {/* Botões de controle */}
      <div className={`absolute right-4 z-[400] flex flex-col gap-3 ${selectedStore ? 'bottom-56' : 'bottom-28'}`}>
        <button className="bg-white p-3 rounded-full shadow-lg border" onClick={recenterMap}>
          <Crosshair size={24} />
        </button>
        <button className="bg-white p-3 rounded-full shadow-lg border" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>
        {selectedStore && (
          <button 
            className={`p-3 rounded-full shadow-lg border ${showRoute ? 'bg-blue-600 text-white' : 'bg-white'}`} 
            onClick={showRouteToStore}
          >
            <Route size={24} />
          </button>
        )}
      </div>

      {/* Painel da Loja */}
      {selectedStore && mapLoaded && (
        <div className="absolute bottom-24 left-4 right-4 bg-white p-4 rounded-2xl shadow-2xl z-[400]">
          <button onClick={() => setSelectedStore(null)} className="absolute top-3 right-3 text-gray-400">&times;</button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-xl p-1">
              <img src={selectedStore.logo} alt={selectedStore.name} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{selectedStore.name}</h3>
              <p className="text-xs text-gray-500">{selectedStore.niche}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                  <Star size={12} className="text-yellow-500" />
                  <span className="text-xs font-bold">{selectedStore.rating}</span>
                </div>
                {userLocation && (
                  <span className="text-xs text-gray-500">
                    {calculateDistance(userLocation, { lat: selectedStore.lat, lng: selectedStore.lng }).toFixed(1)} km
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => selectStore(selectedStore)} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
              <StoreIcon size={18} />
              Ver Loja
            </button>
          </div>
        </div>
      )}

      {/* Erro */}
      {errorMsg && mapLoaded && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-xs px-4 py-2 rounded-full z-[500]">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default StoreMapRealtime;