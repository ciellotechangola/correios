// hooks/usePedidosRealtime.ts — Schema V4 compliant
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Pedido, OrderStatus } from '../types';

interface UsePedidosRealtimeOptions {
  lojaId?: string;
  userId?: string;
  status?: OrderStatus[];
}

export function usePedidosRealtime({ lojaId, userId, status }: UsePedidosRealtimeOptions) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarPedidos = useCallback(async () => {
    if (!lojaId && !userId) return;

    let query = supabase
      .from('pedidos')
      .select('*, lojas(nome, logo, telefone, latitude, longitude), pedido_itens(*, produtos(*)), profiles(nome, telefone, avatar_url, lat, lng)');

    if (lojaId) {
      query = query.eq('loja_id', lojaId);
    } else if (userId) {
      query = query.eq('cliente_id', userId);
    }

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar pedidos:', error);
    } else {
      setPedidos(data || []);
    }
    setLoading(false);
  }, [lojaId, userId, status]);

  useEffect(() => {
    if (!lojaId && !userId) {
      setLoading(false);
      return;
    }

    carregarPedidos();

    const filter = lojaId ? `loja_id=eq.${lojaId}` : `cliente_id=eq.${userId}`;

    const channel = supabase
      .channel('pedidos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Buscar dados completos do novo pedido
            supabase
              .from('pedidos')
              .select('*, lojas(nome, logo, telefone, latitude, longitude), pedido_itens(*, produtos(*)), profiles(nome, telefone, avatar_url, lat, lng)')
              .eq('id', payload.new.id)
              .maybeSingle()
              .then(({ data }) => {
                if (data) {
                  setPedidos((prev) => [data as Pedido, ...prev]);
                }
              });
          } else if (payload.eventType === 'UPDATE') {
            setPedidos((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? { ...p, ...(payload.new as Pedido) } : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPedidos((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lojaId, userId, carregarPedidos]);

  const adicionarPedido = useCallback((pedido: Pedido) => {
    setPedidos((prev) => [pedido, ...prev]);
  }, []);

  const atualizarPedidoLocal = useCallback((pedidoId: string, updates: Partial<Pedido>) => {
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, ...updates } : p))
    );
  }, []);

  return { pedidos, loading, recarregar: carregarPedidos, adicionarPedido, atualizarPedidoLocal };
}
