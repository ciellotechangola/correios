// VendedorMap.tsx — MAPA COMPLETO VENDEDOR (CLIENTES PRÓXIMOS + GPS TEMPO REAL)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../services/supabaseClient';
import { updateLocation, getMinhaLoja } from '../services/database';
import { loadGoogleMapsScript } from '../services/googleMaps';
import {
  ArrowLeft, MapPin, User, Package, Navigation, X, Crosshair,
  ChevronRight, Clock, Loader2, Wifi, Phone, Filter, CheckCircle2,
  Target, Map as MapIcon, Truck, Eye, RefreshCw, Menu, Plus, Minus, Maximize2,
  ArrowRight, Store
} from 'lucide-react';

// Cores para mapa claro
const COLORS = {
  ROUTE_BLUE: '#1A73E8',
  CLIENT_BLUE: '#4285F4',
  STORE_RED: '#EA4335',
  DELIVERER_ORANGE: '#FF9500',
  OPEN_GREEN: '#34A853',
  CLOSED_GRAY: '#9E9E9E',
};

// Função para calcular distância
function calculateDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface ClienteProximo {
  id: string;
  nome: string;
  telefone?: string;
  lat: number;
  lng: number;
  isOnline: boolean;
  distancia: number;
  temPedido: boolean;
}

interface PedidoInfo {
  id: string;
  clienteId: string;
  valor: number;
  status: string;
  endereco?: string;
}

export const VendedorMap: React.FC = () => {
  const { user, setView, goBack, theme } = useApp();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const storeMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeUpdateIntervalRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);
  
  const [minhaLocalizacao, setMinhaLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [minhaLoja, setMinhaLoja] = useState<any>(null);
  const [clientesProximos, setClientesProximos] = useState<ClienteProximo[]>([]);
  const [pedidosAtivos, setPedidosAtivos] = useState<PedidoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterDistancia, setFilterDistancia] = useState<10 | 15 | 25>(15);
  const [showFilters, setShowFilters] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPedidos, setShowPedidos] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoInfo | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClienteProximo | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // ============ CARREGAR MINHA LOJA ============
  const carregarMinhaLoja = useCallback(async () => {
    if (!user?.id) return;
    
    const loja = await getMinhaLoja(user.id);
    if (loja) {
      setMinhaLoja(loja);
      console.log('🏪 Minha loja:', loja.nome, '@', loja.lat, loja.lng);
    }
  }, [user?.id]);

  // ============ BUSCAR CLIENTES PRÓXIMOS COM GPS ATIVO ============
  const buscarClientesProximos = useCallback(async () => {
    if (!minhaLoja?.lat || !minhaLoja?.lng) return;

    try {
      // Buscar profiles com localização ativa
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, telefone, lat, lng, is_online')
        .eq('role', 'CLIENTE')
        .eq('is_online', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (profiles) {
        const clientes: ClienteProximo[] = profiles.map(p => {
          const dist = calculateDistance(
            { lat: minhaLoja.lat, lng: minhaLoja.lng },
            { lat: p.lat, lng: p.lng }
          );
          return {
            id: p.id,
            nome: p.nome || 'Cliente',
            telefone: p.telefone,
            lat: p.lat,
            lng: p.lng,
            isOnline: p.is_online,
            distancia: dist,
            temPedido: false,
          };
        }).filter(c => c.distancia <= filterDistancia);

        // Ordenar por distância
        clientes.sort((a, b) => a.distancia - b.distancia);
        
        console.log('👥 Clientes próximos encontrados:', clientes.length);
        setClientesProximos(clientes);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar clientes:', err);
    }
  }, [minhaLoja, filterDistancia]);

  // ============ BUSCAR PEDIDOS ATIVOS ============
  const buscarPedidosAtivos = useCallback(async () => {
    if (!minhaLoja?.id) return;

    try {
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, cliente_id, valor_total, status, endereco_entrega, tipo_entrega')
        .eq('loja_id', minhaLoja.id)
        .in('status', ['PENDENTE', 'PAGO', 'PREPARANDO', 'PRONTO_PARA_RETIRADA', 'EM_ROTA'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (pedidos) {
        const infos: PedidoInfo[] = pedidos.map(p => ({
          id: p.id,
          clienteId: p.cliente_id,
          valor: p.valor_total,
          status: p.status,
          endereco: p.endereco_entrega || p.tipo_entrega === 'RETIRADA' ? 'Retirada na loja' : null,
        }));

        // Marcar clientes com pedidos
        setPedidosAtivos(infos);
        
        const clienteIds = infos.map(p => p.clienteId);
        setClientesProximos(prev => prev.map(c => ({
          ...c,
          temPedido: clienteIds.includes(c.id),
        })));
      }
    } catch (err) {
      console.error('❌ Erro ao buscar pedidos:', err);
    }
  }, [minhaLoja]);

  // ============ TRAÇAR ROTA CLIENTE → LOJA ============
  const traçarRotaClienteLoja = useCallback((cliente: ClienteProximo) => {
    if (!mapInstance.current || !minhaLoja?.lat || !minhaLoja?.lng) {
      setErrorMsg('Mapa ou localização não disponível');
      return;
    }

    // Limpar rota anterior
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }

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

    console.log('🚗 Traçando rota:', { lat: cliente.lat, lng: cliente.lng }, '->', { lat: minhaLoja.lat, lng: minhaLoja.lng });

    directionsServiceRef.current.route(
      {
        origin: { lat: cliente.lat, lng: cliente.lng },
        destination: { lat: minhaLoja.lat, lng: minhaLoja.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result?.routes[0]) {
          renderer.setDirections(result);
          const leg = result.routes[0].legs[0];
          setRouteInfo({
            duration: leg.duration?.text || '',
            distance: leg.distance?.text || '',
          });
          
          // Ajustar bounds
          const bounds = new google.maps.LatLngBounds();
          bounds.extend({ lat: cliente.lat, lng: cliente.lng });
          bounds.extend({ lat: minhaLoja.lat, lng: minhaLoja.lng });
          mapInstance.current?.fitBounds(bounds, { top: 100, right: 40, bottom: 300, left: 40 });
          
          console.log('✅ Rota traçada:', leg.duration?.text, leg.distance?.text);
        } else {
          console.error('❌ Erro ao traçar rota:', status);
          setErrorMsg('Não foi possível traçar rota');
        }
      }
    );
  }, [minhaLoja]);

  // ============ INICIALIZAÇÃO DO MAPA ============
  useEffect(() => {
    if (!mapRef.current) return;
    let isMounted = true;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript({ libraries: ['places', 'geometry', 'directions'] });

        if (!mapRef.current || !isMounted) return;

        const center = minhaLoja?.lat && minhaLoja?.lng
          ? { lat: minhaLoja.lat, lng: minhaLoja.lng }
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
          // 🌤️ MAPA CLARO
          mapTypeId: 'roadmap',
        });

        mapInstance.current = map;
        directionsServiceRef.current = new google.maps.DirectionsService();
        setMapLoaded(true);

        // Adicionar marcador da loja
        if (minhaLoja?.lat && minhaLoja?.lng) {
          storeMarkerRef.current = new google.maps.Marker({
            position: { lat: minhaLoja.lat, lng: minhaLoja.lng },
            map,
            title: minhaLoja.nome,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: COLORS.STORE_RED,
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            },
            zIndex: 1000,
          });
        }

        setTimeout(() => google.maps.event.trigger(map, 'resize'), 300);
      } catch (err) {
        console.error('❌ Erro ao carregar mapa:', err);
        setErrorMsg('Erro ao carregar mapa');
      }
    };

    initMap();

    return () => {
      isMounted = false;
      markersRef.current.forEach(m => m.setMap(null));
      if (storeMarkerRef.current) storeMarkerRef.current.setMap(null);
      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
      if (routeUpdateIntervalRef.current) clearInterval(routeUpdateIntervalRef.current);
    };
  }, []);

  // ============ CARREGAR DADOS ============
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        carregarMinhaLoja(),
        buscarClientesProximos(),
        buscarPedidosAtivos(),
      ]);
      setLoading(false);
    };
    load();
  }, [carregarMinhaLoja, buscarClientesProximos, buscarPedidosAtivos]);

  // ============ GPS DO VENDEDOR ============
  useEffect(() => {
    if (!navigator.geolocation) return;

    setIsOnline(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          const loc = { lat: latitude, lng: longitude };
          setMinhaLocalizacao(loc);
          setIsOnline(true);

          if (user?.id) {
            updateLocation(user.id, latitude, longitude, 'VENDEDOR');
          }
        }
      },
      (err) => {
        console.error('❌ Erro GPS:', err);
        setIsOnline(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [user?.id]);

  // ============ REALTIME ============
  useEffect(() => {
    // Channel para atualizações de clientes
    const channel = supabase
      .channel('vendedor-mapa-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'localizacoes_tempo_real',
      }, () => {
        console.log('🔄 Atualização de localização detectada');
        buscarClientesProximos();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: "role=eq.CLIENTE",
      }, () => {
        console.log('🔄 Atualização de cliente detectada');
        buscarClientesProximos();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
      }, () => {
        console.log('🔄 Atualização de pedido detectada');
        buscarPedidosAtivos();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [buscarClientesProximos, buscarPedidosAtivos]);

  // ============ CRIAR/ATUALIZAR MARCADORES ============
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;

    // Limpar marcadores antigos
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();

    console.log('📍 Criando marcadores para', clientesProximos.length, 'clientes');

    clientesProximos.forEach(cliente => {
      const color = cliente.temPedido ? COLORS.DELIVERER_ORANGE : COLORS.CLIENT_BLUE;
      const scale = cliente.temPedido ? 14 : 10;

      const marker = new google.maps.Marker({
        position: { lat: cliente.lat, lng: cliente.lng },
        map: mapInstance.current!,
        title: cliente.nome,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        zIndex: cliente.temPedido ? 500 : 100,
        animation: cliente.temPedido ? google.maps.Animation.BOUNCE : undefined,
      });

      // Clique para traçar rota
      marker.addListener('click', () => {
        setSelectedClient(cliente);
        setShowRoutePanel(true);
        mapInstance.current?.setZoom(16);
        mapInstance.current?.panTo({ lat: cliente.lat, lng: cliente.lng });
        traçarRotaClienteLoja(cliente);
      });

      markersRef.current.set(cliente.id, marker);
    });

    console.log('✅ Marcadores criados:', markersRef.current.size);
  }, [clientesProximos, mapLoaded, traçarRotaClienteLoja]);

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
    if (mapInstance.current && minhaLoja?.lat) {
      mapInstance.current.panTo({ lat: minhaLoja.lat, lng: minhaLoja.lng });
      mapInstance.current.setZoom(filterDistancia >= 20 ? 12 : 14);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()?.then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen()?.then(() => setIsFullscreen(false));
    }
  };

  const limparRota = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    setRouteInfo(null);
    setShowRoutePanel(false);
    setSelectedClient(null);
  };

  const abrirPedido = (pedido: PedidoInfo) => {
    setPedidoSelecionado(pedido);
    const cliente = clientesProximos.find(c => c.id === pedido.clienteId);
    if (cliente) {
      traçarRotaClienteLoja(cliente);
    }
  };

  // ============ RENDER ============
  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} font-sans`} ref={containerRef}>
      {/* Header */}
      <div className={`p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-[500]`}>
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-full hover:bg-slate-700/50 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Clientes Próximos</h1>
            <p className={`text-xs flex items-center gap-1 ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
              {isOnline ? (
                <>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  GPS Ativo • {clientesProximos.length} clientes
                </>
              ) : (
                <>
                  <Wifi size={12} /> GPS Offline
                </>
              )}
            </p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-blue-500 text-white' : 'bg-slate-700'}`}>
            <Filter size={20} />
          </button>
          <button onClick={() => setShowPedidos(!showPedidos)} className={`p-2 rounded-full transition-colors ${showPedidos ? 'bg-orange-500 text-white' : 'bg-slate-700'}`}>
            <Package size={20} />
          </button>
        </div>

        {/* Minha loja info */}
        {minhaLoja && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-slate-700/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <Store size={16} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium">{minhaLoja.nome}</p>
              <p className="text-xs text-slate-400">Sua loja • {pedidosAtivos.length} pedidos</p>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className={`px-4 py-3 ${isDark ? 'bg-slate-800' : 'bg-white'} border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <p className="text-xs text-slate-400 mb-2">Raio de busca:</p>
          <div className="flex gap-2">
            {[10, 15, 25].map(km => (
              <button
                key={km}
                onClick={() => setFilterDistancia(km as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterDistancia === km ? 'bg-blue-500 text-white' : isDark ? 'bg-slate-700' : 'bg-slate-100'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAPA */}
      <div className="relative">
        <div ref={mapRef} className="h-[55vh] w-full" />

        {/* Loading */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <div className="text-center">
              <Loader2 size={40} className="animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-slate-500">Carregando mapa...</p>
            </div>
          </div>
        )}

        {/* Banner de Rota */}
        {routeInfo && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-4 animate-pulse">
            <Navigation size={20} />
            <span className="font-bold">{routeInfo.duration}</span>
            <span className="opacity-80">• {routeInfo.distance}</span>
            <button onClick={limparRota} className="p-1 hover:bg-white/20 rounded-full">
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
            <Crosshair size={20} className="text-blue-500" />
          </button>
          <button onClick={toggleFullscreen} className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50">
            <Maximize2 size={20} />
          </button>
        </div>

        {/* Legenda */}
        <div className="absolute left-3 top-3 z-[400] bg-white/95 rounded-xl shadow-lg p-3 border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Legenda</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.STORE_RED }} />
            <span className="text-xs text-slate-600">Sua Loja</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.CLIENT_BLUE }} />
            <span className="text-xs text-slate-600">Cliente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.DELIVERER_ORANGE }} />
            <span className="text-xs text-slate-600">Com Pedido</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={`px-4 py-3 ${isDark ? 'bg-slate-800' : 'bg-white'} border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <p className="text-sm text-slate-500">
          {clientesProximos.length} clientes próximos • Clique para ver detalhes
        </p>
      </div>

      {/* Lista de Clientes */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-slate-400">Carregando clientes...</p>
          </div>
        ) : clientesProximos.length === 0 ? (
          <div className="text-center py-8">
            <User size={48} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-400">Nenhum cliente próximo encontrado</p>
          </div>
        ) : (
          clientesProximos.map(cliente => {
            const pedido = pedidosAtivos.find(p => p.clienteId === cliente.id);
            
            return (
              <div
                key={cliente.id}
                onClick={() => {
                  setSelectedClient(cliente);
                  setShowRoutePanel(true);
                  traçarRotaClienteLoja(cliente);
                }}
                className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-lg border ${isDark ? 'border-slate-700' : 'border-slate-100'} cursor-pointer hover:border-blue-500 transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: cliente.temPedido ? `${COLORS.DELIVERER_ORANGE}20` : `${COLORS.CLIENT_BLUE}20`,
                    }}>
                    <User size={24} style={{ color: cliente.temPedido ? COLORS.DELIVERER_ORANGE : COLORS.CLIENT_BLUE }} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{cliente.nome}</p>
                      {cliente.temPedido && (
                        <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">
                          🛒 Pedido
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-blue-500 font-medium flex items-center gap-1">
                        <MapPin size={12} />
                        {cliente.distancia.toFixed(1)} km
                      </span>
                      <span className={`text-xs ${cliente.isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {cliente.isOnline ? '🟢 Online' : '⚫ Offline'}
                      </span>
                    </div>
                  </div>
                  
                  {pedido && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-500">
                        {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(pedido.valor)}
                      </p>
                      <p className="text-xs text-slate-400">{pedido.status}</p>
                    </div>
                  )}
                  
                  <ChevronRight size={20} className="text-slate-400" />
                </div>

                {/* Info do pedido */}
                {pedido && (
                  <div className="mt-3 p-3 bg-slate-700/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">Pedido #{pedido.id.slice(0, 8)}</p>
                        <p className="text-sm font-medium">{pedido.endereco || 'Retirada na loja'}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirPedido(pedido);
                        }}
                        className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg"
                      >
                        Ver Rota
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Painel de Cliente */}
      {showRoutePanel && selectedClient && (
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-4 bg-black/50"
             onClick={() => { setShowRoutePanel(false); setSelectedClient(null); }}>
          <div
            className={`w-full max-w-lg ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl`}
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <User size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-xl text-white">{selectedClient.nome}</h2>
                  </div>
                  <p className="text-white/80 text-sm mt-1">
                    {selectedClient.isOnline ? '🟢 Online' : '⚫ Offline'}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-white text-sm bg-white/20 px-2 py-1 rounded-lg">
                      {selectedClient.distancia.toFixed(1)} km
                    </span>
                    {selectedClient.temPedido && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-400 text-white">
                        🛒 Tem pedido
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setShowRoutePanel(false); setSelectedClient(null); }}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/30"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>

            {/* Info de Localização */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <MapPin size={18} className="text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Coordenadas</p>
                  <p className="text-xs text-slate-500">
                    {selectedClient.lat.toFixed(6)}, {selectedClient.lng.toFixed(6)}
                  </p>
                </div>
              </div>
              {selectedClient.telefone && (
                <div className="mt-3">
                  <a href={`tel:${selectedClient.telefone}`} className="flex items-center gap-2 text-green-600">
                    <Phone size={18} />
                    <span className="text-sm font-medium">{selectedClient.telefone}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="p-5 space-y-3">
              <button
                onClick={() => traçarRotaClienteLoja(selectedClient)}
                className="w-full py-4 rounded-xl font-bold text-base bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex items-center justify-center gap-3"
              >
                <Navigation size={24} />
                Traçar Rota até Cliente
                <ArrowRight size={20} />
              </button>

              {selectedClient.temPedido && (
                <button
                  onClick={() => {
                    const pedido = pedidosAtivos.find(p => p.clienteId === selectedClient.id);
                    if (pedido) abrirPedido(pedido);
                  }}
                  className="w-full py-4 rounded-xl font-bold text-base bg-orange-500 text-white hover:bg-orange-600 flex items-center justify-center gap-3"
                >
                  <Package size={24} />
                  Ver Pedido
                </button>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => { setShowRoutePanel(false); setSelectedClient(null); }}
                className={`w-full py-3 rounded-xl font-medium ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel de Pedidos */}
      {showPedidos && (
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-4 bg-black/50"
             onClick={() => setShowPedidos(false)}>
          <div
            className={`w-full max-w-lg ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[80vh]`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Pedidos Ativos</h2>
                <button onClick={() => setShowPedidos(false)} className="p-2 bg-slate-700 rounded-full">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              {pedidosAtivos.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={48} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-400">Nenhum pedido ativo</p>
                </div>
              ) : (
                pedidosAtivos.map(pedido => {
                  const cliente = clientesProximos.find(c => c.id === pedido.clienteId);
                  
                  return (
                    <div
                      key={pedido.id}
                      onClick={() => {
                        if (cliente) {
                          setShowPedidos(false);
                          abrirPedido(pedido);
                        }
                      }}
                      className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">#{pedido.id.slice(0, 8)}</p>
                          <p className="text-xs text-slate-400">{pedido.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-500">
                            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(pedido.valor)}
                          </p>
                          {cliente && (
                            <p className="text-xs text-blue-500">{cliente.distancia.toFixed(1)} km</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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

export default VendedorMap;