// services/database.ts — Schema V5 (TABELA profiles CORRIGIDA)
import { supabase } from './supabaseClient';
import type {
  Usuario, Loja, Produto, Pedido, PedidoItem, Entrega, Mensagem,
  Avaliacao, Veiculo, LocalizacaoTempoReal, TrackingMapaData, TrackingPedidoCompleto,
  ClienteProximo, OrderStatus, TipoEntrega
} from '../types';

// ==================== AUTH & PROFILE ====================

export async function syncUserProfile(authUser: any): Promise<any> {
  // USA A TABELA CORRETA: profiles (não 'usuarios')
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: authUser.id,
      email: authUser.email,
      nome: authUser.user_metadata?.nome || authUser.email?.split('@')[0],
      avatar_url: authUser.user_metadata?.avatar_url,
      role: authUser.user_metadata?.role || 'CLIENTE',
      status_conta: 'ATIVO',
      is_online: true,
      provincia: authUser.user_metadata?.provincia || 'Luanda',
      cidade: authUser.user_metadata?.cidade || null,
      bairro: authUser.user_metadata?.bairro || null,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(updates: Partial<Usuario>): Promise<Usuario> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario nao autenticado');

  // USA A TABELA CORRETA: profiles
  const cleanUpdates = { ...updates };
  delete (cleanUpdates as any).deleted_at; // Proteção

  const { data, error } = await supabase
    .from('profiles')
    .update(cleanUpdates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== LOCALIZAÇÃO / GPS (REGRA: 5s DEBOUNCE) ====================

let lastUpdateTime = 0;
const DEBOUNCE_MS = 5000; // 5 segundos máximo conforme especificação

export async function updateLocation(
  userId: string,
  lat: number,
  lng: number,
  tipo: string = 'CLIENTE'
): Promise<boolean> {
  const now = Date.now();
  if (now - lastUpdateTime < DEBOUNCE_MS) {
    return false; // Ignorar chamada muito frequente
  }
  lastUpdateTime = now;

  try {
    // TENTAR via RPC (pode não existir ainda)
    const { data, error } = await supabase.rpc('update_location', {
      p_user_id: userId,
      p_latitude: lat,
      p_longitude: lng,
      p_tipo_localizacao: tipo,
    });

    if (error) {
      // Se RPC não existe (PGRST202), fazer UPDATE direto na tabela profiles
      if (error.code === 'PGRST202' || error.message?.includes('not found')) {
        console.log('update_location RPC não existe, usando UPDATE direto');
        await updateLocationDirect(userId, lat, lng, tipo);
        return true;
      }
      // Outro erro - não jogar, apenas logar
      console.warn('updateLocation RPC error:', error.code);
      return false;
    }
    return data as boolean;
  } catch (err) {
    // Erro de conexão ou outro - não causar loop
    console.warn('updateLocation exception:', err);
    return false;
  }
}

// UPDATE direto na tabela profiles (fallback quando RPC não existe)
async function updateLocationDirect(userId: string, lat: number, lng: number, tipo: string = 'CLIENTE'): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({
        lat: lat,
        lng: lng,
        ultima_localizacao_at: new Date().toISOString(),
        is_online: true,
      })
      .eq('id', userId);

    // Também atualizar localizacoes_tempo_real se existir
    await supabase
      .from('localizacoes_tempo_real')
      .upsert({
        profile_id: userId,
        latitude: lat,
        longitude: lng,
        tipo: tipo,
        is_online: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'profile_id' });
  } catch (err) {
    console.warn('updateLocationDirect error:', err);
  }
}

export async function marcarOffline(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('marcar_offline', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data as boolean;
}

// ==================== MAPAS / BUSCA ====================

export async function buscarProximos(
  lat: number,
  lng: number,
  raioKm: number = 10,
  perfil?: string,
  provincia?: string
): Promise<LocalizacaoTempoReal[]> {
  const { data, error } = await supabase.rpc('buscar_proximos', {
    p_referencia_lat: lat,
    p_referencia_lng: lng,
    p_raio_km: raioKm,
    p_perfil: perfil || null,
    p_provincia: provincia || null,
  });

  if (error) throw error;
  return (data || []) as LocalizacaoTempoReal[];
}

export async function buscarClientesParaVendedor(
  vendedorId: string,
  raioKm: number = 10
): Promise<ClienteProximo[]> {
  const { data, error } = await supabase.rpc('buscar_clientes_para_vendedor', {
    p_vendedor_id: vendedorId,
    p_raio_km: raioKm,
  });

  if (error) throw error;
  return (data || []) as ClienteProximo[];
}

export async function listarLojasPorProvincia(provincia: string): Promise<Loja[]> {
  // Buscar todas as lojas (abertas e fechadas) com coordenadas válidas
  const { data, error } = await supabase
    .from('lojas')
    .select('*')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('rating', { ascending: false });

  if (error) {
    console.error('listarLojasPorProvincia error:', error);
    throw error;
  }

  return (data || []) as Loja[];
}

// ==================== LOJAS ====================

export async function getLojasAtivas(): Promise<Loja[]> {
  // FILTRAR OBRIGATORIAMENTE por deleted_at IS NULL
  const { data, error } = await supabase
    .from('lojas')
    .select('*')
    .is('deleted_at', null)
    .eq('is_open', true)
    .order('nome');

  if (error) throw error;
  return (data || []) as Loja[];
}

export async function getMinhaLoja(userId: string): Promise<Loja | null> {
  const { data, error } = await supabase
    .from('lojas')
    .select('*')
    .eq('owner_id', userId)
    .is('deleted_at', null) // ← REGRA OBRIGATÓRIA
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Loja | null;
}

export async function updateLoja(lojaId: string, updates: Partial<Loja>): Promise<Loja> {
  // IMPORTANTE: coordenadas vao direto na tabela lojas

  const cleanUpdates = { ...updates };
  // Remover campos que não devem ser atualizados manualmente
  delete (cleanUpdates as any).id;
  delete (cleanUpdates as any).created_at;
  delete (cleanUpdates as any).deleted_at;

  const { data, error } = await supabase
    .from('lojas')
    .update(cleanUpdates)
    .eq('id', lojaId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Loja;
}

export async function createLoja(loja: Omit<Loja, 'id' | 'created_at'>): Promise<Loja> {
  // Inserir loja com coordenadas na tabela principal
  const { data, error } = await supabase
    .from('lojas')
    .insert(loja)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Loja;
}

// ==================== PRODUTOS (SOFT DELETE OBRIGATÓRIO) ====================

export async function getProdutosAtivos(lojaId?: string): Promise<(Produto & { lojas?: { nome: string; logo: string | null } })[]> {
  let query = supabase
    .from('produtos')
    .select('*, lojas(nome, logo)')
    .is('deleted_at', null) // ← REGRA OBRIGATÓRIA
    .gt('estoque', 0)
    .order('nome');

  if (lojaId) query = query.eq('loja_id', lojaId);

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as (Produto & { lojas?: { nome: string; logo: string | null } })[];
}

export async function getProdutosLoja(lojaId: string): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('loja_id', lojaId)
    .is('deleted_at', null) // ← REGRA OBRIGATÓRIA
    .order('nome');

  if (error) throw error;
  return (data || []) as Produto[];
}

export async function createProduto(produto: Omit<Produto, 'id' | 'created_at'>): Promise<Produto> {
  const { data, error } = await supabase
    .from('produtos')
    .insert(produto)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Produto;
}

export async function updateProduto(produtoId: string, updates: Partial<Produto>): Promise<Produto> {
  const { data, error } = await supabase
    .from('produtos')
    .update(updates)
    .eq('id', produtoId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Produto;
}

// SOFT DELETE OBRIGATÓRIO - NUNCA DELETE físico
export async function softDeleteProduto(produtoId: string): Promise<void> {
  const { error } = await supabase
    .from('produtos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', produtoId);

  if (error) throw error;
}

export async function softDeleteLoja(lojaId: string): Promise<void> {
  const { error } = await supabase
    .from('lojas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', lojaId);

  if (error) throw error;
}

export async function softDeleteUsuario(userId: string): Promise<void> {
  // USA A TABELA CORRETA: profiles
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

// ==================== PEDIDOS (inserção direta com cliente_id) ====================
export async function criarPedido(
  clienteId: string,
  lojaId: string,
  valorTotal: number,
  tipoEntrega: TipoEntrega = 'RETIRADA',
  enderecoEntrega?: string
): Promise<{ success: boolean; pedido_id: string | null; codigo_rastreamento: string | null; entrega_id?: string }> {
  try {
    // Busca coordenadas do cliente - USA A TABELA CORRETA: profiles
    // USAR .maybeSingle() para evitar erro se cliente não existir
    const { data: cliente } = await supabase
    .from('profiles')
    .select('lat, lng')
    .eq('id', clienteId)
    .maybeSingle();

  // Busca coordenadas da loja - USAR .maybeSingle() para evitar erro
    const { data: loja, error: lojaError } = await supabase
      .from('lojas')
      .select('latitude, longitude, lat, lng, provincia, deleted_at')
      .eq('id', lojaId)
      .is('deleted_at', null)
      .maybeSingle();

    if (lojaError) {
      console.error('Erro ao buscar loja:', lojaError);
    }
    
    if (!loja) {
      throw new Error('Loja não encontrada ou inativa');
    }

    // Gerar código de rastreamento
    const codigoRastreamento = 'CL-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Inserir pedido - SEM .single() para evitar erro
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: clienteId,
        loja_id: lojaId,
        status: 'PENDENTE',
        tipo_entrega: tipoEntrega,
        endereco_entrega: enderecoEntrega || null,
        valor_total: valorTotal,
        cliente_lat: cliente?.lat || null,
        cliente_lng: cliente?.lng || null,
        loja_lat: loja.latitude || loja.lat || null,
        loja_lng: loja.longitude || loja.lng || null,
        provincia: loja.provincia || null,
        codigo_rastreamento: codigoRastreamento,
      })
      .select('id, codigo_rastreamento');

    if (pedidoError) {
      console.error('criarPedido error:', pedidoError);
      throw pedidoError;
    }

    if (!pedidoData || pedidoData.length === 0) {
      throw new Error('Erro ao criar pedido: dados não retornados');
    }

    const pedidoId = pedidoData[0].id;
    const codigoRastreamentoRetornado = pedidoData[0].codigo_rastreamento;

    // CRIA REGISTRO DE ENTREGA AUTOMATICAMENTE PARA TIPO ENTREGA
    let entregaId: string | undefined;
    if (tipoEntrega === 'ENTREGA') {
      try {
        const { data: entregaData, error: entregaError } = await supabase
          .from('entregas')
          .insert({
            pedido_id: pedidoId,
            entregador_id: null,
            status: 'AGUARDANDO',
            latitude: cliente?.lat || null,
            longitude: cliente?.lng || null,
          })
          .select('id');

        if (entregaError) {
          console.error('Erro ao criar registro de entrega:', entregaError);
        } else if (entregaData && entregaData.length > 0) {
          entregaId = entregaData[0].id;
          console.log('Registro de entrega criado:', entregaId);
        }
      } catch (err) {
        console.error('Erro ao criar registro de entrega:', err);
      }
    }

    return {
      success: true,
      pedido_id: pedidoId,
      codigo_rastreamento: codigoRastreamentoRetornado,
      entrega_id: entregaId,
    };
  } catch (error: any) {
    console.error('criarPedido error:', error);
    return {
      success: false,
      pedido_id: null,
      codigo_rastreamento: null,
    };
  }
}

export async function atualizarStatusPedido(
  pedidoId: string,
  novoStatus: OrderStatus,
  userId: string
): Promise<{ success: boolean; pedido_id: string; status: OrderStatus }> {
  const { data, error } = await supabase.rpc('atualizar_status_pedido', {
    p_pedido_id: pedidoId,
    p_novo_status: novoStatus,
    p_user_id: userId,
  });

  if (error) throw error;
  return data as { success: boolean; pedido_id: string; status: OrderStatus };
}

export async function getMeusPedidosCliente(userId: string): Promise<Pedido[]> {
  // USA A TABELA CORRETA: profiles
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, lojas(nome, logo, telefone, latitude, longitude, lat, lng)')
    .eq('cliente_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Pedido[];
}

export async function getPedidosLoja(lojaId: string): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, profiles(nome, telefone, avatar_url, lat, lng)')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Pedido[];
}

export async function getPedidoPorId(pedidoId: string): Promise<Pedido | null> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, lojas(*), profiles(nome, telefone, avatar_url, lat, lng)')
    .eq('id', pedidoId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Pedido | null;
}

// ==================== PEDIDO ITENS ====================

export async function adicionarPedidoItem(item: Omit<PedidoItem, 'id'>): Promise<PedidoItem> {
  const { data, error } = await supabase
    .from('pedido_itens')
    .insert(item)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as PedidoItem;
}

// ==================== TRACKING / MAPAS ====================

export async function getDadosTrackingMapa(pedidoId: string): Promise<TrackingMapaData[]> {
  const { data, error } = await supabase.rpc('get_dados_tracking_mapa', {
    p_pedido_id: pedidoId,
  });

  if (error) throw error;
  return (data || []) as TrackingMapaData[];
}

export async function getTrackingPedido(pedidoId: string): Promise<TrackingPedidoCompleto | null> {
  const { data, error } = await supabase.rpc('get_tracking_pedido', {
    p_pedido_id: pedidoId,
  });

  if (error) throw error;
  return data as TrackingPedidoCompleto | null;
}

// ==================== ENTREGAS ====================

export async function getEntregaPorPedido(pedidoId: string): Promise<Entrega | null> {
  const { data, error } = await supabase
    .from('entregas')
    .select('*')
    .eq('pedido_id', pedidoId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Entrega | null;
}

export async function criarEntrega(entrega: Omit<Entrega, 'id' | 'created_at'>): Promise<Entrega> {
  const { data, error } = await supabase
    .from('entregas')
    .insert(entrega)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Entrega;
}

export async function atualizarEntrega(entregaId: string, updates: Partial<Entrega>): Promise<Entrega> {
  const { data, error } = await supabase
    .from('entregas')
    .update(updates)
    .eq('id', entregaId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Entrega;
}

// ==================== MENSAGENS ====================

export async function getMensagensConversa(
  userId1: string,
  userId2: string,
  lojaId?: string
): Promise<Mensagem[]> {
  let query = supabase
    .from('mensagens')
    .select('*')
    .or(`and(remetente_id.eq.${userId1},destinatario_id.eq.${userId2}),and(remetente_id.eq.${userId2},destinatario_id.eq.${userId1})`)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (lojaId) query = query.eq('loja_id', lojaId);

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Mensagem[];
}

export async function enviarMensagem(mensagem: Omit<Mensagem, 'id' | 'created_at'>): Promise<Mensagem> {
  const { data, error } = await supabase
    .from('mensagens')
    .insert(mensagem)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Mensagem;
}

// ==================== FAVORITOS ====================

export async function toggleFavorito(
  userId: string,
  lojaId?: string,
  produtoId?: string
): Promise<{ favoritado: boolean; data?: any }> {
  if (!lojaId && !produtoId) throw new Error('Informe lojaId ou produtoId');

  const { data: existente } = await supabase
    .from('favoritos')
    .select('id')
    .eq('profile_id', userId)
    .eq(lojaId ? 'loja_id' : 'produto_id', (lojaId || produtoId)!)
    .maybeSingle();

  if (existente) {
    await supabase.from('favoritos').delete().eq('id', existente.id);
    return { favoritado: false };
  } else {
    const { data, error } = await supabase
      .from('favoritos')
      .insert({
        profile_id: userId,
        loja_id: lojaId || null,
        produto_id: produtoId || null
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return { favoritado: true, data };
  }
}

// ==================== AVALIAÇÕES ====================

export async function criarAvaliacao(avaliacao: Omit<Avaliacao, 'id' | 'created_at'>): Promise<Avaliacao> {
  const { data, error } = await supabase
    .from('avaliacoes')
    .insert(avaliacao)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Avaliacao;
}

export async function getAvaliacoesLoja(lojaId: string): Promise<Avaliacao[]> {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*, profiles(nome, avatar_url)')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Avaliacao[];
}

// ==================== VEÍCULOS ====================

export async function getVeiculosUsuario(userId: string): Promise<Veiculo[]> {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Veiculo[];
}

export async function createVeiculo(veiculo: Omit<Veiculo, 'id' | 'created_at'>): Promise<Veiculo> {
  const { data, error } = await supabase
    .from('veiculos')
    .insert(veiculo)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Veiculo;
}

// ==================== ENTREGAS (FUNÇÕES COMPLEMENTARES) ====================

/**
 * Buscar entregas disponíveis para entregador
 */
export async function getEntregasDisponiveis(): Promise<Entrega[]> {
  const { data, error } = await supabase
    .from('entregas')
    .select('*, pedidos(valor_total, codigo_rastreamento, endereco_entrega, cliente_lat, cliente_lng)')
    .eq('status', 'AGUARDANDO')
    .is('entregador_id', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as Entrega[];
}

/**
 * Buscar entregas ativas do entregador
 */
export async function getEntregasAtivas(entregadorId: string): Promise<Entrega[]> {
  const { data, error } = await supabase
    .from('entregas')
    .select('*, pedidos(valor_total, codigo_rastreamento, endereco_entrega, cliente_lat, cliente_lng)')
    .eq('entregador_id', entregadorId)
    .eq('status', 'A_CAMINHO')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Entrega[];
}

/**
 * Aceitar uma entrega
 */
export async function aceitarEntrega(entregaId: string, entregadorId: string): Promise<Entrega> {
  const { data, error } = await supabase
    .from('entregas')
    .update({
      entregador_id: entregadorId,
      status: 'A_CAMINHO',
      updated_at: new Date().toISOString(),
    })
    .eq('id', entregaId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Entrega;
}

/**
 * Atualizar status da entrega
 */
export async function atualizarStatusEntrega(
  entregaId: string,
  novoStatus: string
): Promise<Entrega> {
  const { data, error } = await supabase
    .from('entregas')
    .update({
      status: novoStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entregaId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Entrega;
}

/**
 * Buscar histórico de entregas do entregador
 */
export async function getHistoricoEntregas(entregadorId: string): Promise<Entrega[]> {
  const { data, error } = await supabase
    .from('entregas')
    .select('*, pedidos(valor_total, codigo_rastreamento)')
    .eq('entregador_id', entregadorId)
    .eq('status', 'ENTREGUE')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Entrega[];
}

// ==================== MAPPERS ====================

export function mapUsuarioToUser(usuario: Usuario): any {
  return {
    id: usuario.id,
    name: usuario.nome || usuario.email.split('@')[0],
    email: usuario.email,
    role: usuario.role,
    avatarUrl: usuario.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nome || 'U')}&background=random`,
    telefone: usuario.telefone || undefined,
    provincia: usuario.provincia,
    cidade: usuario.cidade,
    bairro: usuario.bairro,
    lat: usuario.lat || undefined,
    lng: usuario.lng || undefined,
    is_online: usuario.is_online,
    status_conta: usuario.status_conta,
  };
}

export function mapLojaToStore(loja: any): any {
  return {
    id: loja.id,
    userId: loja.owner_id || loja.profile_id,
    name: loja.nome,
    nif: loja.nif || '',
    niche: loja.nicho,
    rating: Number(loja.rating) || 0,
    reviewCount: loja.review_count || 0,
    address: loja.endereco || loja.endereco_completo || 'Luanda, Angola',
    lat: loja.latitude || loja.lat || -8.839988,
    lng: loja.longitude || loja.lng || 13.289437,
    isOpen: loja.is_open ?? true,
    coverImage: loja.cover_image || 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800',
    logo: loja.logo || 'https://cdn-icons-png.flaticon.com/512/1048/1048339.png',
    isVerified: loja.is_verified ?? false,
    responseTime: loja.response_time || '30 min',
    salesCount: loja.vendas_count || 0,
    badges: loja.badges || [],
    description: loja.descricao || '',
    phone: loja.telefone || '',
    provincia: loja.provincia,
    cidade: loja.cidade,
    bairro: loja.bairro,
  };
}
