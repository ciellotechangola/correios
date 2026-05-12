// types.ts — Schema V4 compliant (EXATO conforme especificação)
export type UserRole = 'CLIENTE' | 'VENDEDOR' | 'ENTREGADOR' | 'ADMIN_MASTER';
export type UserStatus = 'ATIVO' | 'SUSPENSO' | 'BANIDO';
export type OrderStatus = 'PENDENTE' | 'PAGO' | 'PREPARANDO' | 'PRONTO_PARA_RETIRADA' | 'EM_ROTA' | 'ENTREGUE' | 'CANCELADO';
export type DeliveryStatus = 'AGUARDANDO' | 'A_CAMINHO' | 'ENTREGUE' | 'FALHOU';
export type TipoEntrega = 'RETIRADA' | 'ENTREGA';

export interface Usuario {
  id: string;
  email: string;
  role: UserRole;
  status_conta: UserStatus;
  nome: string | null;
  telefone: string | null;
  avatar_url: string | null;
  provincia: string | null;
  cidade: string | null;
  bairro: string | null;
  lat: number | null;
  lng: number | null;
  is_online: boolean;
  ultima_localizacao_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface Loja {
  id: string;
  owner_id: string;
  nome: string;
  descricao: string | null;
  telefone: string | null;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  lat: number | null;
  lng: number | null;
  nif: string | null;
  nicho: string;
  rating: number;
  review_count: number;
  is_open: boolean;
  cover_image: string | null;
  logo: string | null;
  is_verified: boolean;
  response_time: string | null;
  vendas_count: number;
  badges: any[];
  provincia: string | null;
  cidade: string | null;
  bairro: string | null;
  endereco_completo: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface Produto {
  id: string;
  loja_id: string;
  nome: string;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  descricao: string | null;
  preco: number;
  estoque: number;
  imagem_url: string | null;
  is_original: boolean;
  condicao: string;
  modelos_compativeis: string[];
  localizacao: string | null;
  tipo_motor: string | null;
  is_promo: boolean;
  is_new: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  loja_id: string;
  status: OrderStatus;
  tipo_entrega: TipoEntrega;
  endereco_entrega: string | null;
  valor_total: number;
  cliente_lat: number | null;
  cliente_lng: number | null;
  loja_lat: number | null;
  loja_lng: number | null;
  provincia: string | null;
  codigo_rastreamento: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  preco: number;
}

export interface Entrega {
  id: string;
  pedido_id: string;
  entregador_id: string | null;
  status: DeliveryStatus;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocalizacaoTempoReal {
  id: string;
  profile_id: string;
  pedido_id: string | null;
  latitude: number;
  longitude: number;
  tipo: 'CLIENTE' | 'VENDEDOR' | 'ENTREGADOR';
  is_online: boolean;
  provincia: string | null;
  cidade: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mensagem {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  loja_id: string | null;
  conteudo: string | null;
  imagem_url: string | null;
  pedido_id: string | null;
  data_expiracao: string | null;
  created_at: string;
}

export interface Avaliacao {
  id: string;
  profile_id: string;
  loja_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
}

export interface Veiculo {
  id: string;
  profile_id: string;
  marca: string;
  modelo: string;
  ano: number;
  n_motor: string | null;
  n_chassi: string | null;
  vin: string | null;
  versao: string | null;
  tipo_carroceria: string | null;
  tipo_motor: string | null;
  combustivel: string | null;
  codigo_motor: string | null;
  potencia: number | null;
  transmissao: string | null;
  ano_modelo: number | null;
  cor: string | null;
  quilometragem: number | null;
  placa: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface TrackingMapaData {
  tipo: 'cliente' | 'loja' | 'entregador';
  entidade_id: string;
  nome: string;
  lat: number;
  lng: number;
  status: string;
  icon_color: string;
  updated_at: string;
}

export interface TrackingPedidoCompleto {
  pedido_id: string;
  status: OrderStatus;
  codigo_rastreamento: string | null;
  tipo_entrega: TipoEntrega;
  cliente: {
    id: string;
    nome: string | null;
    telefone: string | null;
    lat: number | null;
    lng: number | null;
  };
  loja: {
    loja_id: string;
    nome: string;
    telefone: string | null;
    lat: number | null;
    lng: number | null;
  };
  entrega: {
    status: DeliveryStatus;
    entregador_id: string | null;
    latitude: number | null;
    longitude: number | null;
    updated_at: string | null;
  };
  rota: {
    origem_lat: number | null;
    origem_lng: number | null;
    destino_lat: number | null;
    destino_lng: number | null;
  };
}

export interface ClienteProximo {
  profile_id: string;
  nome: string | null;
  distancia_km: number;
  is_online: boolean;
  tem_pedido_pendente: boolean;
  pedido_id: string | null;
  pedido_status: OrderStatus | null;
  cliente_lat: number;
  cliente_lng: number;
  updated_at: string;
}

// Tipos utilitários para o frontend (mantidos para compatibilidade)
export type ProductCondition = 'Novo' | 'Usado - Bom estado' | 'Usado';
export type StoreNiche = 'Universal' | 'Toyota' | 'Hyundai' | 'Nissan' | 'BMW' | 'Kia' | 'Mitsubishi' | 'Suzuki' | 'Mercedes' | 'Ford' | 'Land Rover';
export type BadgeType = 'popular' | 'verified' | 'featured';

export interface Car {
  id?: string;
  brand: string;
  model: string;
  year: number;
  vin?: string;
  version?: string;
  bodyType?: string;
  engineType?: string;
  fuel?: string;
  engineCode?: string;
  power?: number;
  transmission?: string;
  modelYear?: number;
  color?: string;
  mileage?: number;
  plate?: string;
  notes?: string;
}

export interface LogisticsOption {
  id: string;
  name: string;
  price: number;
  estimatedTime: string;
  type: 'pickup' | 'delivery';
}

export interface Review {
  id: string;
  userId: string;
  user?: string;
  lojaId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Delivery {
  id: string;
  pedido_id: string;
  entregador_id: string | null;
  status: DeliveryStatus;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  id: string;
  loja_id: string;
  loja_nome: string;
  loja_logo: string;
  ultima_mensagem: string;
  hora: string;
  nao_lida: number;
  isOnline: boolean;
}

export interface Contact {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  foto: string;
  role: UserRole;
  telefone?: string;
}

export interface VehicleBrand {
  id: string;
  nome: string;
  pais_origem?: string;
  logo_url?: string;
}

export interface VehicleModel {
  id: string;
  marca_id: string;
  nome: string;
}

// Tipos para formulários
export type VehicleFormData = Omit<Car, 'id'> & { id?: string };

export interface PartSuggestion {
  id: string;
  name: string;
  brand: string;
  price: number;
  store: string;
  compatibility: number;
  inStock: boolean;
}

export interface ImageSearch {
  image_search_id: string;
  detected_part_name: string;
  part_category: string;
  vehicle_compatibility: string[];
  store_results: string[];
  analysis_timestamp: string;
}

// Interfaces para o frontend (mappers)
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  telefone?: string;
  car?: any; // Para compatibilidade
  storeId?: string;
  provincia?: string | null;
  cidade?: string | null;
  bairro?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_online?: boolean;
  status_conta?: UserStatus;
}

export interface Store {
  id: string;
  userId: string;
  name: string;
  nif: string;
  niche: string;
  rating: number;
  reviewCount: number;
  address: string;
  distance?: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  coverImage: string;
  logo: string;
  isVerified?: boolean;
  responseTime?: string;
  salesCount?: number;
  badges?: string[];
  description?: string;
  phone?: string;
  provincia?: string | null;
  cidade?: string | null;
  bairro?: string | null;
}

export interface Part {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  isOriginal: boolean;
  condition: string;
  brand: string;
  compatibleModels: string[];
  imageUrl: string;
  category: string;
  isPromo?: boolean;
  isNew?: boolean;
  location?: string;
  year?: number;
  engineType?: string;
  stock?: number;
  // Campos extras para compatibilidade
  modelo?: string;
  ano?: number;
  transmissionCompatibility?: string;
  fuelCompatibility?: string;
  compatibleYears?: number[];
  oemCode?: string;
}

export interface CartItem extends Part {
  quantity: number;
  logisticsOption?: any;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  date: string;
  storeId: string;
  tipo_entrega?: TipoEntrega;
  endereco_entrega?: string;
  created_at?: string; // Para compatibilidade
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  lojaId?: string;
  text: string;
  timestamp: Date;
  isMe: boolean;
  lida?: boolean;
}

export interface RealTimeLocation {
  id: string;
  profile_id: string;
  pedido_id: string | null;
  latitude: number;
  longitude: number;
  tipo: 'CLIENTE' | 'VENDEDOR' | 'ENTREGADOR';
  is_online: boolean;
  updated_at: string;
}

// Database interface for Supabase type safety
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Usuario;
        Insert: Partial<Usuario> & { id: string; email: string };
        Update: Partial<Usuario>;
      };
      lojas: {
        Row: Loja;
        Insert: Partial<Loja> & { owner_id: string; nome: string };
        Update: Partial<Loja>;
      };
      produtos: {
        Row: Produto;
        Insert: Partial<Produto> & { loja_id: string; nome: string; preco: number };
        Update: Partial<Produto>;
      };
      pedidos: {
        Row: Pedido;
        Insert: Partial<Pedido> & { cliente_id: string; loja_id: string; valor_total: number };
        Update: Partial<Pedido>;
      };
      pedido_itens: {
        Row: PedidoItem;
        Insert: Partial<PedidoItem> & { pedido_id: string; produto_id: string; quantidade: number; preco: number };
        Update: Partial<PedidoItem>;
      };
      entregas: {
        Row: Entrega;
        Insert: Partial<Entrega> & { pedido_id: string };
        Update: Partial<Entrega>;
      };
      mensagens: {
        Row: Mensagem;
        Insert: Partial<Mensagem> & { remetente_id: string; destinatario_id: string };
        Update: Partial<Mensagem>;
      };
      localizacoes_tempo_real: {
        Row: LocalizacaoTempoReal;
        Insert: Partial<LocalizacaoTempoReal> & { profile_id: string; latitude: number; longitude: number };
        Update: Partial<LocalizacaoTempoReal>;
      };
      avaliacoes: {
        Row: Avaliacao;
        Insert: Partial<Avaliacao> & { profile_id: string; loja_id: string; nota: number };
        Update: Partial<Avaliacao>;
      };
      veiculos: {
        Row: Veiculo;
        Insert: Partial<Veiculo> & { profile_id: string; marca: string; modelo: string; ano: number };
        Update: Partial<Veiculo>;
      };
      favoritos: {
        Row: { id: string; profile_id: string; loja_id: string | null; produto_id: string | null; created_at: string };
        Insert: { profile_id: string; loja_id?: string | null; produto_id?: string | null };
        Update: Partial<{ profile_id: string; loja_id: string | null; produto_id: string | null }>;
      };
      usuarios: {
        Row: Usuario;
        Insert: Partial<Usuario> & { id: string; email: string };
        Update: Partial<Usuario>;
      };
      pecas: {
        Row: Produto;
        Insert: Partial<Produto>;
        Update: Partial<Produto>;
      };
      contactos: {
        Row: { id: string; profile_id: string; contacto_id: string; nome_tipo: string | null; criado_em: string };
        Insert: { profile_id: string; contacto_id: string };
        Update: Partial<{ profile_id: string; contacto_id: string }>;
      };
      audit_logs: {
        Row: { id: string; tabela: string; registro_id: string; acao: string; dados_antigos: any; dados_novos: any; realizado_por: string | null; created_at: string };
        Insert: { tabela: string; registro_id: string; acao: string };
        Update: Partial<{ tabela: string; registro_id: string; acao: string }>;
      };
    };
    Functions: {
      buscar_clientes_proximos: {
        Args: {
          p_referencia_lat: number;
          p_referencia_lng: number;
          p_raio_km: number;
          p_perfil: string;
          p_provincia: string | null;
        };
        Returns: ClienteProximo[];
      };
    };
  };
}
