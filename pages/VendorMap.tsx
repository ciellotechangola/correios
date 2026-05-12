// pages/VendorMap.tsx — Schema V4 compliant com cores OBRIGATÓRIAS
// Cores: CLIENTE = azul (#2196F3), LOJA = vermelho (#F44336), ENTREGADOR = verde (#4CAF50)
// Pedido pendente = laranja pulsante (#FF5722), Rota ativa = azul (#2196F3)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useRealtimeLocation } from '../hooks/useRealtimeLocation';
import { buscarClientesParaVendedor, updateLocation, marcarOffline } from '../services/database';
import {
  ArrowLeft, MapPin, Navigation, Crosshair, Package, Users,
  Maximize2, Minimize2, Search, ChevronRight, AlertCircle,
  CheckCircle2, Loader2, Wifi, WifiOff, Radio, User, Phone,
  MessageCircle, Store
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ClienteProximo } from '../types';

// Fix Leaflet - usar CDN em vez de imports locais
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// ═══════════════════════════════════════════════════════════════════
// CORES OBRIGATÓRIAS DO SCHEMA V4
// ═══════════════════════════════════════════════════════════════════
const COLORS = {
  CLIENTE: '#2196F3',      // Azul - cliente online
  LOJA: '#F44336',         // Vermelho - loja/vendedor
  ENTREGADOR: '#4CAF50',   // Verde - entregador
  PEDIDO_PENDENTE: '#FF5722', // Laranja - cliente com pedido
  ROTA: '#2196F3',         // Azul - rota ativa
};

// Criar ícones SVG inline para melhor controle de cores
const criarIconeCliente = (temPedido: boolean, isOnline: boolean) => {
  const cor = temPedido ? COLORS.PEDIDO_PENDENTE : isOnline ? COLORS.CLIENTE : '#9E9E9E';
  const tamanho = temPedido ? 28 : 22;
  const pulso = temPedido ? 'animation: pulse 2s infinite;' : '';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${cor};
        width: ${tamanho}px;
        height: ${tamanho}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        ${pulso}
        transition: transform 0.2s;
      ">
        ${temPedido ? '<span style="color: white; font-size: 12px; font-weight: bold;">📦</span>' : ''}
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
      </style>
    `,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2]
  });
};

const criarIconeLoja = () => L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background-color: ${COLORS.LOJA};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 3px 12px rgba(244,67,54,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="color: white; font-size: 16px;">🏪</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export const VendorMap: React.FC = () => {
  const { user, setView, theme } = useApp();
  const [raioKm, setRaioKm] = useState<number>(10);
  const [clientesProximos, setClientesProximos] = useState<ClienteProximo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteProximo | null>(null);
  const [minhaLocalizacao, setMinhaLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [minhaLoja, setMinhaLoja] = useState<{ lat: number; lng: number } | null>(null);

  // Hook de localização em tempo real com DEBOUNCE de 5s (REGRA OBRIGATÓRIA)
  const {
    minhasCoordenadas,
    isTracking,
    forcarAtualizacao,
    stopTracking
  } = useRealtimeLocation({
    userId: user?.id,
    perfil: 'VENDEDOR',
    raioBusca: raioKm,
    ativo: true,
  });

  // Carregar minha loja
  useEffect(() => {
    if (!user?.id) return;

    const carregarLoja = async () => {
      const { data } = await supabase
        .from('lojas')
        .select('latitude, longitude, nome')
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (data && data.latitude && data.longitude) {
        setMinhaLoja({ lat: data.latitude, lng: data.longitude });
      }
    };

    carregarLoja();
  }, [user?.id]);

  // Sincronizar coordenadas
  useEffect(() => {
    if (minhasCoordenadas) {
      setMinhaLocalizacao(minhasCoordenadas);
    }
  }, [minhasCoordenadas]);

  // Buscar clientes próximos via RPC buscar_clientes_para_vendedor
  const buscarClientes = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const clientes = await buscarClientesParaVendedor(user.id, raioKm);
      setClientesProximos(clientes);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, raioKm]);

  // Buscar ao mudar raio ou coordenadas
  useEffect(() => {
    buscarClientes();
  }, [raioKm, buscarClientes]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('clientes-vendedor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'localizacoes_tempo_real',
          filter: `perfil=eq.CLIENTE`,
        },
        () => {
          buscarClientes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, buscarClientes]);

  // Marcar offline no cleanup/unmount (REGRA OBRIGATÓRIA)
  useEffect(() => {
    return () => {
      if (user?.id) {
        marcarOffline(user.id);
      }
    };
  }, [user?.id]);

  const MapController = () => {
    const map = useMap();
    useEffect(() => {
      if (minhaLocalizacao) {
        map.setView([minhaLocalizacao.lat, minhaLocalizacao.lng], 13);
      } else if (minhaLoja) {
        map.setView([minhaLoja.lat, minhaLoja.lng], 13);
      }
    }, [map]);
    return null;
  };

  const isDark = theme === 'dark';
  const center = minhaLocalizacao || minhaLoja || { lat: -8.839988, lng: 13.289437 };

  // Stats
  const totalOnline = useMemo(() =>
    clientesProximos.filter(c => c.is_online && !c.tem_pedido_pendente).length,
    [clientesProximos]
  );

  const totalComPedidos = useMemo(() =>
    clientesProximos.filter(c => c.tem_pedido_pendente).length,
    [clientesProximos]
  );

  if (!user || user.role !== 'VENDEDOR') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-white">Acesso restrito a vendedores</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} font-sans pb-24`}>
      {/* Header */}
      <div className={`p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b`}>
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (user?.id) marcarOffline(user.id);
            setView('vendor-dashboard');
          }} className="p-2 rounded-full hover:bg-slate-700/50">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Clientes Próximos</h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isTracking ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi size={12} className="animate-pulse" /> GPS ativo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400">
                  <WifiOff size={12} /> Offline
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filtros de Raio */}
        <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Raio de busca:</span>
            <span className="text-blue-500 font-bold">{raioKm} km</span>
          </div>
          <div className="flex gap-2">
            {[5, 10, 15, 25].map((km) => (
              <button
                key={km}
                onClick={() => setRaioKm(km)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  raioKm === km
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {km}km
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} style={{ color: COLORS.CLIENTE }} />
              <span className="text-xs text-slate-400">Clientes</span>
            </div>
            <p className="text-2xl font-bold">{clientesProximos.length}</p>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Wifi size={16} style={{ color: COLORS.CLIENTE }} />
              <span className="text-xs text-slate-400">Online</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: COLORS.CLIENTE }}>{totalOnline}</p>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Package size={16} style={{ color: COLORS.PEDIDO_PENDENTE }} />
              <span className="text-xs text-slate-400">Pedidos</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: COLORS.PEDIDO_PENDENTE }}>{totalComPedidos}</p>
          </div>
        </div>

        {/* Legends de Cores */}
        <div className={`flex flex-wrap gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.LOJA }} />
            <span className="text-xs">Minha Loja</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.CLIENTE }} />
            <span className="text-xs">Cliente Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.PEDIDO_PENDENTE }} />
            <span className="text-xs">Com Pedido</span>
          </div>
        </div>

        {/* Mapa Leaflet com cores OBRIGATÓRIAS */}
        <div className="h-[60vh] rounded-2xl overflow-hidden">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url={isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
            />
            <MapController />

            {/* Círculo de raio com cor da rota */}
            {(minhaLocalizacao || minhaLoja) && (
              <Circle
                center={[center.lat, center.lng]}
                radius={raioKm * 1000}
                pathOptions={{
                  color: COLORS.ROTA,
                  fillColor: COLORS.ROTA,
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            )}

            {/* Minha Loja - VERMELHO #F44336 */}
            {(minhaLocalizacao || minhaLoja) && (
              <Marker
                position={[center.lat, center.lng]}
                icon={criarIconeLoja()}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-red-600">Minha Loja</p>
                    <p className="text-xs">{center.lat.toFixed(6)}, {center.lng.toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Clientes - AZUL #2196F3 ou LARANJA #FF5722 com pedido */}
            {clientesProximos.map((cliente) => (
              <Marker
                key={cliente.user_id}
                position={[cliente.cliente_lat, cliente.cliente_lng]}
                icon={criarIconeCliente(cliente.tem_pedido_pendente, cliente.is_online)}
                eventHandlers={{
                  click: () => setSelectedCliente(cliente),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <p className="font-bold text-lg">{cliente.nome || 'Cliente'}</p>
                    <p className="text-sm text-slate-500">{cliente.distancia_km.toFixed(1)} km de distância</p>
                    <div className="mt-2 flex items-center gap-2">
                      {cliente.is_online ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: COLORS.CLIENTE }}>
                          <Wifi size={12} /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <WifiOff size={12} /> Offline
                        </span>
                      )}
                    </div>
                    {cliente.tem_pedido_pendente && (
                      <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#FF572220' }}>
                        <p className="text-sm font-bold" style={{ color: COLORS.PEDIDO_PENDENTE }}>
                          📦 Pedido #{cliente.pedido_id?.slice(-6)}
                        </p>
                        <p className="text-xs" style={{ color: COLORS.PEDIDO_PENDENTE }}>
                          {cliente.pedido_status}
                        </p>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Botão centralizar */}
          <button
            onClick={forcarAtualizacao}
            className="absolute bottom-28 right-4 p-3 bg-white rounded-full shadow-lg z-[400] hover:bg-slate-50"
          >
            <Crosshair size={20} className="text-blue-600" />
          </button>
        </div>

        {/* Lista de Clientes */}
        <div className={`rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} overflow-hidden`}>
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="font-bold flex items-center gap-2">
              <Users size={18} style={{ color: COLORS.CLIENTE }} />
              Clientes por Distância
            </h3>
          </div>

          {loading && (
            <div className="p-8 text-center">
              <Loader2 size={32} className="animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-slate-400">Buscando clientes...</p>
            </div>
          )}

          <div className="max-h-[35vh] overflow-y-auto">
            {clientesProximos.length === 0 && !loading && (
              <div className="p-8 text-center">
                <AlertCircle size={48} className="mx-auto mb-2 text-slate-400" />
                <p className="text-slate-400">Nenhum cliente em {raioKm}km</p>
              </div>
            )}

            {clientesProximos.map((cliente) => (
              <div
                key={cliente.user_id}
                onClick={() => setSelectedCliente(cliente)}
                className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors ${
                  isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50'
                } ${selectedCliente?.user_id === cliente.user_id ? (isDark ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: cliente.tem_pedido_pendente
                        ? `${COLORS.PEDIDO_PENDENTE}30`
                        : cliente.is_online
                        ? `${COLORS.CLIENTE}30`
                        : '#9E9E9E30'
                    }}
                  >
                    {cliente.tem_pedido_pendente ? (
                      <Package size={18} style={{ color: COLORS.PEDIDO_PENDENTE }} />
                    ) : (
                      <User size={18} style={{ color: cliente.is_online ? COLORS.CLIENTE : '#9E9E9E' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{cliente.nome || 'Cliente'}</p>
                    <p className="text-xs text-slate-400">{cliente.distancia_km.toFixed(1)} km</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {cliente.tem_pedido_pendente ? (
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: COLORS.PEDIDO_PENDENTE }}
                      >
                        Pedido
                      </span>
                    ) : cliente.is_online ? (
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: COLORS.CLIENTE }}
                      >
                        Online
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg text-xs bg-slate-600 text-white">
                        Offline
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Cliente */}
      {selectedCliente && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedCliente(null)}
        >
          <div
            className={`w-full max-w-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-3xl border shadow-2xl p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: selectedCliente.tem_pedido_pendente
                    ? `${COLORS.PEDIDO_PENDENTE}20`
                    : `${COLORS.CLIENTE}20`
                }}
              >
                <User size={24} style={{
                  color: selectedCliente.tem_pedido_pendente
                    ? COLORS.PEDIDO_PENDENTE
                    : COLORS.CLIENTE
                }} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{selectedCliente.nome || 'Cliente'}</h3>
                <p className="text-sm text-slate-400">{selectedCliente.distancia_km.toFixed(1)} km</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {selectedCliente.tem_pedido_pendente && (
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${COLORS.PEDIDO_PENDENTE}15`, border: `1px solid ${COLORS.PEDIDO_PENDENTE}30` }}
                >
                  <p className="font-bold" style={{ color: COLORS.PEDIDO_PENDENTE }}>
                    📦 Pedido #{selectedCliente.pedido_id?.slice(-8)}
                  </p>
                  <p className="text-sm capitalize" style={{ color: COLORS.PEDIDO_PENDENTE }}>
                    {selectedCliente.pedido_status}
                  </p>
                </div>
              )}

              <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <p className="text-xs text-slate-400 mb-1">Coordenadas</p>
                <p className="text-xs font-mono">
                  {selectedCliente.cliente_lat.toFixed(6)}, {selectedCliente.cliente_lng.toFixed(6)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedCliente(null)}
                className={`flex-1 py-3 rounded-xl font-bold ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              >
                Fechar
              </button>
              {selectedCliente.tem_pedido_pendente && (
                <button
                  onClick={() => {
                    setSelectedCliente(null);
                    setView('vendor-orders');
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white"
                  style={{ backgroundColor: COLORS.ROTA }}
                >
                  Ver Pedido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorMap;
