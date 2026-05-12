// pages/EntregadorDashboard.tsx — Dashboard do Entregador
// Aceitar, rastrear e completar entregas
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../services/supabaseClient';
import { updateLocation, getPedidoPorId } from '../services/database';
import { loadGoogleMapsScript } from '../services/googleMaps';
import {
  ArrowLeft, Package, MapPin, CheckCircle, Clock, Navigation, 
  Phone, User, Store, Truck, AlertCircle, Loader2, X, RefreshCw,
  Check, Locate, Menu, Bell, Settings, LogOut, Eye
} from 'lucide-react';
import type { Pedido, Entrega } from '../types';

const COLORS = {
  PENDING: '#FF9500',
  ACTIVE: '#4285F4',
  SUCCESS: '#34A853',
  ERROR: '#EA4335',
};

// Status da entrega — ALINHADOS COM DB CHECK CONSTRAINT
const ENTREGA_STATUS = {
  AGUARDANDO: 'AGUARDANDO',
  A_CAMINHO: 'A_CAMINHO',
  ENTREGUE: 'ENTREGUE',
  FALHOU: 'FALHOU',
};

interface EntregaDisponivel {
  entrega: Entrega;
  pedido: Pedido;
  loja: any;
  distancia?: string;
}

interface EntregaAtiva {
  entrega: Entrega;
  pedido: Pedido;
  loja: any;
  cliente: any;
}

export const EntregadorDashboard: React.FC = () => {
  const { user, goBack, theme, setView } = useApp();
  
  // Estado
  const [activeTab, setActiveTab] = useState<'disponiveis' | 'ativas' | 'historico'>('disponiveis');
  const [entregasDisponiveis, setEntregasDisponiveis] = useState<EntregaDisponivel[]>([]);
  const [entregaAtiva, setEntregaAtiva] = useState<EntregaAtiva | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const routeRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  
  const isDark = theme === 'dark';

  // ==========================================
  // BUSCAR ENTREGAS DISPONÍVEIS
  // ==========================================
  const buscarEntregasDisponiveis = useCallback(async () => {
    try {
      // Buscar entregas aguardando entregador
      const { data: entregas, error: err1 } = await supabase
        .from('entregas')
        .select('*')
        .eq('status', ENTREGA_STATUS.AGUARDANDO)
        .order('created_at', { ascending: true });

      if (err1) throw err1;

      // Para cada entrega, buscar dados do pedido
      const detalhes: EntregaDisponivel[] = [];
      for (const entrega of (entregas || [])) {
        const pedido = await getPedidoPorId(entrega.pedido_id);
        if (pedido) {
          const { data: loja } = await supabase
            .from('lojas')
            .select('*')
            .eq('id', pedido.loja_id)
            .maybeSingle();

          detalhes.push({ entrega, pedido, loja });
        }
      }

      setEntregasDisponiveis(detalhes);
    } catch (err) {
      console.error('Erro ao buscar entregas:', err);
    }
  }, []);

  // ==========================================
  // BUSCAR MINHA ENTREGA ATIVA
  // ==========================================
  const buscarEntregaAtiva = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Buscar entrega em andamento por este entregador
      const { data: entregas } = await supabase
        .from('entregas')
        .select('*')
        .eq('entregador_id', user.id)
        .eq('status', ENTREGA_STATUS.A_CAMINHO)
        .limit(1);

      if (entregas && entregas.length > 0) {
        const entrega = entregas[0];
        const pedido = await getPedidoPorId(entrega.pedido_id);

        if (pedido) {
          const { data: loja } = await supabase
            .from('lojas')
            .select('*')
            .eq('id', pedido.loja_id)
            .maybeSingle();

          const { data: cliente } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', pedido.cliente_id)
            .maybeSingle();

          setEntregaAtiva({ entrega, pedido, loja, cliente });
        }
      } else {
        setEntregaAtiva(null);
      }
    } catch (err) {
      console.error('Erro ao buscar entrega ativa:', err);
    }
  }, [user?.id]);

  // ==========================================
  // ACEITAR ENTREGA
  // ==========================================
  const aceitarEntrega = async (entregaId: string, pedidoId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          entregador_id: user.id,
          status: ENTREGA_STATUS.A_CAMINHO,
        })
        .eq('id', entregaId);

      if (error) throw error;

      // Atualizar status do pedido para EM_ROTA
      await supabase
        .from('pedidos')
        .update({ status: 'EM_ROTA' })
        .eq('id', pedidoId);

      // Recarregar
      await buscarEntregaAtiva();
      await buscarEntregasDisponiveis();

    } catch (err) {
      console.error('Erro ao aceitar entrega:', err);
      setError('Erro ao aceitar entrega');
    }
  };

  // ==========================================
  // ATUALIZAR STATUS DA ENTREGA
  // ==========================================
  const atualizarStatusEntrega = async (novoStatus: string) => {
    if (!entregaAtiva) return;

    try {
      const { error } = await supabase
        .from('entregas')
        .update({ status: novoStatus })
        .eq('id', entregaAtiva.entrega.id);

      if (error) throw error;

      // Atualizar status do pedido
      await supabase
        .from('pedidos')
        .update({ status: novoStatus === ENTREGA_STATUS.ENTREGUE ? 'ENTREGUE' : 'EM_ROTA' })
        .eq('id', entregaAtiva.pedido.id);

      // Recarregar
      await buscarEntregaAtiva();
      
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError('Erro ao atualizar status');
    }
  };

  // ==========================================
  // LOCALIZAÇÃO EM TEMPO REAL
  // ==========================================
  const startLocationTracking = useCallback(() => {
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
          setCurrentLocation(loc);

          // Enviar para o banco
          if (user?.id) {
            updateLocation(user.id, latitude, longitude, 'ENTREGADOR');
          }

          // Atualizar marcação no mapa
          updateMyLocationMarker(loc);
        }
      },
      (err) => {
        console.error('Erro GPS:', err);
        setIsOnline(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [user?.id]);

  const updateMyLocationMarker = (location: { lat: number; lng: number }) => {
    if (!mapInstance.current) return;

    // Remover marcadores antigos
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Criar marcador da minha posição
    const myMarker = new google.maps.Marker({
      position: location,
      map: mapInstance.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: COLORS.ACTIVE,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
      },
      zIndex: 1000,
      title: 'Minha posição',
    });
    markersRef.current.push(myMarker);
  };

  // ==========================================
  // INICIALIZAR MAPA
  // ==========================================
  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript(['geometry', 'directions']);

        if (!mapRef.current || !isMounted) return;

        setTimeout(() => {
          if (mapRef.current && !mapInstance.current && isMounted) {
            const map = new google.maps.Map(mapRef.current, {
              center: { lat: -8.839988, lng: 13.289437 },
              zoom: 14,
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              gestureHandling: 'greedy',
            });

            mapInstance.current = map;
          }
        }, 300);
      } catch (err) {
        console.error('Erro ao carregar mapa:', err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      markersRef.current.forEach(m => m.setMap(null));
      if (routeRendererRef.current) {
        routeRendererRef.current.setMap(null);
      }
    };
  }, []);

  // ==========================================
  // CARREGAR DADOS INICIAIS
  // ==========================================
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        buscarEntregasDisponiveis(),
        buscarEntregaAtiva(),
      ]);
      setLoading(false);
    };
    load();
    startLocationTracking();
  }, [buscarEntregasDisponiveis, buscarEntregaAtiva, startLocationTracking]);

  // ==========================================
  // MOSTRAR ROTA NO MAPA
  // ==========================================
  useEffect(() => {
    if (!mapInstance.current || !entregaAtiva || !currentLocation) return;

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: mapInstance.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: COLORS.ACTIVE,
        strokeOpacity: 0.8,
        strokeWeight: 6,
      },
    });

    // Definir origem e destino baseado no status
    let origin: google.maps.LatLngLiteral;
    let destination: google.maps.LatLngLiteral;
    const waypoints: google.maps.DirectionsWaypoint[] = [];

    const lojaLat = entregaAtiva.loja?.lat || entregaAtiva.loja?.latitude;
    const lojaLng = entregaAtiva.loja?.lng || entregaAtiva.loja?.longitude;
    const clienteLat = entregaAtiva.pedido.cliente_lat;
    const clienteLng = entregaAtiva.pedido.cliente_lng;

    switch (entregaAtiva.entrega.status) {
      case ENTREGA_STATUS.A_CAMINHO:
        // Do entregador até o cliente (via loja)
        origin = currentLocation;
        destination = {
          lat: clienteLat || lojaLat,
          lng: clienteLng || lojaLng,
        };
        break;
      case ENTREGA_STATUS.ENTREGUE:
        return; // Rota finalizada
      default:
        return;
    }

    directionsService.route(
      { origin, destination, waypoints, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
          routeRendererRef.current = directionsRenderer;

          // Adicionar marcadores
          new google.maps.Marker({
            position: origin,
            map: mapInstance.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: COLORS.SUCCESS,
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
            title: 'Loja',
          });

          new google.maps.Marker({
            position: destination,
            map: mapInstance.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: COLORS.PENDING,
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
            title: 'Cliente',
          });

          // Ajustar zoom
          const bounds = new google.maps.LatLngBounds();
          result.routes[0].legs.forEach(leg => {
            leg.steps.forEach(step => {
              step.lat_lngs.forEach(latLng => bounds.extend(latLng));
            });
          });
          mapInstance.current?.fitBounds(bounds, { top: 100, right: 50, bottom: 100, left: 50 });
        }
      }
    );
  }, [entregaAtiva, currentLocation]);

  // ==========================================
  // RENDER STATUS STEPS
  // ==========================================
  const getStatusStep = (status: string) => {
    const steps = [
      { key: 'A_CAMINHO', label: 'A caminho' },
      { key: 'ENTREGUE', label: 'Entregue' },
    ];
    const currentIndex = steps.findIndex(s => s.key === status);
    return { steps, currentIndex };
  };

  const { steps, currentIndex } = entregaAtiva 
    ? getStatusStep(entregaAtiva.entrega.status) 
    : { steps: [], currentIndex: -1 };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className={`p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-50`}>
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-1">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Truck size={20} className="text-orange-500" />
              Entregador
            </h1>
            <p className="text-xs text-slate-400">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-500">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Online
                </span>
              ) : 'Offline'}
            </p>
          </div>
          <button className="p-2 bg-slate-700/50 rounded-full">
            <Bell size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('disponiveis')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'disponiveis'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-slate-400'
          }`}
        >
          Disponíveis ({entregasDisponiveis.length})
        </button>
        <button
          onClick={() => setActiveTab('ativas')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'ativas'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-slate-400'
          }`}
        >
          Ativas {entregaAtiva ? '1' : ''}
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'historico'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-slate-400'
          }`}
        >
          Histórico
        </button>
      </div>

      {/* Content */}
      <div className="p-4 pb-32">
        {/* ENTREGA ATIVA */}
        {entregaAtiva && activeTab === 'ativas' && (
          <div className="space-y-4">
            {/* Mapa da entrega ativa */}
            <div className="rounded-2xl overflow-hidden h-64 bg-slate-800">
              <div ref={mapRef} className="h-full w-full" />
            </div>

            {/* Card da entrega */}
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
              {/* Status atual */}
              <div className="mb-4">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                  entregaAtiva.entrega.status === ENTREGA_STATUS.A_CAMINHO
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {entregaAtiva.entrega.status === ENTREGA_STATUS.A_CAMINHO ? (
                    <Navigation size={14} />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  {entregaAtiva.entrega.status === ENTREGA_STATUS.A_CAMINHO ? 'A caminho do cliente' :
                   entregaAtiva.entrega.status === ENTREGA_STATUS.ENTREGUE ? 'Entregue' : 'Status'}
                </span>
              </div>

              {/* Cliente */}
              <div className="mb-4 pb-4 border-b border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Cliente</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User size={20} className="text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{entregaAtiva.cliente?.nome || 'Cliente'}</p>
                    {entregaAtiva.pedido.endereco_entrega && (
                      <p className="text-xs text-slate-400">{entregaAtiva.pedido.endereco_entrega}</p>
                    )}
                  </div>
                  {entregaAtiva.cliente?.telefone && (
                    <a href={`tel:${entregaAtiva.cliente.telefone}`} className="p-2 bg-green-500/20 rounded-full">
                      <Phone size={20} className="text-green-500" />
                    </a>
                  )}
                </div>
              </div>

              {/* Loja */}
              <div className="mb-4 pb-4 border-b border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Loja</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Store size={20} className="text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{entregaAtiva.loja?.nome || 'Loja'}</p>
                    {entregaAtiva.loja?.endereco && (
                      <p className="text-xstext-slate-400">{entregaAtiva.loja.endereco}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Pedido info */}
              <div className="mb-4 pb-4 border-b border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Pedido</p>
                <p className="font-bold text-lg">
                  {formatCurrency(entregaAtiva.pedido.valor_total)}
                </p>
                <p className="text-xs text-slate-400">
                  Código: {entregaAtiva.pedido.codigo_rastreamento}
                </p>
              </div>

              {/* Timeline de status */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index <= currentIndex ? 'bg-green-500 text-white' : 'bg-slate-700'
                        }`}>
                          {index < currentIndex ? <Check size={16} /> : <span className="text-xs">{index + 1}</span>}
                        </div>
                        <p className="text-[10px] mt-1 text-center">{step.label}</p>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 ${index < currentIndex ? 'bg-green-500' : 'bg-slate-700'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="space-y-2">
                {entregaAtiva.entrega.status === ENTREGA_STATUS.A_CAMINHO && (
                  <button
                    onClick={() => atualizarStatusEntrega(ENTREGA_STATUS.ENTREGUE)}
                    className="w-full py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Confirmar entrega
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ENTREGAS DISPONÍVEIS */}
        {activeTab === 'disponiveis' && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : entregasDisponiveis.length === 0 ? (
              <div className="text-center py-8">
                <Package size={48} className="mx-auto mb-3 text-slate-400" />
                <p className="text-slate-400">Nenhuma entrega disponível</p>
              </div>
            ) : (
              entregasDisponiveis.map(({ entrega, pedido, loja }) => (
                <div 
                  key={entrega.id}
                  className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Store size={24} className="text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{loja?.nome || 'Loja'}</p>
                      <p className="text-xs text-slate-400">{loja?.endereco || ''}</p>
                    </div>
                    <span className="text-lg font-bold text-green-500">
                      {formatCurrency(pedido.valor_total)}
                    </span>
                  </div>

                  <div className="mb-3 p-3 bg-slate-700/50 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">Endereço de entrega:</p>
                    <p className="text-sm">{pedido.endereco_entrega || 'Não informado'}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => aceitarEntrega(entrega.id, pedido.id)}
                      className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      Aceitar
                    </button>
                    <button className="py-3 px-4 bg-slate-700 rounded-xl">
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* HISTÓRICO */}
        {activeTab === 'historico' && (
          <div className="text-center py-8">
            <Clock size={48} className="mx-auto mb-3 text-slate-400" />
            <p className="text-slate-400">Histórico de entregas</p>
            <p className="text-xs text-slate-500 mt-2">Suas entregas concluídas aparecerão aqui</p>
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-4 py-2 rounded-full z-[700] whitespace-nowrap shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

// Helper
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
  }).format(value);
}

export default EntregadorDashboard;