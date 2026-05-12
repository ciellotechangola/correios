/**
 * RealTimeMap Component
 * Mapa do Google Maps real com suporte a:
 * - Markers animados por perfil (cliente, vendedor, loja, entregador)
 * - Real-time tracking via Supabase
 * - Marker clustering
 * - Routes/Directions
 * - Performance otimizada
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { loadGoogleMapsScript, calculateDistance } from '../services/googleMaps';
import {
  EntityType,
  TrackingEntity,
  subscribeToLocations,
  subscribeToOrderLocations,
  updateLocation,
  lerp,
  calculateBearing,
} from '../services/realtimeTracking';
import {
  ArrowLeft,
  Crosshair,
  MapPin,
  Navigation,
  Store,
  User,
  Package,
  X,
  Layers,
  Filter,
  Target,
} from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface RealTimeMapProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  mode: 'client' | 'vendor' | 'delivery';
  pedidoId?: string;
  onEntitySelect?: (entity: TrackingEntity) => void;
  onRouteUpdate?: (route: google.maps.DirectionsResult | null) => void;
}

interface MarkerData {
  entity: TrackingEntity;
  marker: google.maps.Marker;
  infoWindow: google.maps.InfoWindow;
  currentPosition: google.maps.LatLngLiteral;
  targetPosition: google.maps.LatLngLiteral;
  animationFrame?: number;
}

interface ClusterGroup {
  center: { lat: number; lng: number };
  entities: TrackingEntity[];
  clusterMarker?: google.maps.Marker;
}

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const DEFAULT_CENTER = { lat: -8.8390, lng: 13.2894 }; // Luanda
const DEFAULT_ZOOM = 14;

// Cores por perfil (conforme especificação)
const COLORS: Record<EntityType, string> = {
  cliente: '#007AFF',  // Azul iOS
  vendedor: '#34C759', // Verde
  loja: '#FF3B30',     // Vermelho
  entregador: '#FF9500', // Laranja
};

// Clustering config
const CLUSTER_DISTANCE_KM = 0.3; // Agrupar markers a < 300m

// Debounce para updates
const LOCATION_UPDATE_INTERVAL = 5000; // 5 segundos

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export const RealTimeMap: React.FC<RealTimeMapProps> = ({
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  mode,
  pedidoId,
  onEntitySelect,
  onRouteUpdate,
}) => {
  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerData>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // App context
  const { user, setView, goBack, stores, selectedOrder } = useApp();

  // Estado
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [entities, setEntities] = useState<TrackingEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<TrackingEntity | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<EntityType[]>(['cliente', 'vendedor', 'loja', 'entregador']);
  const [isTracking, setIsTracking] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // ==========================================
  // INICIALIZAÇÃO DO MAPA
  // ==========================================

  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript({
          libraries: ['places', 'geometry', 'directions', 'drawing'],
        });

        if (!isMounted || !mapRef.current) return;

        // Criar mapa
        const map = new google.maps.Map(mapRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: true,
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: MAP_STYLES,
        });

        mapInstance.current = map;
        setIsLoaded(true);

        // Inicializar directions
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#007AFF',
            strokeOpacity: 0.8,
            strokeWeight: 5,
          },
        });

        // Obter localização do usuário
        getUserPosition();

      } catch (error) {
        console.error('Erro ao carregar Google Maps:', error);
        setErrorMsg('Erro ao carregar mapa. Verifique sua conexão.');
      }
    };

    initMap();

    return () => {
      isMounted = false;
      stopUserTracking();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      // Limpar markers
      markersRef.current.forEach(data => {
        if (data.animationFrame) {
          cancelAnimationFrame(data.animationFrame);
        }
        data.marker.setMap(null);
        data.infoWindow.close();
      });
      markersRef.current.clear();
    };
  }, []);

  // ==========================================
  // LOCALIZAÇÃO DO USUÁRIO
  // ==========================================

  const getUserPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocalização não suportada.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (isValidCoordinates(latitude, longitude)) {
          const loc = { lat: latitude, lng: longitude };
          setUserLocation(loc);
          updateUserMarker(loc);
          if (mapInstance.current) {
            mapInstance.current.panTo(loc);
          }
          // Iniciar tracking contínuo
          startUserTracking();
        }
      },
      (error) => {
        console.warn('Erro GPS:', error);
        setErrorMsg('GPS indisponível. Usando localização padrão.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const startUserTracking = useCallback(() => {
    if (!navigator.geolocation || !user) return;

    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (!isValidCoordinates(latitude, longitude)) return;

        const loc = { lat: latitude, lng: longitude };
        setUserLocation(loc);
        updateUserMarker(loc);

        // Enviar para Supabase com debounce
        const now = Date.now();
        if (now - lastUpdateRef.current > LOCATION_UPDATE_INTERVAL) {
          lastUpdateRef.current = now;
          await updateLocation(
            user.id,
            latitude,
            longitude,
            getEntityType(user.role),
            pedidoId
          );
        }
      },
      (error) => {
        console.warn('Erro tracking:', error);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
  }, [user, pedidoId]);

  const stopUserTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const updateUserMarker = useCallback((loc: { lat: number; lng: number }) => {
    if (!mapInstance.current) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(loc);
    } else {
      userMarkerRef.current = new google.maps.Marker({
        position: loc,
        map: mapInstance.current,
        title: 'Você',
        icon: createUserMarkerIcon(),
        zIndex: 1000,
      });
    }
  }, []);

  // ==========================================
  // SUBSCRIÇÕES REALTIME
  // ==========================================

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Determinar quais perfis subscrever baseado no modo
    const perfisToSubscribe = getPerfisForMode(mode);

    // Subscrever atualizações
    unsubscribeRef.current = subscribeToLocations(
      { perfis: perfisToSubscribe },
      (newEntities) => {
        setEntities(newEntities);
      }
    );

    // Se há pedido ativo, subscrever também as localizações do pedido
    if (pedidoId) {
      const unsubscribeOrder = subscribeToOrderLocations(pedidoId, (orderEntities) => {
        mergeEntities(orderEntities);
      });

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
        unsubscribeOrder();
      };
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isLoaded, user, mode, pedidoId]);

  // ==========================================
  // ATUALIZAÇÃO DE ENTITIES/MARKERS
  // ==========================================

  useEffect(() => {
    if (!mapInstance.current || !isLoaded) return;

    // Filtrar por filtros ativos
    const filteredEntities = entities.filter(e => activeFilters.includes(e.perfil));

    // Aplicar clustering e atualizar markers
    updateMarkersWithClustering(filteredEntities);

  }, [entities, activeFilters, isLoaded]);

  const updateMarkersWithClustering = useCallback((filteredEntities: TrackingEntity[]) => {
    const map = mapInstance.current;
    if (!map) return;

    // Agrupar entities em clusters
    const clusters: ClusterGroup[] = [];
    const singleEntities: TrackingEntity[] = [];

    filteredEntities.forEach(entity => {
      let addedToCluster = false;

      for (const cluster of clusters) {
        const dist = calculateDistance(
          { lat: entity.lat, lng: entity.lng },
          cluster.center
        );

        if (dist < CLUSTER_DISTANCE_KM) {
          cluster.entities.push(entity);
          // Recalcular centro do cluster
          const totalLat = cluster.entities.reduce((sum, e) => sum + e.lat, 0);
          const totalLng = cluster.entities.reduce((sum, e) => sum + e.lng, 0);
          cluster.center = {
            lat: totalLat / cluster.entities.length,
            lng: totalLng / cluster.entities.length,
          };
          addedToCluster = true;
          break;
        }
      }

      if (!addedToCluster) {
        clusters.push({
          center: { lat: entity.lat, lng: entity.lng },
          entities: [entity],
        });
      }
    });

    // Separar clusters com 1 entity (single) dos outros
    clusters.forEach(cluster => {
      if (cluster.entities.length === 1) {
        singleEntities.push(cluster.entities[0]);
      }
    });

    // Remover clusters de 1 entity
    const multiClusters = clusters.filter(c => c.entities.length > 1);

    // Atualizar markers individuais
    updateSingleMarkers(singleEntities);

    // Atualizar clusters
    updateClusterMarkers(multiClusters);

  }, []);

  const updateSingleMarkers = useCallback((newEntities: TrackingEntity[]) => {
    const map = mapInstance.current;
    if (!map) return;

    const processedIds = new Set<string>();

    newEntities.forEach(entity => {
      processedIds.add(entity.userId);

      const existing = markersRef.current.get(entity.userId);

      if (existing) {
        // Animar para nova posição
        animateMarkerToPosition(existing, { lat: entity.lat, lng: entity.lng });
        // Atualizar dados
        existing.entity = entity;
      } else {
        // Criar novo marker
        const markerData = createMarker(entity, map);
        markersRef.current.set(entity.userId, markerData);
      }
    });

    // Remover markers que não existem mais
    markersRef.current.forEach((data, id) => {
      if (!processedIds.has(id)) {
        if (data.animationFrame) {
          cancelAnimationFrame(data.animationFrame);
        }
        data.marker.setMap(null);
        data.infoWindow.close();
        markersRef.current.delete(id);
      }
    });
  }, []);

  const updateClusterMarkers = useCallback((clusters: ClusterGroup[]) => {
    // Implementação simplificada: mostr só o primeiro elemento de cada cluster
    // Em produção, usar library de clustering como markerclusterer
    clusters.forEach(cluster => {
      // Criar marker de cluster (apenas visual)
      const marker = new google.maps.Marker({
        position: cluster.center,
        map: mapInstance.current,
        title: `${cluster.entities.length} locais`,
        icon: createClusterIcon(cluster.entities.length),
        zIndex: 100,
      });

      marker.addListener('click', () => {
        // Zoom in para ver markers individuais
        mapInstance.current?.setZoom(16);
        mapInstance.current?.panTo(cluster.center);
      });
    });
  }, []);

  // ==========================================
  // ANIMAÇÃO DE MARKERS
  // ==========================================

  const animateMarkerToPosition = (markerData: MarkerData, target: { lat: number; lng: number }) => {
    markerData.targetPosition = target;

    if (markerData.animationFrame) {
      cancelAnimationFrame(markerData.animationFrame);
    }

    const animate = () => {
      const current = markerData.currentPosition;
      const target = markerData.targetPosition;

      // Calcular distância
      const dist = calculateDistance(current, target) * 1000; // em metros

      if (dist < 1) {
        markerData.currentPosition = target;
        markerData.marker.setPosition(target);
        return;
      }

      // Interpolação suave (lerp)
      const speed = 0.15; // Velocidade da interpolação
      const newPos = lerp(current, target, speed);

      markerData.currentPosition = newPos;
      markerData.marker.setPosition(newPos);

      // Calcular rotação baseada na direção
      const bearing = calculateBearing(current, target);
      // Aplicar rotação ao ícone (se suportado)

      markerData.animationFrame = requestAnimationFrame(animate);
    };

    animate();
  };

  // ==========================================
  // CRIAÇÃO DE MARKERS
  // ==========================================

  const createMarker = (entity: TrackingEntity, map: google.maps.Map): MarkerData => {
    const marker = new google.maps.Marker({
      position: { lat: entity.lat, lng: entity.lng },
      map,
      title: entity.nome,
      icon: createMarkerIcon(entity.perfil, entity.isOnline),
      animation: google.maps.Animation.DROP,
      zIndex: entity.perfil === 'loja' ? 500 : 100,
    });

    const infoWindow = createInfoWindow(entity);

    marker.addListener('click', () => {
      setSelectedEntity(entity);
      infoWindow.open(map, marker);
      onEntitySelect?.(entity);
    });

    return {
      entity,
      marker,
      infoWindow,
      currentPosition: { lat: entity.lat, lng: entity.lng },
      targetPosition: { lat: entity.lat, lng: entity.lng },
    };
  };

  const createInfoWindow = (entity: TrackingEntity): google.maps.InfoWindow => {
    const color = COLORS[entity.perfil];
    const distance = entity.metadata?.distance
      ? `${entity.metadata.distance.toFixed(1)} km`
      : 'Distância desconhecida';

    const content = `
      <div style="
        padding: 12px;
        min-width: 200px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        ">
          <div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${color};
          "></div>
          <span style="font-weight: bold; font-size: 14px;">${entity.nome}</span>
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
          ${entity.perfil.charAt(0).toUpperCase() + entity.perfil.slice(1)}
        </div>
        <div style="font-size: 12px; color: #999;">
          ${distance}
        </div>
        ${entity.pedidoId ? `<div style="font-size: 11px; color: #007AFF; margin-top: 4px;">Pedido ativo</div>` : ''}
      </div>
    `;

    return new google.maps.InfoWindow({ content });
  };

  // ==========================================
  // ROTAS / DIRECTIONS
  // ==========================================

  const showRoute = useCallback((origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) return;

    directionsServiceRef.current.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRendererRef.current?.setDirections(result);

          const leg = result.routes[0].legs[0];
          setRouteInfo({
            duration: leg.duration?.text || '',
            distance: leg.distance?.text || '',
          });

          onRouteUpdate?.(result);

          // Ajustar bounds para mostrar rota completa
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(origin);
          bounds.extend(destination);
          mapInstance.current?.fitBounds(bounds, { top: 100, right: 50, bottom: 100, left: 50 });
        }
      }
    );
  }, [onRouteUpdate]);

  // Mostrar rota se houver entidade selecionada com userLocation
  useEffect(() => {
    if (userLocation && selectedEntity && mapInstance.current) {
      showRoute(userLocation, { lat: selectedEntity.lat, lng: selectedEntity.lng });
    }
  }, [userLocation, selectedEntity, showRoute]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleRecenter = () => {
    if (mapInstance.current && userLocation) {
      mapInstance.current.panTo(userLocation);
      mapInstance.current.setZoom(16);
    }
  };

  const toggleFilter = (perfil: EntityType) => {
    setActiveFilters(prev =>
      prev.includes(perfil)
        ? prev.filter(p => p !== perfil)
        : [...prev, perfil]
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col font-['Inter']">
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
            <h1 className="text-lg font-bold text-gray-800">
              {mode === 'client' && 'Lojas Próximas'}
              {mode === 'vendor' && 'Clientes Próximos'}
              {mode === 'delivery' && 'Rastreamento'}
            </h1>
            <p className="text-xs text-gray-500">
              {entities.length} {entities.length === 1 ? 'localização' : 'localizações'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-full shadow-lg border transition-all ${
              showFilters ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            <Filter size={20} />
          </button>
          <button
            onClick={handleRecenter}
            className="bg-white text-gray-700 p-2 rounded-full shadow-lg border border-gray-200 active:scale-95 transition-transform hover:bg-gray-50"
          >
            <Crosshair size={20} />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="flex-1 w-full h-full bg-gray-100" />

      {/* Loading */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-[350]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600 font-medium mt-4">Carregando mapa...</p>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute top-20 right-4 z-[400] bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">Filtrar por tipo</p>
            {(['cliente', 'vendedor', 'loja', 'entregador'] as EntityType[]).map((perfil) => (
              <button
                key={perfil}
                onClick={() => toggleFilter(perfil)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all ${
                  activeFilters.includes(perfil)
                    ? 'bg-gray-100'
                    : 'opacity-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[perfil] }}
                />
                <span className="text-sm capitalize">{perfil}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Route Info */}
      {routeInfo && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[400] bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 px-4 py-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Navigation size={16} className="text-blue-500" />
              <span className="text-sm font-semibold">{routeInfo.duration}</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <span className="text-sm text-gray-600">{routeInfo.distance}</span>
          </div>
        </div>
      )}

      {/* Selected Entity Panel */}
      {selectedEntity && (
        <div className="absolute bottom-24 left-4 right-4 bg-white/95 backdrop-blur border border-gray-200 p-4 rounded-2xl shadow-2xl z-[400]">
          <button
            onClick={() => {
              setSelectedEntity(null);
              directionsRendererRef.current?.setDirections({ routes: [], request: { origin: null as any, destination: null as any, travelMode: google.maps.TravelMode.DRIVING } });
              setRouteInfo(null);
            }}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${COLORS[selectedEntity.perfil]}20` }}
            >
              {selectedEntity.perfil === 'loja' && <Store size={24} style={{ color: COLORS[selectedEntity.perfil] }} />}
              {selectedEntity.perfil === 'cliente' && <User size={24} style={{ color: COLORS[selectedEntity.perfil] }} />}
              {selectedEntity.perfil === 'vendedor' && <Package size={24} style={{ color: COLORS[selectedEntity.perfil] }} />}
              {selectedEntity.perfil === 'entregador' && <Navigation size={24} style={{ color: COLORS[selectedEntity.perfil] }} />}
            </div>
            <div className="flex-1">
              <h3 className="text-gray-800 font-bold">{selectedEntity.nome}</h3>
              <p className="text-sm text-gray-500 capitalize">{selectedEntity.perfil}</p>
            </div>
          </div>

          {userLocation && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={16} className="text-gray-400" />
              <span>
                {calculateDistance(userLocation, { lat: selectedEntity.lat, lng: selectedEntity.lng }).toFixed(1)} km de distância
              </span>
            </div>
          )}

          <button
            onClick={() => onEntitySelect?.(selectedEntity)}
            className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform hover:bg-blue-700"
          >
            {mode === 'client' && 'Ver Produtos'}
            {mode === 'vendor' && 'Ver Detalhes'}
            {mode === 'delivery' && 'Atualizar Status'}
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 backdrop-blur text-white text-xs px-4 py-2 rounded-full z-[500] whitespace-nowrap shadow-lg max-w-[90%] text-center animate-in fade-in">
          {errorMsg}
        </div>
      )}

      {/* Tracking Status */}
      {isTracking && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-lg z-[400] flex items-center gap-2 border border-gray-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-gray-700">Tempo real</span>
        </div>
      )}
    </div>
  );
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getPerfisForMode(mode: 'client' | 'vendor' | 'delivery'): EntityType[] {
  switch (mode) {
    case 'client':
      return ['vendedor', 'loja'];
    case 'vendor':
      return ['cliente', 'entregador'];
    case 'delivery':
      return ['cliente', 'vendedor', 'entregador'];
    default:
      return ['cliente', 'vendedor', 'loja'];
  }
}

function getEntityType(role: string): EntityType {
  const mapping: Record<string, EntityType> = {
    'CLIENTE': 'cliente',
    'VENDEDOR': 'vendedor',
    'ENTREGADOR': 'entregador',
    'ADMIN_MASTER': 'vendedor', // Admin também pode ser vendedor
  };
  return mapping[role] || 'cliente';
}

function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function mergeEntities(newEntities: TrackingEntity[]) {
  // Função para mergear entidades - implementação simplificada
  // Em produção, use state updater function
}

// ==========================================
// MARKER ICONS
// ==========================================

function createMarkerIcon(perfil: EntityType, isOnline: boolean): google.maps.Icon {
  const color = COLORS[perfil];
  const opacity = isOnline ? 1 : 0.5;

  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 12,
    fillColor: color,
    fillOpacity: opacity,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  };
}

function createUserMarkerIcon(): google.maps.Icon {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: '#007AFF',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
  };
}

function createClusterIcon(count: number): google.maps.Icon {
  const size = 15 + Math.min(count * 3, 20);
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: size,
    fillColor: '#666',
    fillOpacity: 0.9,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  };
}

// ==========================================
// MAP STYLES (Google Maps)
// ==========================================

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];

export default RealTimeMap;
