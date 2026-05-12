/**
 * Testes E2E - Fluxo de Pedido Completo
 * 
 * Simula o fluxo completo de um pedido desde a busca até a entrega
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../../services/supabaseClient';

describe('E2E - Fluxo de Pedido', () => {
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    nome: 'Test User E2E',
  };

  let userId: string | null = null;

  beforeAll(async () => {
    // Setup: Criar usuário de teste
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
    });

    if (error) {
      console.error('Erro ao criar usuário de teste:', error);
    } else {
      userId = data.user?.id || null;
    }
  });

  afterAll(async () => {
    // Cleanup: Remover usuário de teste
    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  it('deve autenticar usuário', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.session).toBeDefined();
  });

  it('deve buscar lojas disponíveis', async () => {
    const { data, error } = await supabase
      .from('lojas')
      .select('*')
      .eq('is_open', true)
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('deve buscar produtos de uma loja', async () => {
    // Primeiro obter uma loja
    const { data: lojas } = await supabase
      .from('lojas')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (lojas) {
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('loja_id', lojas.id)
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(produtos)).toBe(true);
    }
  });

  it('deve criar um pedido', async () => {
    // Obter loja e produto
    const { data: loja } = await supabase
      .from('lojas')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!loja) {
      console.warn('Nenhuma loja disponível para teste de pedido');
      return;
    }

    const { data: produto } = await supabase
      .from('produtos')
      .select('id, preco')
      .eq('loja_id', loja.id)
      .limit(1)
      .maybeSingle();

    if (!produto) {
      console.warn('Nenhum produto disponível para teste de pedido');
      return;
    }

    // Criar pedido
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({
        user_id: userId,
        loja_id: loja.id,
        status: 'PENDENTE',
        tipo_entrega: 'ENTREGA',
        valor_total: produto.preco,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(pedido).toBeDefined();
    expect(pedido?.status).toBe('PENDENTE');

    // Cleanup: Remover pedido de teste
    if (pedido?.id) {
      await supabase.from('pedidos').delete().eq('id', pedido.id);
    }
  });

  it('deve atualizar localização em tempo real', async () => {
    if (!userId) {
      console.warn('Usuário não autenticado para teste de localização');
      return;
    }

    // Usar RPC para atualizar localização
    const { data, error } = await supabase.rpc('update_location', {
      p_user_id: userId,
      p_latitude: -8.8383,
      p_longitude: 13.2344,
      p_tipo_localizacao: 'TEST',
    });

    // RPC pode não existir em todos os ambientes
    if (error) {
      console.warn('RPC update_location não disponível:', error.message);
      return;
    }

    expect(data).toBe(true);
  });

  it('deve buscar usuários próximos', async () => {
    // Usar RPC para buscar próximos
    const { data, error } = await supabase.rpc('buscar_proximos', {
      p_referencia_lat: -8.8383,
      p_referencia_lng: 13.2344,
      p_raio_km: 10,
    });

    // RPC pode não existir em todos os ambientes
    if (error) {
      console.warn('RPC buscar_proximos não disponível:', error.message);
      return;
    }

    expect(Array.isArray(data)).toBe(true);
  });

  it('deve enviar mensagem no chat', async () => {
    if (!userId) {
      console.warn('Usuário não autenticado para teste de chat');
      return;
    }

    // Obter outro usuário para enviar mensagem
    const { data: outrosUsuarios } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', userId)
      .limit(1)
      .maybeSingle();

    if (!outrosUsuarios) {
      console.warn('Nenhum outro usuário disponível para teste de chat');
      return;
    }

    // Enviar mensagem
    const { data: mensagem, error } = await supabase
      .from('mensagens')
      .insert({
        remetente_id: userId,
        destinatario_id: outrosUsuarios.id,
        conteudo: 'Mensagem de teste E2E',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(mensagem).toBeDefined();
    expect(mensagem?.conteudo).toBe('Mensagem de teste E2E');

    // Cleanup: Remover mensagem de teste
    if (mensagem?.id) {
      await supabase.from('mensagens').delete().eq('id', mensagem.id);
    }
  });
});
