// OrderTrackingMap.tsx — TRACKING COMPLETO COM ENTREGADOR EM TEMPO REAL
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { getPedidoPorId, getEntregaPorPedido, updateLocation } from '../services/database';
import { supabase } from '../services/supabaseClient';
import { loadGoogleMapsScript } from '../services/googleMaps';
import {
  ArrowLeft, MapPin, Navigation, Store, Package, Clock, CheckCircle,
  X, Loader2, Phone, Locate, Minus, Plus, Car, RefreshCw, AlertCircle, User,
  Maximize2
} from 'lucide-react';
import type { OrderStatus } from '../types';

// Cores profissionais para mapa claro
const COLORS = {
  CLIENT: '#4285F4',       // Azul cliente
  STORE: '#EA4335',         // Vermelho loja
  ROUTE: '#1A73E8',        // Azul rota
  DELIVERER: '#FF9500',     // Laranja entregador
  SUCCESS: '#34A853',      // Verde sucesso
  WARNING: '#FBBC04',       // Amarelo warning
};

interface TrackingState {
  pedidoId: string;
  status: OrderStatus;
  lojaNome: string;
  lojaLat: number | null;
  lojaLng: number | null;
  clienteLat: number | null;
  clienteLng: number | null;
  tipoEntrega: 'RETIRADA' | 'ENTREGA';
  // ✅ Dados do entregador
  entregadorId: string | null;
  entregadorNome: string | null;
  entregadorTelefone: string | null;
  entregadorLat: number | null;
  entregadorLng: number | null;
  entregaId: string | null;
  entregaStatus: string | null;
}

export const OrderTrackingMap: React.FC<{ pedidoId: string; onBack: () => void }> = ({ pedidoId, onBack }) => {
  const { user, theme } = useApp();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const clientMarkerRef = useRef<google.maps.Marker | null>(null);
  const storeMarkerRef = useRef<google.maps.Marker | null>(null);
  const delivererMarkerRef = useRef<google.maps.Marker | null>(null);
  const delivererAuraRef = useRef<google.maps.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeUpdateIntervalRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingState, setTrackingState] = useState<TrackingState | null>(null);
  const [minhaLocalizacao, setMinhaLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pedidoStatus, setPedidoStatus] = useState<OrderStatus | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // ============ STATUS CONFIG ============
  const getStatusConfig = (status: OrderStatus | null) => {
    const configs: Record<string, { color: string; bgColor: string; text: string; icon: any }> = {
      'PENDENTE': { color: COLORS.WARNING, bgColor: 'bg-yellow-100', text: 'Pendente', icon: <Clock size={16} /> },
      'PAGO': { color: COLORS.CLIENT, bgColor: 'bg-blue-100', text: 'Pago - Preparando', icon: <Package size={16} /> },
      'PREPARANDO': { color: COLORS.CLIENT, bgColor: 'bg-blue-100', text: 'Preparando pedido', icon: <Package size={16} /> },
      'PRONTO_PARA_RETIRADA': { color: COLORS.SUCCESS, bgColor: 'bg-green-100', text: 'Pronto para retirada', icon: <CheckCircle size={16} /> },
      'EM_ROTA': { color: COLORS.DELIVERER, bgColor: 'bg-orange-100', text: 'Em rota', icon: <Car size={16} /> },
      'ENTREGUE': { color: COLORS.SUCCESS, bgColor: 'bg-green-100', text: 'Entregue', icon: <CheckCircle size={16} /> },
      'CANCELADO': { color: '#DC2626', bgColor: 'bg-red-100', text: 'Cancelado', icon: <X size={16} /> },
    };
    return configs[status || 'PENDENTE'] || configs['PENDENTE'];
  };

  // ============ CARREGAR DADOS DO PEDIDO E ENTREGA ============
  const carregarPedido = useCallback(async () => {
    try {
      const pedido = await getPedidoPorId(pedidoId);
      
      if (!pedido) {
        setError('Pedido não encontrado');
        return;
      }

      // Buscar dados da loja
      let lojaData: any = null;
      if (pedido.loja_id) {
        const { data } = await supabase
          .from('lojas')
          .select('*')
          .eq('id', pedido.loja_id)
          .maybeSingle();
        lojaData = data;
      }

      // ✅ Buscar dados da entrega
      let entregaData: any = null;
      let entregadorInfo: any = null;

      if (pedido.tipo_entrega === 'ENTREGA') {
        entregaData = await getEntregaPorPedido(pedidoId);

        if (entregaData?.entregador_id) {
          // Buscar info do entregador
          const { data: perfilEntregador } = await supabase
            .from('profiles')
            .select('nome, telefone, lat, lng')
            .eq('id', entregaData.entregador_id)
            .maybeSingle();
          entregadorInfo = perfilEntregador;
        }
      }

      const newState: TrackingState = {
        pedidoId: pedido.id,
        status: pedido.status as OrderStatus,
        lojaNome: lojaData?.nome || 'Loja',
        lojaLat: lojaData?.latitude || lojaData?.lat || null,
        lojaLng: lojaData?.longitude || lojaData?.lng || null,
        clienteLat: pedido.cliente_lat || null,
        clienteLng: pedido.cliente_lng || null,
        tipoEntrega: pedido.tipo_entrega,
        entregadorId: entregaData?.entregador_id || null,
        entregadorNome: entregadorInfo?.nome || null,
        entregadorTelefone: entregadorInfo?.telefone || null,
        entregadorLat: entregaData?.latitude || entregadorInfo?.lat || null,
        entregadorLng: entregaData?.longitude || entregadorInfo?.lng || null,
        entregaId: entregaData?.id || null,
        entregaStatus: entregaData?.status || null,
      };

      setTrackingState(newState);
      setPedidoStatus(pedido.status as OrderStatus);

      console.log('📦 Pedido carregado:', pedido.id, 'Status:', pedido.status);
      console.log('🚚 Entregador:', newState.entregadorNome, '@', newState.entregadorLat, newState.entregadorLng);

    } catch (err) {
      console.error('❌ Erro ao carregar pedido:', err);
      setError('Erro ao carregar dados do pedido');
    }
  }, [pedidoId]);

  // ============ GPS DO CLIENTE ============
  const startClientTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada');
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

          updateClientMarker(loc);
        }
      },
      (err) => {
        console.error('❌ Erro GPS:', err);
        setIsOnline(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [user?.id]);

  const updateClientMarker = (location: { lat: number; lng: number }) => {
    if (!mapInstance.current) return;

    if (clientMarkerRef.current) {
      clientMarkerRef.current.setPosition(location);
    } else {
      // Aura do cliente
      delivererAuraRef.current = new google.maps.Marker({
        position: location,
        map: mapInstance.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: COLORS.CLIENT,
          fillOpacity: 0.15,
          strokeColor: 'transparent',
        },
        zIndex: 999,
      });

      clientMarkerRef.current = new google.maps.Marker({
        position: location,
        map: mapInstance.current,
        title: 'Você',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: COLORS.CLIENT,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
        zIndex: 1000,
      });
    }
  };

  // ============ ATUALIZAR MARCADOR DO ENTREGADOR ============
  const updateDelivererMarker = useCallback((location: { lat: number; lng: number }) => {
    if (!mapInstance.current) return;

    // Remover marcador antigo
    if (delivererMarkerRef.current) {
      delivererMarkerRef.current.setMap(null);
    }
    if (delivererAuraRef.current) {
      delivererAuraRef.current.setMap(null);
    }

    // Aura do entregador
    delivererAuraRef.current = new google.maps.Marker({
      position: location,
      map: mapInstance.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 24,
        fillColor: COLORS.DELIVERER,
        fillOpacity: 0.15,
        strokeColor: 'transparent',
      },
      zIndex: 799,
    });

    // Marcador do entregador (moto)
    delivererMarkerRef.current = new google.maps.Marker({
      position: location,
      map: mapInstance.current,
      title: trackingState?.entregadorNome || 'Entregador',
      icon: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: COLORS.DELIVERER,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 1.5,
        anchor: new google.maps.Point(12, 22),
      },
      zIndex: 800,
      animation: google.maps.Animation.BOUNCE,
    });

    console.log('🛵 Entregador atualizado:', location.lat, location.lng);
  }, [trackingState?.entregadorNome]);

  // ============ ATUALIZAR MARCADOR DA LOJA ============
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || !trackingState) return;

    if (trackingState.lojaLat && trackingState.lojaLng) {
      if (storeMarkerRef.current) {
        storeMarkerRef.current.setPosition({
          lat: trackingState.lojaLat,
          lng: trackingState.lojaLng,
        });
      } else {
        storeMarkerRef.current = new google.maps.Marker({
          position: { lat: trackingState.lojaLat, lng: trackingState.lojaLng },
          map: mapInstance.current,
          title: trackingState.lojaNome,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: COLORS.STORE,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
          zIndex: 500,
        });
      }
    }
  }, [mapLoaded, trackingState]);

  // ============ TRAÇAR ROTA ============
  const traçarRota = useCallback(() => {
    if (!mapInstance.current || !directionsServiceRef.current) return;

    // Determinar o que mostrar baseado no status e tipo de entrega
    const { tipoEntrega, entregadorId, entregadorLat, entregadorLng, lojaLat, lojaLng } = trackingState || {};
    
    if (tipoEntrega === 'RETIRADA') {
      // Cliente vai à loja - Cliente → Loja
      if (!minhaLocalizacao || !lojaLat || !lojaLng) return;

      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      const renderer = new google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: COLORS.ROUTE,
          strokeOpacity: 0.8,
          strokeWeight: 6,
        },
      });
      directionsRendererRef.current = renderer;

      directionsServiceRef.current.route(
        {
          origin: { lat: minhaLocalizacao.lat, lng: minhaLocalizacao.lng },
          destination: { lat: lojaLat, lng: lojaLng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            renderer.setDirections(result);
            const leg = result.routes[0].legs[0];
            setRouteInfo({
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || '',
            });

            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: minhaLocalizacao.lat, lng: minhaLocalizacao.lng });
            bounds.extend({ lat: lojaLat, lng: lojaLng });
            mapInstance.current?.fitBounds(bounds, { top: 180, right: 50, bottom: 200, left: 50 });
          }
        }
      );

    } else if (tipoEntrega === 'ENTREGA' && entregadorId && entregadorLat && entregadorLng && lojaLat && lojaLng) {
      // Entrega com entregador - Loja → Cliente (via entregador)
      // Mostrar rota do entregador até o cliente
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      const renderer = new google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: COLORS.DELIVERER,
          strokeOpacity: 0.8,
          strokeWeight: 6,
        },
      });
      directionsRendererRef.current = renderer;

      directionsServiceRef.current.route(
        {
          origin: { lat: entregadorLat, lng: entregadorLng },
          destination: { lat: trackingState!.clienteLat!, lng: trackingState!.clienteLng! },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            renderer.setDirections(result);
            const leg = result.routes[0].legs[0];
            setRouteInfo({
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || '',
            });

            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: entregadorLat, lng: entregadorLng });
            if (trackingState?.clienteLat && trackingState?.clienteLng) {
              bounds.extend({ lat: trackingState.clienteLat, lng: trackingState.clienteLng });
            }
            mapInstance.current?.fitBounds(bounds, { top: 180, right: 50, bottom: 200, left: 50 });
          }
        }
      );
    }
  }, [trackingState, minhaLocalizacao]);

  // ============ INICIALIZAÇÃO DO MAPA ============
  useEffect(() => {
    if (!mapRef.current) return;
    let isMounted = true;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript(['places', 'geometry', 'directions']);

        if (!mapRef.current || !isMounted) return;

        setTimeout(() => {
          if (mapRef.current && !mapInstance.current && isMounted) {
            const center = minhaLocalizacao 
              ? { lat: minhaLocalizacao.lat, lng: minhaLocalizacao.lng }
              : trackingState?.lojaLat && trackingState?.lojaLng
                ? { lat: trackingState.lojaLat, lng: trackingState.lojaLng }
                : { lat: -8.839988, lng: 13.289437 };

            const map = new google.maps.Map(mapRef.current, {
              center,
              zoom: 15,
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

            setTimeout(() => {
              if (mapInstance.current) {
                google.maps.event.trigger(mapInstance.current, 'resize');
                mapInstance.current.setCenter(center);
              }
            }, 500);
          }
        }, 300);
      } catch (err) {
        console.error('❌ Erro ao carregar Google Maps:', err);
        setError('Erro ao carregar mapa');
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (routeUpdateIntervalRef.current) clearInterval(routeUpdateIntervalRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      clientMarkerRef.current?.setMap(null);
      storeMarkerRef.current?.setMap(null);
      delivererMarkerRef.current?.setMap(null);
      delivererAuraRef.current?.setMap(null);
      directionsRendererRef.current?.setMap(null);
    };
  }, []);

  // ============ CARREGAR DADOS E INICIAR TRACKING ============
  useEffect(() => {
    carregarPedido();
    startClientTracking();
  }, [carregarPedido, startClientTracking]);

  // ============ POLLING PARA POSIÇÃO DO ENTREGADOR ============
  useEffect(() => {
    if (!trackingState?.entregadorId) return;

    const loadEntregadorLocation = async () => {
      const { data } = await supabase
        .from('localizacoes_tempo_real')
        .select('latitude, longitude')
        .eq('profile_id', trackingState.entregadorId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data && data.latitude && data.longitude) {
        const loc = { lat: data.latitude, lng: data.longitude };
        
        setTrackingState(prev => prev ? {
          ...prev,
          entregadorLat: data.latitude,
          entregadorLng: data.longitude,
        } : null);
        
        updateDelivererMarker(loc);
      }
    };

    // Carregar imediatamente
    loadEntregadorLocation();

    // Polling a cada 3 segundos
    pollingIntervalRef.current = window.setInterval(loadEntregadorLocation, 3000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [trackingState?.entregadorId, updateDelivererMarker]);

  // ============ TRAÇAR ROTA QUANDO HOUVER DADOS ============
  useEffect(() => {
    if (mapLoaded && trackingState) {
      traçarRota();
    }
  }, [mapLoaded, trackingState, traçarRota]);

  // ============ REALTIME PARA STATUS DO PEDIDO ============
  useEffect(() => {
    const channel = supabase
      .channel(`pedido-tracking-${pedidoId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'pedidos',
        filter: `id=eq.${pedidoId}`
      }, (payload) => {
        const newStatus = payload.new.status as OrderStatus;
        setPedidoStatus(newStatus);
        console.log('🔄 Status atualizado:', newStatus);
        carregarPedido();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'entregas',
        filter: `pedido_id=eq.${pedidoId}`
      }, (payload) => {
        console.log('🔄 Entrega atualizada:', payload.new);
        carregarPedido();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [pedidoId, carregarPedido]);

  // ============ CONTROLES ============
  const handleZoomIn = () => {
    if (mapInstance.current) {
      mapInstance.current.setZoom((mapInstance.current.getZoom() || 15) + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstance.current) {
      mapInstance.current.setZoom((mapInstance.current.getZoom() || 15) - 1);
    }
  };

  const recentrarMapa = () => {
    if (mapInstance.current && minhaLocalizacao) {
      mapInstance.current.panTo({ lat: minhaLocalizacao.lat, lng: minhaLocalizacao.lng });
      mapInstance.current.setZoom(16);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()?.then(() => {
        setIsFullscreen(true);
        setTimeout(() => {
          if (mapInstance.current) google.maps.event.trigger(mapInstance.current, 'resize');
        }, 300);
      });
    } else {
      document.exitFullscreen()?.then(() => {
        setIsFullscreen(false);
        setTimeout(() => {
          if (mapInstance.current) google.maps.event.trigger(mapInstance.current, 'resize');
        }, 300);
      });
    }
  };

  const atualizarRota = () => traçarRota();

  const isTrackingAtivo = useMemo(() => {
    if (!pedidoStatus) return false;
    return !['ENTREGUE', 'CANCELADO'].includes(pedidoStatus);
  }, [pedidoStatus]);

  const statusConfig = getStatusConfig(pedidoStatus);

  // ============ RENDER ============
  return (
    <div 
      className={`min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} font-sans pb-24`}
      ref={containerRef}
    >
      {/* Header Fixo */}
      <div className={`p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-[500]`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-700/50">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Acompanhar Pedido</h1>
            <p className="text-xs text-slate-400">
              {isOnline && isTrackingAtivo ? (
                <span className="flex items-center gap-1 text-emerald-500">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  GPS Ativo
                </span>
              ) : 'GPS Offline'}
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor}`}>
            <span style={{ color: statusConfig.color }}>{statusConfig.icon}</span>
            <span className="text-xs font-medium" style={{ color: statusConfig.color }}>
              {statusConfig.text}
            </span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="relative">
        <div ref={mapRef} className="h-[50vh] w-full" />

        {/* Loading */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <div className="text-center">
              <Loader2 size={40} className="animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-slate-500">Carregando mapa...</p>
            </div>
          </div>
        )}

        {/* Info da Rota */}
        {routeInfo && isTrackingAtivo && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200 px-4 py-2.5 flex items-center gap-3">
            <Navigation size={16} className="text-blue-500 animate-pulse" />
            <span className="font-bold text-sm">{routeInfo.duration}</span>
            <span className="text-slate-500 text-xs">• {routeInfo.distance}</span>
            <button onClick={atualizarRota} className="p-1 hover:bg-slate-100 rounded-full">
              <RefreshCw size={14} className="text-slate-400" />
            </button>
          </div>
        )}

        {/* Alerta de Pedido Concluído/Cancelado */}
        {!isTrackingAtivo && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border px-4 py-3 flex items-center gap-3">
            {pedidoStatus === 'ENTREGUE' ? (
              <>
                <CheckCircle size={20} className="text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-600">Pedido Entregue!</p>
                  <p className="text-xs text-slate-500">Obrigado por comprar conosco</p>
                </div>
              </>
            ) : pedidoStatus === 'CANCELADO' ? (
              <>
                <AlertCircle size={20} className="text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-600">Pedido Cancelado</p>
                  <p className="text-xs text-slate-500">Entre em contato para mais informações</p>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* CONTROLES DE ZOOM */}
        <div className="absolute right-3 bottom-3 z-[400] flex flex-col gap-2">
          <button onClick={handleZoomIn} className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200">
            <Plus size={20} className="text-slate-700" />
          </button>
          <button onClick={handleZoomOut} className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200">
            <Minus size={20} className="text-slate-700" />
          </button>
          <div className="h-px bg-slate-200 my-1" />
          <button onClick={recentrarMapa} className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200">
            <Locate size={20} className="text-blue-500" />
          </button>
          <button onClick={toggleFullscreen} className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-200">
            <Maximize2 size={20} />
          </button>
        </div>

        {/* Legenda */}
        <div className="absolute left-3 top-3 z-[400] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Legenda</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.CLIENT }} />
              <span className="text-[11px] text-slate-600">Você</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.STORE }} />
              <span className="text-[11px] text-slate-600">Loja</span>
            </div>
            {trackingState?.entregadorId && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.DELIVERER }} />
                <span className="text-[11px] text-slate-600">Entregador 🛵</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.ROUTE }} />
              <span className="text-[11px] text-slate-600">Rota</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card do Entregador (se existir) */}
      {trackingState?.entregadorId && (
        <div className={`mx-4 mt-4 rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${COLORS.DELIVERER}20` }}
              >
                <User size={24} style={{ color: COLORS.DELIVERER }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400">Entregador</p>
                <h3 className="font-bold">{trackingState.entregadorNome || 'A caminho...'}</h3>
                <p className="text-xs text-emerald-500">🛵 Em entrega</p>
              </div>
              {trackingState.entregadorTelefone && (
                <a href={`tel:${trackingState.entregadorTelefone}`} className="p-2 bg-green-500/20 rounded-full">
                  <Phone size={20} className="text-green-500" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card de Informações do Pedido */}
      <div className={`mx-4 mt-4 rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${COLORS.STORE}15` }}
            >
              <Store size={24} style={{ color: COLORS.STORE }} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">{trackingState?.lojaNome || 'Carregando...'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {trackingState?.tipoEntrega === 'RETIRADA' ? 'Retirada na loja' : 'Entrega no endereço'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            {['Pendente', 'Preparo', trackingState?.tipoEntrega === 'RETIRADA' ? 'Retirada' : 'Saiu', 'Entregue'].map((step, index) => {
              const isActive = ['PENDENTE', 'PAGO', 'PREPARANDO', 'PRONTO_PARA_RETIRADA', 'EM_ROTA', 'ENTREGUE'].includes(pedidoStatus || '');
              const isCompleted = pedidoStatus === 'ENTREGUE' && index < 3 || 
                ['PAGO', 'PREPARANDO', 'PRONTO_PARA_RETIRADA', 'EM_ROTA', 'ENTREGUE'].includes(pedidoStatus || '') && index < 2 ||
                ['PREPARANDO', 'PRONTO_PARA_RETIRADA', 'EM_ROTA', 'ENTREGUE'].includes(pedidoStatus || '') && index < 1 ||
                pedidoStatus === 'ENTREGUE';
              
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted || (index === 0 && isActive) ? 'bg-green-500 text-white' : 'bg-slate-200'
                    }`}>
                      {isCompleted ? <CheckCircle size={16} /> : index + 1}
                    </div>
                    <p className="text-[10px] mt-1 text-center">{step}</p>
                  </div>
                  {index < 3 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Info da Rota */}
        {routeInfo && isTrackingAtivo && (
          <div className="mx-4 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2">
              <Navigation size={18} className="text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Tempo estimado</p>
                <p className="text-xs text-slate-500">{routeInfo.duration} ({routeInfo.distance})</p>
              </div>
              <button onClick={atualizarRota} className="p-2 bg-blue-500 text-white rounded-lg">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        {trackingState?.lojaLat && trackingState?.lojaLng && (
          <div className="p-4 pt-0 flex gap-3">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${minhaLocalizacao?.lat || ''},${minhaLocalizacao?.lng || ''}&destination=${trackingState.lojaLat},${trackingState.lojaLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <Navigation size={18} />
              Abrir no Google Maps
            </a>
          </div>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-4 py-2 rounded-full z-[700] whitespace-nowrap shadow-lg">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default OrderTrackingMap;