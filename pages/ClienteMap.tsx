// ClienteMap.tsx — MAPA COMPLETO CLIENTE (TODAS LOJAS + ROTA)
// VERSÃO CORRIGIDA: Carrega TODAS as 6 lojas + cálculo de distância correto
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../services/supabaseClient';
import { updateLocation, marcarOffline } from '../services/database';
import { loadGoogleMapsScript } from '../services/googleMaps';
import {
  ArrowLeft, MapPin, Navigation, Store, Star, Phone,
  ChevronRight, Loader2, WifiOff, Search, Filter,
  Maximize2, Minimize2, Navigation2, X, Eye,
  Locate, Minus, Plus, Clock, ArrowRight, Menu
} from 'lucide-react';
import type { Loja } from '../types';

// Cores para mapa claro
const COLORS = {
  ROUTE_BLUE: '#1A73E8',
  CLIENT_BLUE: '#4285F4',
  STORE_RED: '#EA4335',
  OPEN_GREEN: '#34A853',
  CLOSED_GRAY: '#9E9E9E',
  SELECTED_YELLOW: '#FBBC04',
};

// Função para calcular distância - CORRIGIDA
function calculateDistance(p1: { lat: number; lng: number } | null | undefined, p2: { lat: number; lng: number } | null | undefined): number {
  if (!p1 || !p2) return 0;
  if (!isValidCoord(p1.lat) || !isValidCoord(p1.lng) || !isValidCoord(p2.lat) || !isValidCoord(p2.lng)) return 0;
  
  const R = 6371; // Raio da Terra em km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Validação de coordenadas
function isValidCoord(val: number | null | undefined): boolean {
  return typeof val === 'number' && !isNaN(val) && val >= -180 && val <= 180;
}

export const ClienteMap: React.FC = () => {
  const { user, setView, theme, selectStore } = useApp();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clientMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const animationFramesRef = useRef<Map<string, number>>(new Map());
  
  const [minhaLocalizacao, setMinhaLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoja, setSelectedLoja] = useState<Loja | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'abertas'>('todas');
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [panelLoja, setPanelLoja] = useState<Loja | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showListMenu, setShowListMenu] = useState(false);

  const isDark = theme === 'dark';

  // ============ TRAÇAR ROTA (CORRIGIDO) ============
  const traceRoute = useCallback((loja: Loja) => {
    if (!mapInstance.current) {
      setErrorMsg('Mapa não disponível');
      return;
    }
    if (!minhaLocalizacao) {
      setErrorMsg('GPS não disponível');
      return;
    }
    
    // Usar latitude/longitude corretamente
    const lat = loja.latitude || loja.lat;
    const lng = loja.longitude || loja.lng;
    
    if (!isValidCoord(lat) || !isValidCoord(lng)) {
      setErrorMsg('Loja sem localização válida');
      return;
    }

    // Limpar rota anterior
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    // Criar serviço se não existir
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }

    // Criar renderer
    const renderer = new google.maps.DirectionsRenderer({
      map: mapInstance.current,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: COLORS.ROUTE_BLUE,
        strokeOpacity: 0.8,
        strokeWeight: 6,
      },
    });
    directionsRendererRef.current = renderer;

    console.log('🚗 Traçando rota:', minhaLocalizacao, '->', { lat, lng });

    // Solicitar rota
    directionsServiceRef.current.route(
      {
        origin: { lat: minhaLocalizacao.lat, lng: minhaLocalizacao.lng },
        destination: { lat: lat!, lng: lng! },
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        console.log('📍 Resultado rota:', status, result?.routes?.length);
        
        if (status === 'OK' && result?.routes[0]) {
          renderer.setDirections(result);
          const leg = result.routes[0].legs[0];
          setRouteInfo({
            duration: leg.duration?.text || '',
            distance: leg.distance?.text || '',
          });
          
          // Centralizar mapa na rota
          const bounds = new google.maps.LatLngBounds();
          result.routes[0].legs.forEach(l => {
            bounds.extend(l.start_location);
            bounds.extend(l.end_location);
          });
          mapInstance.current?.fitBounds(bounds, { top: 100, right: 40, bottom: 300, left: 40 });
          
          setShowRoutePanel(false);
          setPanelLoja(null);
          
          // Destacar loja no mapa
          const markerKey = loja.id || `loja-${loja.nome}`;
          if (markersRef.current.has(markerKey)) {
            const marker = markersRef.current.get(markerKey);
            if (marker) {
              mapInstance.current?.setCenter({ lat: lat!, lng: lng! });
              mapInstance.current?.setZoom(16);
            }
          }
        } else {
          console.error('Erro ao traçar rota:', status);
          setErrorMsg('Não foi possível traçar rota');
        }
      }
    );
  }, [minhaLocalizacao]);

  // ============ LIMPAR ROTA ============
  const clearRoute = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    setRouteInfo(null);
    if (minhaLocalizacao && mapInstance.current) {
      mapInstance.current.panTo({ lat: minhaLocalizacao.lat, lng: minhaLocalizacao.lng });
      mapInstance.current.setZoom(14);
    }
  }, [minhaLocalizacao]);

  // ============ ABRIR PAINEL DA LOJA ============
  const openStorePanel = useCallback((loja: Loja) => {
    console.log('📋 Abrindo painel:', loja.nome, loja.lat, loja.lng);
    setPanelLoja(loja);
    setShowRoutePanel(true);
    setSelectedLoja(loja);
  }, []);

  // ============ ANIMAÇÃO PULSANTE DOS PINS ============
  const animateMarker = useCallback((marker: google.maps.Marker, isOpen: boolean) => {
    const color = isOpen ? COLORS.OPEN_GREEN : COLORS.CLOSED_GRAY;
    let scale = 12;
    let animationId: number;

    const animate = () => {
      scale = scale === 12 ? 16 : 12;
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: scale,
        fillColor: color,
        fillOpacity: 0.9,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
      });
      animationId = requestAnimationFrame(() => setTimeout(animate, 1000));
    };

    animate();
    animationFramesRef.current.set(marker.toString(), animationId);
  }, []);

  // ============ INICIALIZAÇÃO DO MAPA (CLARO) ============
  useEffect(() => {
    if (!mapRef.current) return;
    let isMounted = true;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript({ libraries: ['places', 'geometry', 'directions'] });

        if (!mapRef.current || !isMounted) return;

        const center = minhaLocalizacao 
          ? { lat: minhaLocalizacao.lat, lng: minhaLocalizacao.lng }
          : { lat: -8.839988, lng: 13.289437 };

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          disableDefaultUI: false,
          zoomControl: true,
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: 'greedy',
          // 🌤️ MAPA CLARO - SEM ESTILOS ESCUROS
          mapTypeId: 'roadmap',
        });

        mapInstance.current = map;
        directionsServiceRef.current = new google.maps.DirectionsService();
        setMapLoaded(true);

        setTimeout(() => google.maps.event.trigger(map, 'resize'), 300);
      } catch (err) {
        console.error('Erro mapa:', err);
        setErrorMsg('Erro ao carregar mapa');
      }
    };

    initMap();

    return () => {
      isMounted = false;
      markersRef.current.forEach(m => m.setMap(null));
      if (clientMarkerRef.current) clientMarkerRef.current.setMap(null);
      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
      // Limpar animações
      animationFramesRef.current.forEach(id => cancelAnimationFrame(id));
    };
  }, []);

  // ============ LOCALIZAÇÃO GPS ============
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('GPS não suportado');
      return;
    }

    setIsOnline(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          const loc = { lat: latitude, lng: longitude };
          setMinhaLocalizacao(loc);
          setIsOnline(true);

          if (user?.id) {
            updateLocation(user.id, latitude, longitude, 'CLIENTE');
          }

          if (mapInstance.current) {
            if (clientMarkerRef.current) {
              clientMarkerRef.current.setPosition(loc);
            } else {
              // Criar marcador do cliente (azul com aura)
              const aura = new google.maps.Marker({
                position: loc,
                map: mapInstance.current,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 24,
                  fillColor: COLORS.CLIENT_BLUE,
                  fillOpacity: 0.15,
                  strokeColor: 'transparent',
                },
                zIndex: 999,
              });

              clientMarkerRef.current = new google.maps.Marker({
                position: loc,
                map: mapInstance.current,
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

              // Centralizar no cliente
              mapInstance.current.panTo(loc);
            }
          }
        }
      },
      (err) => {
        console.error('Erro GPS:', err);
        setErrorMsg('Não foi possível obter localização');
        setIsOnline(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [user?.id]);

  useEffect(() => {
    startTracking();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (user?.id) marcarOffline(user.id);
    };
  }, [startTracking, user?.id]);

  // ============ CARREGAR TODAS AS LOJAS (CORRIGIDO) ============
  const carregarLojas = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📦 Carregando TODAS as lojas...');
      
      // Buscar TODAS as lojas do banco, incluindo as sem coordenadas (para exibir na lista)
      // REMOVIDO: .not('latitude', 'is', null) que limitava a apenas 2 lojas
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .is('deleted_at', null) // Apenas lojas não deletadas
        .order('rating', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar lojas:', error);
        throw error;
      }

      console.log('✅ Lojas carregadas:', data?.length || 0, 'lojas');
      console.log('📍 Detalhes das lojas:');
      (data || []).forEach((loja, idx) => {
        console.log(`   ${idx + 1}. ${loja.nome} - lat:${loja.latitude || loja.lat || 'N/A'}, lng:${loja.longitude || loja.lng || 'N/A'}`);
      });
      
      setLojas(data as Loja[] || []);
    } catch (error) {
      console.error('❌ Erro ao carregar lojas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarLojas();
  }, [carregarLojas]);

  // Realtime para lojas
  useEffect(() => {
    const channel = supabase
      .channel('lojas-cliente-mapa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lojas' }, () => {
        console.log('🔄 Atualização de loja detected');
        carregarLojas();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  },[carregarLojas]);

  // ============ CRIAR/ATUALIZAR MARCADORES COM ANIMAÇÃO (CORRIGIDO) ============
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;

    // Limpar marcadores antigos
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();

    // Filtrar apenas lojas com coordenadas VÁLIDAS
    const lojasComCoordsValidas = lojasFiltradas.filter(loja => {
      const lat = loja.latitude || loja.lat;
      const lng = loja.longitude || loja.lng;
      return isValidCoord(lat) && isValidCoord(lng);
    });

    console.log('📍 Marcadores para', lojasComCoordsValidas.length, 'lojas (de', lojasFiltradas.length, 'total)');

    lojasComCoordsValidas.forEach(loja => {
      const lat = loja.latitude || loja.lat!;
      const lng = loja.longitude || loja.lng!;

      if (!isValidCoord(lat) || !isValidCoord(lng)) {
        console.log('⚠️ Loja sem coords válidos:', loja.nome);
        return;
      }

      const isOpen = loja.is_open;
      const color = isOpen ? COLORS.OPEN_GREEN : COLORS.CLOSED_GRAY;

      // Criar marcador
      const marker = new google.maps.Marker({
        position: { lat: lat!, lng: lng! },
        map: mapInstance.current!,
        title: loja.nome,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        zIndex: isOpen ? 500 : 100,
        animation: google.maps.Animation.DROP,
      });

      // Adicionar animação pulsante para lojas abertas
      if (isOpen) {
        setTimeout(() => animateMarker(marker, isOpen), 2000);
      }

      // Clique no marcador - ABRIR PAINEL
      marker.addListener('click', () => {
        console.log('🖱️ Click em:', loja.nome);
        openStorePanel(loja);
        mapInstance.current?.setZoom(16);
        mapInstance.current?.panTo({ lat: lat!, lng: lng! });
      });

      // Usar id ou uma key única
      const markerKey = loja.id || `loja-${loja.nome}`;
      markersRef.current.set(markerKey, marker);
      console.log('✅ Marcador criado:', loja.nome, '@', lat, lng);
    });

    // Ajustar bounds se houver lojas com coordenadas válidas
    if (lojasComCoordsValidas.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      if (minhaLocalizacao && isValidCoord(minhaLocalizacao.lat) && isValidCoord(minhaLocalizacao.lng)) {
        bounds.extend({ lat: minhaLocalizacao.lat, lng: minhaLocalizacao.lng });
      }
      lojasComCoordsValidas.forEach(l => {
        const lat = l.latitude || l.lat;
        const lng = l.longitude || l.lng;
        if (isValidCoord(lat) && isValidCoord(lng)) {
          bounds.extend({ lat: lat!, lng: lng! });
        }
      });
      mapInstance.current?.fitBounds(bounds, { top: 100, right: 50, bottom: 100, left: 50 });
    }
  }, [lojasFiltradas, mapLoaded, openStorePanel, animateMarker]);

  // ============ UTILITÁRIOS ============
  const handleZoomIn = () => {
    if (mapInstance.current) {
      mapInstance.current.setZoom((mapInstance.current.getZoom() || 14) + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstance.current) {
      mapInstance.current.setZoom((mapInstance.current.getZoom() || 14) - 1);
    }
  };

  const recentrarMapa = () => {
    if (mapInstance.current && minhaLocalizacao) {
      mapInstance.current.panTo({ lat: minhaLocalizacao.lat, lng: minhaLocalizacao.lng });
      mapInstance.current.setZoom(15);
    }
  };

  const toggleFullscreen = () => {
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
  };

  const verProdutos = (loja: Loja) => {
    const storeMapped = {
      id: loja.id,
      userId: loja.user_id,
      name: loja.nome,
      niche: loja.nicho as any,
      rating: Number(loja.rating) || 0,
      reviewCount: loja.review_count || 0,
      lat: loja.lat || -8.839988,
      lng: loja.lng || 13.289437,
      isOpen: loja.is_open ?? true,
      logo: loja.logo || 'https://cdn-icons-png.flaticon.com/512/1048/1048339.png',
      isVerified: loja.is_verified ?? false,
      address: loja.endereco || '',
    };
    selectStore(storeMapped);
    setView('store-detail');
    setShowRoutePanel(false);
    setPanelLoja(null);
  };

  // ============ FILTRAR LOJAS ============
  const lojasFiltradas = useMemo(() => {
    let filtered = lojas;
    if (filtroStatus === 'abertas') {
      filtered = filtered.filter(l => l.is_open);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.nome.toLowerCase().includes(query) ||
        l.nicho?.toLowerCase().includes(query) ||
        l.cidade?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [lojas, filtroStatus, searchQuery]);

  // ============ RENDER ============
  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} font-sans`} ref={containerRef}>
      {/* Header */}
      <div className={`p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-[500]`}>
        <div className="flex items-center gap-3">
          <button onClick={() => {
            clearRoute();
            if (user?.id) marcarOffline(user.id);
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            setView('home');
          }} className="p-2 rounded-full hover:bg-slate-700/50 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Explorar Lojas</h1>
            <p className={`text-xs flex items-center gap-1 ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
              {isOnline ? (
                <>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  GPS Ativo • {lojasFiltradas.length} lojas
                </>
              ) : (
                <>
                  <WifiOff size={12} /> GPS Offline
                </>
              )}
            </p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
            <Filter size={20} />
          </button>
          <button onClick={() => setShowListMenu(!showListMenu)} className={`p-2 rounded-full transition-colors ${showListMenu ? 'bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
            <Menu size={20} />
          </button>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2 p-3 rounded-xl mt-3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <Search size={20} className="text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar lojas..."
            className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'placeholder:text-slate-500 text-white' : ''}`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={`px-4 py-3 ${isDark ? 'bg-slate-800' : 'bg-white'} border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex gap-2">
            <button onClick={() => setFiltroStatus('todas')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filtroStatus === 'todas' ? 'bg-blue-500 text-white' : isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>
              Todas ({lojas.length})
            </button>
            <button onClick={() => setFiltroStatus('abertas')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filtroStatus === 'abertas' ? 'bg-green-500 text-white' : isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>
              Abertas ({lojas.filter(l => l.is_open).length})
            </button>
          </div>
        </div>
      )}

      {/* MAPA CLARO */}
      <div className="relative">
        <div ref={mapRef} className="h-[55vh] w-full" />

        {/* Loading */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Carregando mapa...</p>
            </div>
          </div>
        )}

        {/* Banner de Rota */}
        {routeInfo && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-4 animate-pulse">
            <Navigation2 size={20} />
            <span className="font-bold">{routeInfo.duration}</span>
            <span className="opacity-80">• {routeInfo.distance}</span>
            <button onClick={clearRoute} className="p-1 hover:bg-white/20 rounded-full">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Controles de Zoom */}
        <div className="absolute right-3 bottom-4 z-[400] flex flex-col gap-2">
          <button onClick={handleZoomIn} className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50">
            <Plus size={20} className="text-slate-700" />
          </button>
          <button onClick={handleZoomOut} className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50">
            <Minus size={20} className="text-slate-700" />
          </button>
          <div className="h-px bg-slate-200 my-1" />
          <button onClick={recentrarMapa} className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50">
            <Locate size={20} className="text-blue-500" />
          </button>
          <button onClick={toggleFullscreen} className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50">
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>

        {/* Legenda */}
        <div className="absolute left-3 top-3 z-[400] bg-white/95 rounded-xl shadow-lg p-3 border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Legenda</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.CLIENT_BLUE }} />
            <span className="text-xs text-slate-600">Você</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.OPEN_GREEN }} />
            <span className="text-xs text-slate-600">Aberta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.ROUTE_BLUE }} />
            <span className="text-xs text-slate-600">Rota</span>
          </div>
        </div>
      </div>

      {/* Info de Lojas */}
      <div className="px-4 py-3 bg-white border-b border-slate-200">
        <p className="text-sm text-slate-600">
          {lojasFiltradas.length} lojas • Clique em um pin ou lista para ver detalhes
        </p>
      </div>

      {/* LISTA DE LOJAS */}
      {showListMenu && (
        <div className="mx-4 rounded-2xl overflow-hidden bg-white mt-4 mb-4 shadow-lg">
          {loading && (
            <div className="p-8 text-center">
              <Loader2 size={32} className="animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-400">Carregando...</p>
            </div>
          )}

          {!loading && lojasFiltradas.length === 0 && (
            <div className="p-8 text-center">
              <Store size={40} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">Nenhuma loja encontrada</p>
            </div>
          )}

          <div className="max-h-[40vh] overflow-y-auto">
            {lojasFiltradas
              .sort((a, b) => {
                const latA = a.latitude || a.lat;
                const lngA = a.longitude || a.lng;
                const latB = b.latitude || b.lat;
                const lngB = b.longitude || b.lng;
                if (!minhaLocalizacao || !isValidCoord(latA) || !isValidCoord(lngA)) return 0;
                if (!isValidCoord(latB) || !isValidCoord(lngB)) return 0;
                const distA = calculateDistance(minhaLocalizacao, { lat: latA, lng: lngA });
                const distB = calculateDistance(minhaLocalizacao, { lat: latB, lng: lngB });
                return distA - distB;
              })
              .map((loja) => {
                const isSelected = panelLoja?.id === loja.id;
                const lat = loja.latitude || loja.lat;
                const lng = loja.longitude || loja.lng;
                const distance = minhaLocalizacao && isValidCoord(lat) && isValidCoord(lng) 
                  ? calculateDistance(minhaLocalizacao, { lat: lat!, lng: lng! }).toFixed(1)
                  : null;
                  
                return (
                  <div
                    key={loja.id}
                    onClick={() => openStorePanel(loja)}
                    className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors border-slate-100 hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center border-2"
                        style={{ 
                          backgroundColor: `${loja.is_open ? COLORS.OPEN_GREEN : COLORS.CLOSED_GRAY}15`, 
                          borderColor: loja.is_open ? COLORS.OPEN_GREEN : COLORS.CLOSED_GRAY 
                        }}>
                        <Store size={24} style={{ color: loja.is_open ? COLORS.OPEN_GREEN : COLORS.CLOSED_GRAY }} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base text-slate-800 truncate">{loja.nome}</p>
                          {loja.is_verified && (
                            <span className="text-emerald-500 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded-full">✓</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {loja.nicho} • {loja.cidade || 'Luanda'}
                        </p>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs flex items-center gap-1 text-slate-700">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            {(loja.rating || 0).toFixed(1)}
                          </span>
                          
                          {distance && (
                            <span className="text-xs text-blue-500 font-medium flex items-center gap-1">
                              <MapPin size={12} />
                              {distance} km
                            </span>
                          )}
                          
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            loja.is_open ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {loja.is_open ? 'Aberta' : 'Fechada'}
                          </span>
                        </div>
                      </div>
                      
                      <ChevronRight size={20} className="text-slate-400" />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* PAINEL DE DETALHES DA LOJA - CARD BRANCO */}
      {showRoutePanel && panelLoja && (
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-4 bg-black/50" 
             onClick={() => { setShowRoutePanel(false); setPanelLoja(null); }}>
          <div 
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header com gradiente azul */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Store size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-xl text-white">{panelLoja.nome}</h2>
                    {panelLoja.is_verified && <span className="text-emerald-300 text-lg">✓</span>}
                  </div>
                  <p className="text-white/80 text-sm mt-1">{panelLoja.nicho} • {panelLoja.cidade || 'Luanda'}</p>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <span className="flex items-center gap-1 text-white text-sm bg-white/20 px-2 py-1 rounded-lg">
                      <Star size={14} className="text-yellow-400 fill-yellow-400" />
                      {(panelLoja.rating || 0).toFixed(1)} ({panelLoja.review_count || 0})
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      panelLoja.is_open ? 'bg-emerald-400 text-white' : 'bg-slate-500 text-white'
                    }`}>
                      {panelLoja.is_open ? '🟢 Aberta' : '🔴 Fechada'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowRoutePanel(false); setPanelLoja(null); }}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>

            {/* Info de Distância/Tempo (CORRIGIDO) */}
            {minhaLocalizacao && (
              (() => {
                const lat = panelLoja.latitude || panelLoja.lat;
                const lng = panelLoja.longitude || panelLoja.lng;
                const distance = isValidCoord(lat) && isValidCoord(lng) && minhaLocalizacao
                  ? calculateDistance(minhaLocalizacao, { lat: lat!, lng: lng! })
                  : 0;
                return (
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-blue-500" />
                        <span className="text-sm font-medium text-slate-700">
                          {distance > 0 ? `${distance.toFixed(1)} km de você` : 'Coordenadas indisponíveis'}
                        </span>
                      </div>
                      {panelLoja.telefone && (
                        <a href={`tel:${panelLoja.telefone}`} className="flex items-center gap-2 text-green-600">
                          <Phone size={18} />
                          <span className="text-sm font-medium">Ligar</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()
            )}

            {/* AÇÕES */}
            <div className="p-5 space-y-3">
              {/* BOTÃO PRINCIPAL: TRAÇAR ROTA */}
              <button
                onClick={() => traceRoute(panelLoja)}
                disabled={!minhaLocalizacao}
                className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-98 ${
                  minhaLocalizacao 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Navigation2 size={24} />
                {minhaLocalizacao ? 'Traçar Rota até a Loja' : 'GPS Necessário'}
                <ArrowRight size={20} />
              </button>

              {/* BOTÃO VER PRODUTOS */}
              <button
                onClick={() => verProdutos(panelLoja)}
                className="w-full py-4 rounded-xl font-bold text-base bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-3 transition-all active:scale-98"
              >
                <Eye size={24} />
                Ver Produtos
              </button>

              {/* Descrição */}
              {panelLoja.descricao && (
                <p className="text-sm text-slate-500 text-center mt-2">{panelLoja.descricao}</p>
              )}

              {/* Endereço -ENDERECO COMPLETO */}
              {panelLoja.endereco && (
                <div className="flex items-start gap-3 mt-3 p-3 bg-slate-50 rounded-xl">
                  <MapPin size={18} className="text-slate-400 mt-0.5" />
                  <span className="text-sm text-slate-700">{panelLoja.endereco}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button 
                onClick={() => { setShowRoutePanel(false); setPanelLoja(null); }}
                className="w-full py-3 rounded-xl font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-4 py-2 rounded-full z-[700] shadow-lg animate-pulse">
          ⚠️ {errorMsg}
        </div>
      )}
    </div>
  );
};

export default ClienteMap;