// hooks/useRealtimeLocation.ts — Schema V4 compliant
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { updateLocation, marcarOffline } from '../services/database';
import type { UserRole } from '../types';

interface RealtimeLocation {
  id: string;
  user_id: string;
  nome: string;
  perfil: UserRole;
  lat: number;
  lng: number;
  distancia_km?: number;
  is_online: boolean;
  updated_at: string;
}

interface UseRealtimeLocationOptions {
  userId?: string;
  perfil?: UserRole;
  raioBusca?: number; // km
  atualizarIntervalo?: number; // ms
  ativo?: boolean;
}

export function useRealtimeLocation(options: UseRealtimeLocationOptions) {
  const {
    userId,
    perfil,
    raioBusca = 10,
    atualizarIntervalo = 5000,
    ativo = true
  } = options;

  const [minhasCoordenadas, setMinhasCoordenadas] = useState<{ lat: number; lng: number } | null>(null);
  const [proximos, setProximos] = useState<RealtimeLocation[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimoUpdate, setUltimoUpdate] = useState<Date | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Buscar entidades próximas via RPC
  const buscarProximos = useCallback(async (lat: number, lng: number) => {
    try {
      const targetPerfil = perfil === 'VENDEDOR' ? 'CLIENTE' : 'VENDEDOR';

      const { data, error: fnError } = await supabase.rpc('buscar_proximos', {
        p_referencia_lat: lat,
        p_referencia_lng: lng,
        p_raio_km: raioBusca,
        p_perfil: targetPerfil,
        p_provincia: null,
      });

      if (fnError) {
        console.warn('buscar_proximos erro:', fnError.message);
        setProximos([]);
        return;
      }

      setProximos((data || []) as RealtimeLocation[]);
    } catch (err) {
      console.error('Erro ao buscar próximos:', err);
      setProximos([]);
    }
  }, [raioBusca, perfil]);

  // Atualizar minha localização
  const atualizarMinhaLocalizacao = useCallback(async (lat: number, lng: number) => {
    if (!userId) return;

    try {
      await updateLocation(userId, lat, lng, 'MOBILE');
      setUltimoUpdate(new Date());
    } catch (err) {
      console.error('Erro ao atualizar localização:', err);
    }
  }, [userId]);

  // Iniciar tracking GPS
  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada');
      return;
    }

    if (!ativo || !userId) return;

    setIsTracking(true);
    setError(null);

    // Callback para cada posição
    const handlePosition = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const novasCoordenadas = { lat: latitude, lng: longitude };

      setMinhasCoordenadas(novasCoordenadas);

      // Debounce para evitar muitas atualizações
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(async () => {
        await atualizarMinhaLocalizacao(latitude, longitude);
        await buscarProximos(latitude, longitude);
      }, atualizarIntervalo);
    };

    // Obter posição inicial
    navigator.geolocation.getCurrentPosition(
      handlePosition,
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    // Iniciar watch contínuo
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => console.error('GPS erro:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    // Configurar Supabase Realtime para listen de mudanças
    if (perfil) {
      const targetPerfil = perfil === 'VENDEDOR' ? 'CLIENTE' : 'VENDEDOR';
      channelRef.current = supabase
        .channel(`localizacoes_${perfil.toLowerCase()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'localizacoes_tempo_real',
            filter: `tipo=eq.${targetPerfil}`,
          },
          () => {
            if (minhasCoordenadas) {
              buscarProximos(minhasCoordenadas.lat, minhasCoordenadas.lng);
            }
          }
        )
        .subscribe();
    }

  }, [userId, perfil, ativo, atualizarIntervalo, atualizarMinhaLocalizacao, buscarProximos, minhasCoordenadas]);

  // Parar tracking
  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (userId) {
      await marcarOffline(userId);
    }

    setIsTracking(false);
  }, [userId]);

  // Forçar atualização manual
  const forcarAtualizacao = useCallback(async () => {
    if (!navigator.geolocation || !userId) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMinhasCoordenadas({ lat: latitude, lng: longitude });
        await atualizarMinhaLocalizacao(latitude, longitude);
        await buscarProximos(latitude, longitude);
      },
      console.error,
      { enableHighAccuracy: true }
    );
  }, [userId, atualizarMinhaLocalizacao, buscarProximos]);

  // Auto-start quando userId muda
  useEffect(() => {
    if (ativo && userId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [ativo, userId, startTracking, stopTracking]);

  return {
    minhasCoordenadas,
    proximos,
    isTracking,
    error,
    ultimoUpdate,
    startTracking,
    stopTracking,
    forcarAtualizacao,
    buscarProximos,
    // Helpers
    vendedoresProximos: perfil === 'CLIENTE' ? proximos : [],
    clientesProximos: perfil === 'VENDEDOR' ? proximos : [],
  };
}

export default useRealtimeLocation;
