/**
 * Mappers Centralizados - Correios de Luanda
 * Data: 2026-04-30
 * 
 *用法:
 * import { mapStore, mapPart, mapUser, mapOrder } from '../utils/mappers';
 */

import type { 
  User, Store, Part, Order, CartItem, Car, 
  UserRole, OrderStatus, ChatMessage 
} from '../types';

// ============================================
// MAPPER: Usuario
// ============================================

export const mapUser = (u: any, car?: Car, storeId?: string): User => ({
  id: u.id,
  name: u.nome || u.email.split('@')[0],
  email: u.email,
  role: (u.role as UserRole) || 'CLIENTE',
  avatarUrl: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome || u.email)}&background=random`,
  telefone: u.telefone || undefined,
  car,
  storeId,
  provincia: u.provincia || null,
  cidade: u.cidade || null,
  bairro: u.bairro || null,
  lat: u.lat || null,
  lng: u.lng || null,
  is_online: u.is_online || false,
  status_conta: u.status_conta || 'ATIVO',
});

// ============================================
// MAPPER: Loja
// ============================================

export const mapStore = (s: any): Store => ({
  id: s.id,
  userId: s.owner_id || s.user_id,
  name: s.nome || 'Loja sem nome',
  nif: s.nif || '',
  niche: (s.nicho as Store['niche']) || 'Universal',
  rating: Number(s.rating) || 0,
  reviewCount: s.review_count || 0,
  address: s.endereco || 'Luanda, Angola',
  distance: 'N/A',
  lat: s.latitude || s.lat || -8.839988,
  lng: s.longitude || s.lng || 13.289437,
  isOpen: s.is_open ?? true,
  coverImage: s.cover_image || 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800',
  logo: s.logo || 'https://cdn-icons-png.flaticon.com/512/1048/1048339.png',
  isVerified: s.is_verified ?? false,
  responseTime: s.response_time || '30 min',
  salesCount: s.vendas_count || 0,
  badges: s.badges || [],
  description: s.descricao || '',
  phone: s.telefone || '',
  provincia: s.provincia || null,
  cidade: s.cidade || null,
  bairro: s.bairro || null,
});

// ============================================
// MAPPER: Produto/Peça
// ============================================

export const mapPart = (p: any): Part => ({
  id: p.id,
  storeId: p.loja_id,
  name: p.nome || 'Produto sem nome',
  description: p.descricao || '',
  price: Number(p.preco) || 0,
  isOriginal: p.is_original ?? false,
  condition: (p.condicao as Part['condition']) || 'Novo',
  brand: p.marca || 'Universal',
  compatibleModels: p.modelos_compativeis || [],
  imageUrl: p.imagem_url || 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600',
  category: p.categoria || 'Motor',
  location: p.localizacao || 'Luanda',
  year: p.ano || undefined,
  engineType: p.tipo_motor || 'All',
  isPromo: p.is_promo ?? false,
  isNew: p.is_new ?? false,
  stock: p.estoque || 0,
  modelo: p.modelo || '',
  ano: p.ano || undefined,
});

// ============================================
// MAPPER: Pedido
// ============================================

export const mapOrder = (o: any, pedidoItens?: any[]): Order => ({
  id: o.id,
  userId: o.user_id,
  storeId: o.loja_id,
  total: Number(o.valor_total) || 0,
  status: (o.status as OrderStatus) || 'PENDENTE',
  date: new Date(o.created_at).toLocaleDateString('pt-AO'),
  items: (pedidoItens || o.pedido_itens || []).map((item: any) => ({
    id: item.produto_id,
    name: item.produtos?.nome || 'Produto',
    price: Number(item.preco),
    quantity: item.quantidade,
    imageUrl: item.produtos?.imagem_url || 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600',
    brand: item.produtos?.marca || 'Universal',
    storeId: o.loja_id,
    description: item.produtos?.descricao || '',
    isOriginal: item.produtos?.is_original || false,
    condition: item.produtos?.condicao || 'Novo',
    compatibleModels: item.produtos?.modelos_compativeis || [],
    category: item.produtos?.categoria || 'Motor',
  })) as CartItem[],
  tipo_entrega: o.tipo_entrega || undefined,
  endereco_entrega: o.endereco_entrega || undefined,
  created_at: o.created_at,
});

// ============================================
// MAPPER: Carrinho (Item do Pedido)
// ============================================

export const mapCartItem = (item: any): CartItem => ({
  id: item.produto_id || item.id,
  storeId: item.loja_id || item.storeId,
  name: item.nome || item.name || 'Produto',
  description: item.descricao || item.description || '',
  price: Number(item.preco || item.price) || 0,
  isOriginal: item.is_original || false,
  condition: item.condicao || item.condition || 'Novo',
  brand: item.marca || item.brand || 'Universal',
  compatibleModels: item.modelos_compativeis || item.compatibleModels || [],
  imageUrl: item.imagem_url || item.imageUrl || 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600',
  category: item.categoria || item.category || 'Motor',
  location: item.localizacao || item.location || 'Luanda',
  year: item.ano || item.year,
  engineType: item.tipo_motor || item.engineType,
  isPromo: item.is_promo || false,
  isNew: item.is_new || false,
  stock: item.estoque || item.stock || 0,
  quantity: item.quantidade || item.quantity || 1,
  logisticsOption: item.logisticsOption,
});

// ============================================
// MAPPER: Veículo
// ============================================

export const mapVehicle = (v: any): Car => ({
  id: v.id,
  brand: v.marca || v.brand,
  model: v.modelo || v.model,
  year: v.ano || v.year,
  vin: v.vin || undefined,
  version: v.versao || v.version || undefined,
  bodyType: v.tipo_carroceria || v.bodyType || undefined,
  engineType: v.tipo_motor || v.engineType || undefined,
  fuel: v.combustivel || v.fuel || undefined,
  engineCode: v.codigo_motor || v.engineCode || undefined,
  power: v.potencia || v.power || undefined,
  transmission: v.transmissao || v.transmission || undefined,
  modelYear: v.ano_modelo || v.modelYear || undefined,
  color: v.cor || v.color || undefined,
  mileage: v.quilometragem || v.mileage || undefined,
  plate: v.placa || v.plate || undefined,
  notes: v.observacoes || v.notes || undefined,
});

// ============================================
// MAPPER: Mensagem (Chat)
// ============================================

export const mapMessage = (m: any, currentUserId: string): ChatMessage => ({
  id: m.id,
  senderId: m.remetente_id,
  receiverId: m.destinatario_id,
  lojaId: m.loja_id || undefined,
  text: m.conteudo || m.text || '',
  timestamp: new Date(m.created_at || Date.now()),
  isMe: m.remetente_id === currentUserId,
  lida: m.lida || false,
});

// ============================================
// EXPORTAÇÃO PADRÃO
// ============================================

export const mappers = {
  mapUser,
  mapStore,
  mapPart,
  mapOrder,
  mapCartItem,
  mapVehicle,
  mapMessage,
};

export default mappers;