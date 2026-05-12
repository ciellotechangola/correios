/**
 * Serviço de Rastreamento em Tempo Real via Supabase
 * Responsável por: atualizar localização, subscrever posições, buscar entidades próximas
 * Preserva toda a estrutura existente do projeto
 */

import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { calculateDistance } from './googleMaps';

export type EntityType = 'cliente' | 'vendedor' | 'loja' | 'entregador';
export type TrackingStatus = 'online' | 'offline' | 'busy';

export interface TrackingEntity {
  id: string;
  userId: string;
  nome: string;
  lat: number;
  lng: number;
  perfil: EntityType;
  isOnline: boolean;
  pedidoId?: string;
  updatedAt: string;
  avatarUrl?: string;
  metadata?: Record<string, any>;
}

export interface OrderWithTracking {
  id: string;
  userId: string;
  storeId: string;
  status: string;
  clienteLocation?: { lat: number; lng: number };
  vendedorLocation?: { lat: number; lng: number };
  entregadorLocation?: { lat: number; lng: number };
  rota?: google.maps.DirectionsResult;
}

// ==========================================
// ATUALIZAÇÃO DE LOCALIZAÇÃO
// ==========================================

let updateInProgress = false;
let pendingUpdate: { userId: string; lat: number; lng: number; perfil: EntityType; pedidoId?: string } | null = null;

/**
 * Atualizar localização do usuário com debounce (3-5s)
 * Usa upsert para evitar duplicatas
 */
export const updateLocation = async (
  userId: string,
  lat: number,
  lng: number,
  perfil: EntityType,
  pedidoId?: string
): Promise<boolean> => {
  if (updateInProgress) {
    pendingUpdate = { userId, lat, lng, perfil, pedidoId };
    return false;
  }

  updateInProgress = true;

  try {
    // Validar coordenadas
    if (!isValidCoordinates(lat, lng)) {
      console.error('Coordenadas inválidas:', lat, lng);
      return false;
    }

    const { error } = await supabase
      .from('localizacoes_tempo_real')
      .upsert({
        profile_id: userId,
        latitude: lat,
        longitude: lng,
        tipo: perfil.toUpperCase(),
        is_online: true,
        pedido_id: pedidoId || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'profile_id'
      });

    if (error) {
      console.error('Erro ao atualizar localização:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro em updateLocation:', error);
    return false;
  } finally {
    updateInProgress = false;

    // Processar update pendente se houver
    setTimeout(() => {
      if (pendingUpdate) {
        const { userId, lat, lng, perfil, pedidoId } = pendingUpdate;
        pendingUpdate = null;
        updateLocation(userId, lat, lng, perfil, pedidoId);
      }
    }, 3000);
  }
};

/**
 * Marcar usuário como offline
 */
export const setOffline = async (userId: string): Promise<void> => {
  try {
    await supabase
      .from('localizacoes_tempo_real')
      .update({ is_online: false, updated_at: new Date().toISOString() })
      .eq('profile_id', userId);
  } catch (error) {
    console.error('Erro ao marcar offline:', error);
  }
};

// ==========================================
// BUSCA DE ENTIDADES PRÓXIMAS
// ==========================================

interface NearbyFilter {
  perfis?: EntityType[];
  maxDistance?: number; // km
  pedidoId?: string;
  onlyOnline?: boolean;
}

/**
 * Buscar entidades próximas a uma localização
 * Combina busca do Supabase + filtro de distância
 */
export const buscarProximos = async (
  centerLat: number,
  centerLng: number,
  filters: NearbyFilter = {}
): Promise<TrackingEntity[]> => {
  const { perfis, maxDistance = 10, pedidoId, onlyOnline = true } = filters;

  try {
    // Buscar todas as localizações ativas
    let query = supabase
      .from('localizacoes_tempo_real')
      .select(`
        *,
        profiles(id, nome, avatar_url, role)
      `);

    if (onlyOnline) {
      query = query.eq('is_online', true);
    }

    if (pedidoId) {
      query = query.eq('pedido_id', pedidoId);
    }

    if (perfis && perfis.length > 0) {
      query = query.in('tipo', perfis.map(p => p.toUpperCase()));
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar próximos:', error);
      return [];
    }

    // Mapear e calcular distâncias
    const entities: TrackingEntity[] = (data || [])
      .map(item => {
        const lat = item.lat || item.latitude;
        const lng = item.lng || item.longitude;

        return {
          id: item.id,
          userId: item.profile_id,
          nome: item.nome || item.profiles?.nome || 'Usuário',
          lat,
          lng,
          perfil: (item.tipo?.toLowerCase() || 'cliente') as EntityType,
          isOnline: item.is_online ?? true,
          pedidoId: item.pedido_id,
          updatedAt: item.updated_at || item.created_at,
          avatarUrl: item.profiles?.avatar_url,
          metadata: item,
        };
      })
      .filter(entity => isValidCoordinates(entity.lat, entity.lng));

    // Filtrar por distância
    const withinDistance = entities.filter(entity => {
      const distance = calculateDistance(
        { lat: centerLat, lng: centerLng },
        { lat: entity.lat, lng: entity.lng }
      );
      entity.metadata = { ...entity.metadata, distance };
      return distance <= maxDistance;
    });

    // Ordenar por distância
    return withinDistance.sort((a, b) =>
      (a.metadata?.distance || 0) - (b.metadata?.distance || 0)
    );

  } catch (error) {
    console.error('Erro em buscarProximos:', error);
    return [];
  }
};

/**
 * Buscar lojas próximas (wrapper especializado)
 */
export const buscarLojasProximas = async (
  lat: number,
  lng: number,
  maxDistance: number = 10
): Promise<TrackingEntity[]> => {
  return buscarProximos(lat, lng, { perfis: ['loja', 'vendedor'], maxDistance });
};

/**
 * Buscar clientes próximos (para vendedores)
 */
export const buscarClientesProximos = async (
  lat: number,
  lng: number,
  maxDistance: number = 15
): Promise<TrackingEntity[]> => {
  return buscarProximos(lat, lng, { perfis: ['cliente'], maxDistance });
};

// ==========================================
// SUBSCRIÇÕES REALTIME
// ==========================================

type LocationCallback = (entities: TrackingEntity[]) => void;

const activeSubscriptions: Map<string, { channel: RealtimeChannel; callback: LocationCallback }> = new Map();

/**
 * Subscrever atualizações de localização em tempo real
 * Usa Supabase Realtime
 */
export const subscribeToLocations = (
  filters: {
    perfis?: EntityType[];
    pedidoId?: string;
    onlyOnline?: boolean;
  },
  callback: LocationCallback
): (() => void) => {
  const subscriptionKey = JSON.stringify(filters);

  // Remover subscrição existente se houver
  if (activeSubscriptions.has(subscriptionKey)) {
    const existing = activeSubscriptions.get(subscriptionKey)!;
    existing.channel.unsubscribe();
    activeSubscriptions.delete(subscriptionKey);
  }

  // Criar canal Realtime
  const channel = supabase
    .channel(`locations-${subscriptionKey}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'localizacoes_tempo_real',
      },
      async (payload) => {
        // Recarregar dados atualizados
        const { new: record } = payload;
        if (!record) return;

        const lat = record.lat || record.latitude;
        const lng = record.lng || record.longitude;

        if (!isValidCoordinates(lat, lng)) return;

        // Buscar dados atualizados
        const entities = await buscarProximos(lat, lng, filters);
        callback(entities);
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Status: ${status}`);
    });

  activeSubscriptions.set(subscriptionKey, { channel, callback });

  // Retornar função de cleanup
  return () => {
    channel.unsubscribe();
    activeSubscriptions.delete(subscriptionKey);
  };
};

/**
 * Subscrever localizações por pedido específico
 */
export const subscribeToOrderLocations = (
  pedidoId: string,
  callback: (locations: TrackingEntity[]) => void
): (() => void) => {
  const channel = supabase
    .channel(`order-${pedidoId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'localizacoes_tempo_real',
        filter: `pedido_id=eq.${pedidoId}`,
      },
      async (payload) => {
        const { new: record } = payload;
        if (!record) return;

        const { data } = await supabase
          .from('localizacoes_tempo_real')
          .select(`*, profiles(nome, avatar_url)`)
          .eq('pedido_id', pedidoId)
          .eq('is_online', true);

        const entities: TrackingEntity[] = (data || []).map(item => ({
          id: item.id,
          userId: item.profile_id,
          nome: item.nome || item.profiles?.nome || 'Usuário',
          lat: item.lat || item.latitude,
          lng: item.lng || item.longitude,
          perfil: (item.tipo?.toLowerCase() || 'cliente') as EntityType,
          isOnline: item.is_online ?? true,
          pedidoId: item.pedido_id,
          updatedAt: item.updated_at || item.created_at,
          avatarUrl: item.profiles?.avatar_url,
          metadata: item,
        }));

        callback(entities);
      }
    )
    .subscribe();

  return () => channel.unsubscribe();
};

// ==========================================
// TRACKING DE PEDIDOS
// ==========================================

export interface PedidoAtivo {
  id: string;
  clienteId: string;
  vendedorId: string;
  lojaId: string;
  entregadorId?: string;
  status: 'pending' | 'accepted' | 'in_transit' | 'completed' | 'cancelled';
  clienteLocation?: { lat: number; lng: number };
  vendedorLocation?: { lat: number; lng: number };
  entregadorLocation?: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
}

/**
 * Buscar pedidos ativos com localização
 */
export const buscarPedidosAtivos = async (
  userId: string,
  perfil: EntityType
): Promise<PedidoAtivo[]> => {
  try {
    let query = supabase
      .from('pedidos')
      .select(`
        *,
        localizacoes_tempo_real!pedido_id(*)
      `)
      .in('status', ['PENDENTE', 'PAGO', 'PREPARANDO', 'EM_ROTA']);

    if (perfil === 'cliente') {
      query = query.eq('cliente_id', userId);
    } else if (perfil === 'vendedor') {
      query = query.eq('loja_id',
        supabase.from('lojas').select('id').eq('owner_id', userId)
      );
    } else if (perfil === 'entregador') {
      query = query.or(`entregador_id.eq.${userId},entregador_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      clienteId: p.cliente_id,
      vendedorId: p.loja_id,
      lojaId: p.loja_id,
      entregadorId: p.entregador_id,
      status: mapStatus(p.status),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

  } catch (error) {
    console.error('Erro em buscarPedidosAtivos:', error);
    return [];
  }
};

const mapStatus = (status: string): PedidoAtivo['status'] => {
  const statusMap: Record<string, PedidoAtivo['status']> = {
    'PENDENTE': 'pending',
    'PAGO': 'accepted',
    'PREPARANDO': 'accepted',
    'EM_ROTA': 'in_transit',
    'ENTREGUE': 'completed',
    'CANCELADO': 'cancelled',
  };
  return statusMap[status] || 'pending';
};

// ==========================================
// UTILITÁRIOS
// ==========================================

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

/**
 * Calcular bearing (direção) entre dois pontos
 * Útil para rotacionar markers na direção do movimento
 */
export const calculateBearing = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number => {
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dLon = (to.lng - from.lng) * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

/**
 * Interpolação linear de coordenadas (suavização de movimento)
 */
export const lerp = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  t: number // 0 a 1
): { lat: number; lng: number } => {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
};

// ==========================================
// EXPORTS
// ==========================================

export default {
  updateLocation,
  setOffline,
  buscarProximos,
  buscarLojasProximas,
  buscarClientesProximos,
  subscribeToLocations,
  subscribeToOrderLocations,
  buscarPedidosAtivos,
  calculateBearing,
  lerp,
};
