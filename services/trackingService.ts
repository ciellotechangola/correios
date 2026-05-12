/**
 * Serviço de Tracking em Tempo Real para Entregas
 * Integração completa: Cliente ↔ Loja ↔ Entregador
 * 
 * FUNCIONALIDADES:
 * - Atualizar GPS do entregador continuamente
 * - Escutar mudanças de status da entrega
 * - Obter tracking completo do pedido
 * - Aceitar/Completar entregas
 */

import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TrackingData {
  pedido: {
    id: string;
    status: string;
    tipo_entrega: string;
    created_at: string;
  };
  loja: {
    id: string;
    nome: string;
    lat: number;
    lng: number;
    endereco: string;
  } | null;
  cliente: {
    id: string;
    nome: string;
    telefone: string;
    avatar_url: string;
    lat: number;
    lng: number;
  } | null;
  entregador: {
    id: string;
    nome: string;
    telefone: string;
    avatar_url: string;
    lat: number;
    lng: number;
  } | null;
  entrega: {
    id: string;
    status: string;
    entregador_id: string;
    aceite_em: string;
    concluida_em: string;
  } | null;
}

export interface EntregaDisponivel {
  entrega_id: string;
  pedido_id: string;
  loja_nome: string;
  loja_lat: number;
  loja_lng: number;
  cliente_bairro: string;
  valor_total: number;
  distancia: number;
  created_at: string;
}

// ==========================================
// TRACKING DE PEDIDOS
// ==========================================

/**
 * Buscar tracking completo de um pedido
 * Retorna: loja, cliente, entregador (se existir)
 */
export const getTrackingCompleto = async (pedidoId: string): Promise<TrackingData | null> => {
  try {
    const { data, error } = await supabase.rpc('get_tracking_pedido_completo', {
      p_pedido_id: pedidoId,
    });

    if (error || !data) {
      console.error('Erro ao buscar tracking:', error);
      return null;
    }

    return data as TrackingData;
  } catch (error) {
    console.error('Erro em getTrackingCompleto:', error);
    return null;
  }
};

/**
 * Buscar entregas disponíveis para entregador
 * Opcional: filtrar por localização
 */
export const buscarEntregasDisponiveis = async (
  lat?: number,
  lng?: number,
  raioKm: number = 50
): Promise<EntregaDisponivel[]> => {
  try {
    const { data, error } = await supabase.rpc('buscar_entregas_disponiveis', {
      p_lat: lat || null,
      p_lng: lng || null,
      p_raio_km: raioKm,
    });

    if (error) {
      console.error('Erro ao buscar entregas:', error);
      return [];
    }

    return (data || []) as EntregaDisponivel[];
  } catch (error) {
    console.error('Erro em buscarEntregasDisponiveis:', error);
    return [];
  }
};

/**
 * Aceitar entrega (entregador)
 */
export const aceitarEntrega = async (
  entregaId: string,
  entregadorId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('aceitar_entrega', {
      p_entrega_id: entregaId,
      p_entregador_id: entregadorId,
    });

    if (error || !data?.success) {
      console.error('Erro ao aceitar entrega:', error);
      return {
        success: false,
        error: error?.message || 'Não foi possível aceitar a entrega',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro em aceitarEntrega:', error);
    return {
      success: false,
      error: 'Erro ao aceitar entrega',
    };
  }
};

/**
 * Completar entrega (entregador)
 */
export const completarEntrega = async (
  entregaId: string,
  entregadorId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('completar_entrega', {
      p_entrega_id: entregaId,
      p_entregador_id: entregadorId,
    });

    if (error || !data?.success) {
      console.error('Erro ao completar entrega:', error);
      return {
        success: false,
        error: error?.message || 'Não foi possível completar a entrega',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro em completarEntrega:', error);
    return {
      success: false,
      error: 'Erro ao completar entrega',
    };
  }
};

// ==========================================
// ATUALIZAÇÃO DE LOCALIZAÇÃO EM TEMPO REAL
// ==========================================

let updateInterval: number | null = null;
const UPDATE_INTERVAL_MS = 3000; // 3 segundos

/**
 * Iniciar tracking GPS contínuo do entregador
 * Atualiza localização a cada 3-5 segundos
 */
export const iniciarTrackingGPS = (
  userId: string,
  pedidoId: string,
  onUpdate?: (success: boolean) => void
): (() => void) => {
  let watchId: number | null = null;

  // Função para obter e enviar localização
  const updateLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocalização não suportada');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, speed, accuracy } = position.coords;

        // Validar coordenadas
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          console.warn('Coordenadas inválidas:', latitude, longitude);
          onUpdate?.(false);
          return;
        }

        // Enviar para o banco via função RPC
        const { data, error } = await supabase.rpc('update_location_with_history', {
          p_user_id: userId,
          p_latitude: latitude,
          p_longitude: longitude,
          p_tipo: 'ENTREGADOR',
          p_pedido_id: pedidoId,
          p_velocidade: speed || 0,
          p_precisao: accuracy || 10,
        });

        if (error) {
          console.error('Erro ao atualizar localização:', error);
          onUpdate?.(false);
        } else {
          onUpdate?.(true);
        }
      },
      (err) => {
        console.error('Erro GPS:', err);
        onUpdate?.(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );
  };

  // Primeira atualização imediata
  updateLocation();

  // Atualizações periódicas
  updateInterval = window.setInterval(updateLocation, UPDATE_INTERVAL_MS);

  // Também usar watchPosition para maior precisão
  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, speed, accuracy } = position.coords;

      if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        await supabase.rpc('update_location_with_history', {
          p_user_id: userId,
          p_latitude: latitude,
          p_longitude: longitude,
          p_tipo: 'ENTREGADOR',
          p_pedido_id: pedidoId,
          p_velocidade: speed || 0,
          p_precisao: accuracy || 10,
        });
      }
    },
    (err) => console.error('Watch error:', err),
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
    }
  );

  // Retornar função de cleanup
  return () => {
    if (updateInterval !== null) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
};

// ==========================================
// SUBSCRIÇÕES REALTIME
// ==========================================

/**
 * Subscrever atualizações de uma entrega específica
 * Callback recebe: novo status da entrega
 */
export const subscribeToEntrega = (
  entregaId: string,
  callback: (status: string) => void
): (() => void) => {
  const channel = supabase
    .channel(`entrega-${entregaId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'entregas',
        filter: `id=eq.${entregaId}`,
      },
      (payload) => {
        const newStatus = payload.new?.status;
        if (newStatus) {
          callback(newStatus);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscrever localizações em tempo real de um pedido
 * Callback recebe: array de localizações (cliente, loja, entregador)
 */
export const subscribeToLocalizacoesPedido = (
  pedidoId: string,
  callback: (locations: Array<{
    profile_id: string;
    nome: string;
    lat: number;
    lng: number;
    tipo: string;
    is_online: boolean;
  }>) => void
): (() => void) => {
  const channel = supabase
    .channel(`pedido-locations-${pedidoId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'localizacoes_tempo_real',
        filter: `pedido_id=eq.${pedidoId}`,
      },
      async () => {
        // Recarregar todas as localizações do pedido
        const { data } = await supabase
          .from('localizacoes_tempo_real')
          .select(`
            profile_id,
            latitude,
            longitude,
            tipo,
            is_online,
            profiles(nome)
          `)
          .eq('pedido_id', pedidoId)
          .eq('is_online', true);

        if (data) {
          callback(
            data.map((item: any) => ({
              profile_id: item.profile_id,
              nome: item.profiles?.nome || 'Usuário',
              lat: item.latitude,
              lng: item.longitude,
              tipo: item.tipo,
              is_online: item.is_online,
            }))
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscrever atualizações de status do pedido
 */
export const subscribeToPedidoStatus = (
  pedidoId: string,
  callback: (status: string) => void
): (() => void) => {
  const channel = supabase
    .channel(`pedido-status-${pedidoId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos',
        filter: `id=eq.${pedidoId}`,
      },
      (payload) => {
        const newStatus = payload.new?.status;
        if (newStatus) {
          callback(newStatus);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ==========================================
// UTILITÁRIOS
// ==========================================

/**
 * Calcular distância entre dois pontos (Haversine)
 */
export const calcularDistancia = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Estimar tempo de chegada baseado na distância e velocidade média
 */
export const estimarTempoChegada = (distanciaKm: number, velocidadeMediaKmh: number = 40): string => {
  const minutos = Math.round((distanciaKm / velocidadeMediaKmh) * 60);
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const minsRestantes = minutos % 60;
  return `${horas}h ${minsRestantes}m`;
};

// ==========================================
// EXPORTS
// ==========================================

export default {
  getTrackingCompleto,
  buscarEntregasDisponiveis,
  aceitarEntrega,
  completarEntrega,
  iniciarTrackingGPS,
  subscribeToEntrega,
  subscribeToLocalizacoesPedido,
  subscribeToPedidoStatus,
  calcularDistancia,
  estimarTempoChegada,
};
