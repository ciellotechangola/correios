// hooks/useChatRealtime.ts — Schema V4 compliant
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { enviarMensagem, getMensagensConversa } from '../services/database';
import type { Mensagem } from '../types';

interface UseChatRealtimeOptions {
  remetenteId: string | undefined;
  destinatarioId: string | undefined;
  lojaId?: string;
}

export function useChatRealtime({ remetenteId, destinatarioId, lojaId }: UseChatRealtimeOptions) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const carregarMensagens = useCallback(async () => {
    if (!remetenteId || !destinatarioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getMensagensConversa(remetenteId, destinatarioId, lojaId);
      setMensagens(data.map(m => ({ ...m, isMe: m.remetente_id === remetenteId })));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }, [remetenteId, destinatarioId, lojaId]);

  useEffect(() => {
    carregarMensagens();
  }, [carregarMensagens]);

  useEffect(() => {
    if (!remetenteId || !destinatarioId) return;

    const channel = supabase
      .channel(`chat-${remetenteId}-${destinatarioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `destinatario_id=eq.${remetenteId}`,
        },
        (payload) => {
          const msg = payload.new as Mensagem;
          // Verificar se é da conversa atual
          if (msg.remetente_id === destinatarioId || msg.destinatario_id === destinatarioId) {
            if (lojaId && msg.loja_id !== lojaId) return;
            setMensagens((prev) => [...prev, { ...msg, isMe: false }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [remetenteId, destinatarioId, lojaId]);

  const enviar = useCallback(async (conteudo: string, imagemUrl?: string, pedidoId?: string) => {
    if (!remetenteId || !destinatarioId || !conteudo.trim()) return null;

    setEnviando(true);
    try {
      const novaMensagem = await enviarMensagem({
        remetente_id: remetenteId,
        destinatario_id: destinatarioId,
        loja_id: lojaId || null,
        conteudo: conteudo.trim(),
        imagem_url: imagemUrl || null,
        pedido_id: pedidoId || null,
        data_expiracao: null,
      });

      setMensagens((prev) => [...prev, { ...novaMensagem, isMe: true }]);
      return novaMensagem;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return null;
    } finally {
      setEnviando(false);
    }
  }, [remetenteId, destinatarioId, lojaId]);

  const enviarImagem = useCallback(async (file: File) => {
    // Upload da imagem para Supabase Storage
    if (!remetenteId) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `chat-${remetenteId}-${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('chat-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Erro ao upload imagem:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from('chat-images')
      .getPublicUrl(fileName);

    return enviar('', publicUrl);
  }, [remetenteId, enviar]);

  const scrollToBottom = useCallback(() => {
    // Esta função deve ser chamada pelo componente
    return mensagens.length > 0 ? mensagens[mensagens.length - 1].id : null;
  }, [mensagens]);

  return {
    mensagens,
    loading,
    enviando,
    enviar,
    enviarImagem,
    recarregar: carregarMensagens,
    setMensagens,
    scrollToBottom,
  };
}
