import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { signIn, signOut, signUp, getUserProfile, getVendorStore, getUserVehicle, onAuthStateChanged } from '../services/auth';
import {
  CartItem, Part, Store, User, Order, LogisticsOption, Car,
  ChatMessage, Review, UserRole, OrderStatus, Delivery, Database,
  RealTimeLocation
} from '../types';

type View = 'login' | 'home' | 'explore' | 'cart' | 'profile' | 'product-detail' |
  'store-detail' | 'store-list' | 'store-map' | 'chat' | 'chat-list' |
  'checkout' | 'success' | 'full-map' | 'orders' | 'vendor-dashboard' |
  'vendor-orders' | 'vendor-products' | 'vendor-map' | 'vendor-store' |
  'entregador-dashboard' | 'admin-dashboard' | 'brand-parts' | 'favorites' |
  'settings' | 'visual-search' | 'order-tracker' | 'cliente-map' | 'vendedor-map-real' |
  'order-tracking-map';

interface AppContextType {
  // Navigation
  currentView: View;
  setView: (view: View) => void;
  goBack: () => void;
  viewHistory: View[];
  
  // Selections
  selectedPart: Part | null;
  selectPart: (part: Part) => void;
  selectedStore: Store | null;
  selectStore: (store: Store) => void;
  selectedBrand: string | null;
  selectBrand: (brand: string) => void;
  selectedChatStore: Store | null;
  selectChatStore: (store: Store) => void;
  
  // Cart
  cart: CartItem[];
  addToCart: (part: Part, logisticsOption?: LogisticsOption) => void;
  removeFromCart: (partId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  
  // User & Auth
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string, nome: string, telefone?: string) => Promise<boolean>;
  
  // Data (from Supabase)
  parts: Part[];
  stores: Store[];
  orders: Order[];
  users: User[];
  favorites: string[];
  favoriteProducts: string[];
  
  // Vendor specific
  vendorStore: Store | null;

  // Selected order for tracking/chat
  selectedOrder: Order | null;
  selectOrder: (order: Order | null) => void;

  // Real-time GPS tracking
  realTimeLocations: RealTimeLocation[];
  subscribeToOrderLocations: (pedidoId: string) => void;
  unsubscribeFromLocations: () => void;
  startGpsTracking: (pedidoId: string, tipo: 'cliente' | 'entregador' | 'loja') => void;
  stopGpsTracking: () => void;

  // Map helper - Abrir mapa do pedido de forma reutilizável
  openOrderMap: (orderId: string) => Promise<void>;

  // Actions
  placeOrder: () => Promise<void>;
  updateUserCar: (car: Car) => Promise<void>;
  updateStore: (storeId: string, data: Partial<Store>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus | string) => Promise<void>;
  toggleFavoriteStore: (storeId: string) => Promise<void>;
  toggleFavoriteProduct: (productId: string) => Promise<void>;
  
  // Map & UI
  isDirectionsMode: boolean;
  setDirectionsMode: (mode: boolean) => void;
  mapConfig: { mode: 'delivery' | 'pickup' | 'view', storeName?: string, storeLat?: number, storeLng?: number } | null;
  setMapConfig: (config: { mode: 'delivery' | 'pickup' | 'view', storeName?: string, storeLat?: number, storeLng?: number } | null) => void;
  toastMessage: string | null;
  showToast: (message: string) => void;
  
  // Settings
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  currency: string;
  setCurrency: (curr: string) => void;
}

// Mapeamento de dados do Supabase para o formato da aplicação
// Schema: profiles (antigo usuarios), lojas (owner_id), pedidos (cliente_id)
const mapStore = (s: any): Store => ({
  id: s.id,
  name: s.nome,
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
  userId: s.owner_id || s.user_id,
});

const mapPart = (p: any): Part => ({
  id: p.id,
  storeId: p.loja_id,
  name: p.nome,
  description: p.descricao || '',
  price: Number(p.preco),
  isOriginal: p.is_original ?? false,
  condition: (p.condicao as Part['condition']) || 'Novo',
  brand: p.marca || 'Universal',
  compatibleModels: p.modelos_compativeis || [],
  category: p.categoria || 'Motor',
  imageUrl: p.imagem_url || 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600',
  location: p.localizacao || 'Luanda',
  year: p.ano || undefined,
  engineType: p.tipo_motor || 'All',
  isPromo: p.is_promo ?? false,
  isNew: p.is_new ?? false,
  stock: p.estoque || 0,
  modelo: p.modelo || '',
  ano: p.ano || undefined,
});

const mapUser = (u: any, car?: Car, storeId?: string): User => ({
  id: u.id,
  name: u.nome || u.email.split('@')[0],
  email: u.email,
  role: u.role as UserRole,
  avatarUrl: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome || u.email)}&background=random`,
  telefone: u.telefone || undefined,
  car,
  storeId,
});

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation state
  const [viewHistory, setViewHistory] = useState<View[]>([]);
  const currentView = viewHistory.length > 0 ? viewHistory[viewHistory.length - 1] : 'login';
  const [hasInitialRedirect, setHasInitialRedirect] = useState(false);
  
  // Selection state
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedChatStore, setSelectedChatStore] = useState<Store | null>(null);
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // User state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Vendor store
  const [vendorStore, setVendorStore] = useState<Store | null>(null);

  // Selected order for tracking/chat
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Real-time GPS locations
  const [realTimeLocations, setRealTimeLocations] = useState<RealTimeLocation[]>([]);
  const locationChannelRef = React.useRef<any>(null);
  const gpsWatchRef = React.useRef<number | null>(null);
  
  // Anti-loop refs
  const lastLoadUserProfileRef = React.useRef<number>(0);
  const isLoadingUserProfileRef = React.useRef<boolean>(false);
  const consecutiveErrorsRef = React.useRef<number>(0);
  const MAX_CONSECUTIVE_ERRORS = 3;

  // Data state (from Supabase)
  const [parts, setParts] = useState<Part[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);
  
  // UI state
  const [isDirectionsMode, setIsDirectionsMode] = useState(false);
  const [mapConfig, setMapConfig] = useState<{ mode: 'delivery' | 'pickup' | 'view', storeName?: string, storeLat?: number, storeLng?: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<string>('pt-AO');
  const [currency, setCurrency] = useState<string>('AOA');

  // Show toast message
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ==========================================
  // INICIALIZAÇÃO E AUTENTICAÇÃO
  // ==========================================

  useEffect(() => {
    // Flag para evitar múltiplas inicializações
    let isInitialized = false;
    
    const initializeApp = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      // Carregar dados públicos (lojas e produtos)
      loadPublicData();

      // Verificar sessão ativa
      await checkActiveSession();
    };

    initializeApp();

    // Listener para mudanças de auth
    const { data: { subscription } } = onAuthStateChanged(async (event, session) => {
      console.log('Auth event:', event, session?.user?.id);
      
      // ANTI-LOOP: Verificar se não é uma mudança redundante
      if (event === 'SIGNED_IN' && session?.user) {
        // Verificar se o usuário já está carregado
        if (user?.id === session.user.id && isAuthenticated) {
          console.log('Auth callback ignorado: usuário já autenticado');
          return;
        }
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        handleLogout();
      }
    });

    return () => {
      subscription.unsubscribe();
      isInitialized = false;
    };
  }, []); // Executa apenas uma vez na montagem do componente

  const checkActiveSession = async () => {
    try {
      // ANTI-LOOP: Não fazer nada se já está carregando
      if (isLoadingUserProfileRef.current) {
        console.log('checkActiveSession ignorado: já carregando');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Verificar se não é o mesmo usuário já carregado
        if (user?.id === session.user.id && isAuthenticated) {
          console.log('checkActiveSession ignorado: mesma sessão, usuário já carregado');
          setIsLoading(false);
          return;
        }
        console.log('Active session found, loading profile...');
        await loadUserProfile(session.user.id);
      } else {
        console.log('No active session');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setIsLoading(false);
    }
  };

  // Carregar dados públicos (lojas e produtos)
  const loadPublicData = async () => {
    try {
      // Fetch Stores
      const { data: storesData, error: storesError } = await supabase
        .from('lojas')
        .select('*')
        .order('nome');

      if (!storesError && storesData) {
        console.log('🏪 Stores loaded:', storesData.length);
        console.log('🏪 Sample store:', {
          id: storesData[0]?.id,
          nome: storesData[0]?.nome,
          user_id: storesData[0]?.user_id
        });
        setStores(storesData.map(mapStore));
      } else if (storesError) {
        console.error('Error loading stores:', storesError);
      }

      // Fetch Parts
      const { data: partsData, error: partsError } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (!partsError && partsData) {
        console.log('📦 Parts loaded:', partsData.length);
        console.log('📦 Sample part:', {
          id: partsData[0]?.id,
          nome: partsData[0]?.nome,
          loja_id: partsData[0]?.loja_id
        });
        setParts(partsData.map(mapPart));
      } else if (partsError) {
        console.error('Error loading parts:', partsError);
      }

      // Fetch Users (para autocomplete e chats) - USA A TABELA CORRETA: profiles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (!usersError && usersData) {
        setUsers(usersData.map(u => mapUser(u)));
      }
    } catch (error) {
      console.error('Error loading public data:', error);
    }
  };

  // Carregar perfil do usuário
  const loadUserProfile = async (userId: string) => {
    try {
      // ANTI-LOOP: Verificar se já está carregando ou foi carregado recentemente
      const now = Date.now();
      if (isLoadingUserProfileRef.current && now - lastLoadUserProfileRef.current < 2000) {
        console.log('🔄 LoadUserProfile bloqueado: já carregando ou carregado recentemente');
        return;
      }
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        console.error('🚫 LoadUserProfile bloqueado: muitas tentativas consecutivas com erro');
        setIsLoading(false);
        return;
      }
      
      // Marcar como em execução
      isLoadingUserProfileRef.current = true;
      lastLoadUserProfileRef.current = now;
      setIsLoading(true);

      // Fetch user profile from profiles table - USA A TABELA CORRETA: profiles
      // USAR .maybeSingle() em vez de .single() para evitar erro quando não existe perfil
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      // Se perfil não existir, criar automaticamente
      if (userError || !userData) {
        console.warn('User profile not found, creating one...');
        
        // Buscar dados do Auth para usar como base
        const { data: authUser } = await supabase.auth.getUser();
        const email = authUser?.user?.email || '';
        const nome = authUser?.user?.user_metadata?.nome || email.split('@')[0];
        
        // Criar perfil padrão na tabela profiles
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            nome: nome,
            role: 'CLIENTE',
            status_conta: 'ATIVO',
            is_online: true,
            provincia: 'Luanda',
            cidade: 'Luanda',
            bairro: 'Talatona'
          })
          .select()
          .maybeSingle();
        
        if (createError) {
          console.error('Error creating user profile:', createError);
          consecutiveErrorsRef.current++;
          setIsLoading(false);
          isLoadingUserProfileRef.current = false;
          return;
        }
        
        console.log('✅ User profile created:', newProfile);
        
        // Reset de contadores de erro após sucesso
        consecutiveErrorsRef.current = 0;
        
        // Usar o novo perfil criado
        const profileToUse = newProfile;
        
        // Fetch user's car (if CLIENTE) - veiculos table uses profile_id
        // USAR .maybeSingle() para evitar erro quando não existe veículo
        let car: Car | undefined;
        const { data: carData } = await supabase
          .from('veiculos')
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle(); // Usar maybeSingle() em vez de single()
        
        if (carData) {
          car = {
            id: carData.id,
            brand: carData.marca,
            model: carData.modelo,
            year: carData.ano,
            vin: carData.vin || undefined,
            version: carData.versao || undefined,
            bodyType: carData.tipo_carroceria || undefined,
            engineType: carData.tipo_motor || undefined,
            fuel: carData.combustivel || undefined,
            engineCode: carData.codigo_motor || undefined,
            power: carData.potencia || undefined,
            transmission: carData.transmissao || undefined,
          };
        }

        const mappedUser = mapUser(profileToUse, car);
        setUser(mappedUser);
        setIsAuthenticated(true);
        
        // Fetch user's orders
        await loadUserOrders(userId, profileToUse.role);
        
        // Fetch user's favorites
        await loadUserFavorites(userId);
        
        // Redirect based on role
        redirectBasedOnRole(profileToUse.role);
        
        setIsLoading(false);
        return;
      }

      console.log('User profile loaded:', userData.role, 'Has initial redirect:', hasInitialRedirect);
      
      // Reset de contadores de erro após sucesso
      consecutiveErrorsRef.current = 0;

      // Fetch user's car (if CLIENTE) - veiculos uses profile_id
      // USAR .maybeSingle() para evitar erro quando não existe veículo
      let car: Car | undefined;
      if (userData.role === 'CLIENTE') {
        const { data: carData } = await supabase
          .from('veiculos')
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle(); // Usar maybeSingle() em vez de single()
        
        if (carData) {
          car = {
            id: carData.id,
            brand: carData.marca,
            model: carData.modelo,
            year: carData.ano,
            vin: carData.vin || undefined,
            version: carData.versao || undefined,
            bodyType: carData.tipo_carroceria || undefined,
            engineType: carData.tipo_motor || undefined,
            fuel: carData.combustivel || undefined,
            engineCode: carData.codigo_motor || undefined,
            power: carData.potencia || undefined,
            transmission: carData.transmissao || undefined,
            modelYear: carData.ano_modelo || undefined,
            color: carData.cor || undefined,
            mileage: carData.quilometragem || undefined,
            plate: carData.placa || undefined,
            notes: carData.observacoes || undefined,
          };
        }
      }

      // Fetch user's store (if VENDEDOR) - lojas table uses owner_id
      let storeId: string | undefined;
      let store: Store | null = null;
      if (userData.role === 'VENDEDOR') {
        try {
          // Usar .limit(1) para evitar erro "multiple rows" quando há duplicados
          const { data: storeData, error: storeError } = await supabase
            .from('lojas')
            .select('*')
            .eq('owner_id', userId)
            .limit(1)
            .maybeSingle();
          
          if (storeError) {
            console.warn('Erro ao carregar loja do vendedor:', storeError.message);
            // Não falhar o login por causa do erro da loja
          } else if (storeData) {
            store = mapStore(storeData);
            storeId = storeData.id;
            setVendorStore(store);
          }
        } catch (e) {
          console.warn('Exceção ao carregar loja:', e);
          // Não falhar o login
        }
      }

      const mappedUser = mapUser(userData, car, storeId);
      setUser(mappedUser);
      setIsAuthenticated(true);

      // Fetch user's orders
      await loadUserOrders(userId, userData.role, storeId);

      // Fetch user's favorites
      await loadUserFavorites(userId);

      // Redirect based on role
      redirectBasedOnRole(userData.role);

    } catch (error) {
      console.error('Error loading user profile:', error);
      consecutiveErrorsRef.current++;
      showToast('Erro ao carregar perfil');
    } finally {
      setIsLoading(false);
      isLoadingUserProfileRef.current = false;
    }
  };

  // Carregar pedidos do usuário
  const loadUserOrders = async (userId: string, role: UserRole, storeId?: string) => {
    try {
      let query = supabase.from('pedidos').select(`
        *,
        pedido_itens (
          *,
          produtos (*)
        )
      `);
      
      if (role === 'VENDEDOR' && storeId) {
        query = query.eq('loja_id', storeId);
      } else {
        // Use cliente_id for CLIENTE,ENTREGADOR,ADMIN_MASTER
        query = query.eq('cliente_id', userId);
      }

      const { data: ordersData } = await query.order('created_at', { ascending: false });

      if (ordersData) {
        const mappedOrders: Order[] = ordersData.map(o => ({
          id: o.id,
          userId: o.cliente_id, // Schema uses cliente_id
          storeId: o.loja_id,
          total: Number(o.valor_total),
          status: o.status,
          date: new Date(o.created_at).toLocaleDateString('pt-AO'),
          items: o.pedido_itens?.map((item: any) => ({
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
          })) || [],
          tipo_entrega: o.tipo_entrega || undefined,
          endereco_entrega: o.endereco_entrega || undefined,
          created_at: o.created_at,
        }));
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  // Carregar favoritos do usuário
  const loadUserFavorites = async (userId: string) => {
    try {
      // favoritos table uses profile_id
      const { data: favData } = await supabase
        .from('favoritos')
        .select('loja_id, produto_id')
        .eq('profile_id', userId);

      if (favData) {
        setFavorites(favData.filter(f => f.loja_id).map(f => f.loja_id!) as string[]);
        setFavoriteProducts(favData.filter(f => f.produto_id).map(f => f.produto_id!) as string[]);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Redirecionar baseado no role (apenas no login inicial)
  const redirectBasedOnRole = (role: UserRole) => {
    // Só redireciona automaticamente se ainda não houve um redirect inicial
    if (!hasInitialRedirect) {
      const viewMap: Record<UserRole, View> = {
        'CLIENTE': 'home',
        'VENDEDOR': 'vendor-dashboard',
        'ENTREGADOR': 'entregador-dashboard',
        'ADMIN_MASTER': 'admin-dashboard',
      };
      setView(viewMap[role] || 'home');
      setHasInitialRedirect(true);
    }
  };

  // Handle logout
  const handleLogout = () => {
    // Reset all anti-loop counters
    isLoadingUserProfileRef.current = false;
    consecutiveErrorsRef.current = 0;
    lastLoadUserProfileRef.current = 0;
    
    setUser(null);
    setVendorStore(null);
    setOrders([]);
    setFavorites([]);
    setFavoriteProducts([]);
    setIsAuthenticated(false);
    setHasInitialRedirect(false);
    setViewHistory(['login']);
  };

  // ==========================================
  // FUNÇÕES DE AUTENTICAÇÃO
  // ==========================================

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    console.log('🔐 AppContext.login: Iniciando...');
    
    const result = await signIn(email, password);
    console.log('🔐 AppContext.login: Resultado=', result.success, result.error);
    
    if (result.success && result.user) {
      showToast('Login realizado com sucesso!');
      await loadUserProfile(result.user.id);
      return true;
    } else {
      showToast(result.error || 'Erro ao fazer login');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    await signOut();
    handleLogout();
    showToast('Sessão terminada');
  };

  const register = async (email: string, password: string, nome: string, telefone?: string): Promise<boolean> => {
    setIsLoading(true);
    
    const result = await signUp(email, password, nome, telefone);
    
    if (result.success) {
      showToast('Conta criada! Verifique seu email.');
      return true;
    } else {
      showToast(result.error || 'Erro ao criar conta');
      setIsLoading(false);
      return false;
    }
  };

  // ==========================================
  // NAVEGAÇÃO
  // ==========================================

  const setView = (view: View) => {
    if (view !== currentView) {
      setViewHistory(prev => {
        // Se a view já é a última no histórico, não adicionar novamente
        if (prev.length > 0 && prev[prev.length - 1] === view) {
          return prev;
        }
        return [...prev, view];
      });
    }
  };

  const goBack = () => {
    if (viewHistory.length > 1) {
      setViewHistory(prev => prev.slice(0, -1));
    }
  };

  // ==========================================
  // SELEÇÕES
  // ==========================================

  const selectPart = (part: Part) => {
    setSelectedPart(part);
    setView('product-detail');
  };

  const selectStore = (store: Store) => {
    setSelectedStore(store);
    setView('store-detail');
  };

  const selectBrand = (brand: string) => {
    setSelectedBrand(brand);
    setView('brand-parts');
  };

  const selectChatStore = (store: Store) => {
    setSelectedChatStore(store);
    setView('chat');
  };

  // ==========================================
  // CARRINHO
  // ==========================================

  const addToCart = (part: Part, logisticsOption?: LogisticsOption) => {
    setCart(prev => {
      const existing = prev.find(p => 
        p.id === part.id && 
        p.logisticsOption?.id === logisticsOption?.id
      );
      if (existing) {
        return prev.map(p => 
          (p.id === part.id && p.logisticsOption?.id === logisticsOption?.id)
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }
      return [...prev, { ...part, quantity: 1, logisticsOption }];
    });
    showToast(`${part.name} adicionado ao cesto`);
  };

  const removeFromCart = (partId: string) => {
    setCart(prev => prev.filter(p => p.id !== partId));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // ==========================================
  // PEDIDOS
  // ==========================================

  const placeOrder = async () => {
    if (!user || cart.length === 0) {
      showToast('Carrinho vazio ou usuário não logado');
      return;
    }

    const storeId = cart[0]?.storeId;
    const total = cartTotal;
    const logisticsOption = cart[0]?.logisticsOption;

    try {
      // Insert order - pedidos table uses cliente_id instead of user_id
      const { data: orderData, error: orderError } = await supabase
        .from('pedidos')
        .insert({
          cliente_id: user.id, // Schema uses cliente_id
          loja_id: storeId,
          valor_total: total,
          status: 'PENDENTE',
          tipo_entrega: logisticsOption?.type === 'delivery' ? 'ENTREGA' : 'RETIRADA', // Schema uses ENTREGA/RETIRADA
          endereco_entrega: logisticsOption?.type === 'delivery' ? 'A definir' : null,
        })
        .select()
        .maybeSingle();

      if (orderError) throw orderError;

      // Insert order items
      if (orderData) {
        const orderItems = cart.map(item => ({
          pedido_id: orderData.id,
          produto_id: item.id,
          quantidade: item.quantity,
          preco: item.price,
        }));

        const { error: itemsError } = await supabase
          .from('pedido_itens')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Create delivery record if needed
        if (logisticsOption?.type === 'delivery') {
          await supabase.from('entregas').insert({
            pedido_id: orderData.id,
            status: 'AGUARDANDO',
          });
        }

        // Update order state
        const newOrder: Order = {
          id: orderData.id,
          userId: user.id,
          items: [...cart],
          total: total,
          status: 'PENDENTE',
          date: new Date(orderData.created_at).toLocaleDateString('pt-AO'),
          storeId: storeId!,
          tipo_entrega: logisticsOption?.type,
          created_at: orderData.created_at,
        };

        setOrders(prev => [newOrder, ...prev]);
        clearCart();
        showToast('Pedido realizado com sucesso!');
      }
    } catch (error: any) {
      console.error('Error placing order:', error);
      showToast('Erro ao realizar pedido: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus | string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: status.toUpperCase() })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: status.toUpperCase() } : o
      ));
      showToast(`Pedido atualizado para: ${status}`);
    } catch (error: any) {
      console.error('Error updating order:', error);
      showToast('Erro ao atualizar pedido');
    }
  };

  // ==========================================
  // USUÁRIO
  // ==========================================

  const updateUserCar = async (car: Car) => {
    if (!user) return;

    try {
      // Check if user already has a car - veiculos uses profile_id
      const { data: existingCars } = await supabase
        .from('veiculos')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1);

      const vehicleData = {
        marca: car.brand,
        modelo: car.model,
        ano: car.year,
        vin: car.vin || null,
        versao: car.version || null,
        tipo_carroceria: car.bodyType || null,
        tipo_motor: car.engineType || null,
        combustivel: car.fuel || null,
        codigo_motor: car.engineCode || null,
        potencia: car.power || null,
        transmissao: car.transmission || null,
        ano_modelo: car.modelYear || null,
        cor: car.color || null,
        quilometragem: car.mileage || null,
        placa: car.plate || null,
        observacoes: car.notes || null,
      };

      if (existingCars && existingCars.length > 0) {
        // Update existing
        const { error } = await supabase
          .from('veiculos')
          .update(vehicleData)
          .eq('id', existingCars[0].id);
        
        if (error) throw error;
      } else {
        // Insert new with profile_id
        const { error } = await supabase
          .from('veiculos')
          .insert({
            profile_id: user.id,
            ...vehicleData,
          });
        
        if (error) throw error;
      }

      setUser({ ...user, car });
      showToast('Veículo atualizado com sucesso!');
    } catch (error: any) {
      console.error('Error updating car:', error);
      showToast('Erro ao atualizar veículo: ' + (error.message || 'Erro desconhecido'));
    }
  };

  // ==========================================
  // LOJA
  // ==========================================

  const updateStore = async (storeId: string, data: Partial<Store>) => {
    try {
      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.nome = data.name;
      if (data.address !== undefined) updateData.endereco = data.address;
      if (data.coverImage !== undefined) updateData.cover_image = data.coverImage;
      if (data.logo !== undefined) updateData.logo = data.logo;
      if (data.isOpen !== undefined) updateData.is_open = data.isOpen;
      if (data.niche !== undefined) updateData.nicho = data.niche;
      if (data.phone !== undefined) updateData.telefone = data.phone;
      if (data.description !== undefined) updateData.descricao = data.description;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('lojas')
          .update(updateData)
          .eq('id', storeId);

        if (error) throw error;
      }

      setStores(prev => prev.map(s => s.id === storeId ? { ...s, ...data } : s));
      
      // Update vendor store if it's the user's store
      if (vendorStore && vendorStore.id === storeId) {
        setVendorStore(prev => prev ? { ...prev, ...data } : null);
      }
      
      showToast('Loja atualizada!');
    } catch (error: any) {
      console.error('Error updating store:', error);
      showToast('Erro ao atualizar loja');
    }
  };

  // ==========================================
  // FAVORITOS (favoritos uses profile_id)
  // ==========================================

  const toggleFavoriteStore = async (storeId: string) => {
    if (!user) return;

    try {
      const isFavorite = favorites.includes(storeId);

      if (isFavorite) {
        await supabase
          .from('favoritos')
          .delete()
          .eq('profile_id', user.id)
          .eq('loja_id', storeId);
        setFavorites(prev => prev.filter(id => id !== storeId));
      } else {
        await supabase
          .from('favoritos')
          .insert({ profile_id: user.id, loja_id: storeId });
        setFavorites(prev => [...prev, storeId]);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
    }
  };

  const toggleFavoriteProduct = async (productId: string) => {
    if (!user) return;

    try {
      const isFavorite = favoriteProducts.includes(productId);

      if (isFavorite) {
        await supabase
          .from('favoritos')
          .delete()
          .eq('profile_id', user.id)
          .eq('produto_id', productId);
        setFavoriteProducts(prev => prev.filter(id => id !== productId));
      } else {
        await supabase
          .from('favoritos')
          .insert({ profile_id: user.id, produto_id: productId });
        setFavoriteProducts(prev => [...prev, productId]);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
    }
  };

  // ==========================================
  // SELECAO DE PEDIDO
  // ==========================================

  const selectOrder = (order: Order | null) => {
    setSelectedOrder(order);
  };

  // ==========================================
  // GPS EM TEMPO REAL
  // ==========================================

  const subscribeToOrderLocations = (pedidoId: string) => {
    if (locationChannelRef.current) {
      supabase.removeChannel(locationChannelRef.current);
    }

    supabase
      .from('localizacoes_tempo_real')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const latest = new Map<string, any>();
          data.forEach((loc: any) => {
            if (!latest.has(loc.tipo_localizacao)) {
              latest.set(loc.tipo_localizacao, {
                id: loc.id,
                user_id: loc.user_id,
                pedido_id: loc.pedido_id,
                latitude: loc.latitude,
                longitude: loc.longitude,
                tipo_localizacao: loc.tipo_localizacao,
                created_at: loc.created_at,
              });
            }
          });
          setRealTimeLocations(Array.from(latest.values()) as RealTimeLocation[]);
        }
      });

    const channel = supabase
      .channel(`locations-${pedidoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'localizacoes_tempo_real',
          filter: `pedido_id=eq.${pedidoId}`,
        },
        (payload: any) => {
          const loc = payload.new;
          if (loc) {
            setRealTimeLocations(prev => {
              const filtered = prev.filter(l => l.tipo_localizacao !== loc.tipo_localizacao);
              return [...filtered, {
                id: loc.id,
                user_id: loc.user_id,
                pedido_id: loc.pedido_id,
                latitude: loc.latitude,
                longitude: loc.longitude,
                tipo_localizacao: loc.tipo_localizacao,
                created_at: loc.created_at,
              }];
            });
          }
        }
      )
      .subscribe();

    locationChannelRef.current = channel;
  };

  const unsubscribeFromLocations = () => {
    if (locationChannelRef.current) {
      supabase.removeChannel(locationChannelRef.current);
      locationChannelRef.current = null;
    }
    setRealTimeLocations([]);
  };

  const startGpsTracking = (pedidoId: string, tipo: 'cliente' | 'entregador' | 'loja') => {
    if (!user || !navigator.geolocation) return;

    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await saveGpsLocation(pedidoId, position.coords.latitude, position.coords.longitude, tipo);
      },
      (error) => {
        console.warn('GPS getCurrentPosition error (não crítico):', error.code, error.message);
        // Não bloquear - GPS pode falhar mas app continua funcionando
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
    );

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        await saveGpsLocation(pedidoId, position.coords.latitude, position.coords.longitude, tipo);
      },
      (error) => {
        console.warn('GPS watch error (não crítico):', error.code, error.message);
        // Código 3 = timeout, não é fatal
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
    );
  };

  const saveGpsLocation = async (pedidoId: string, lat: number, lng: number, tipo: string) => {
    if (!user) return;
    
    // Validar coordenadas antes de salvar
    if (typeof lat !== 'number' || typeof lng !== 'number' || 
        isNaN(lat) || isNaN(lng) ||
        lat < -90 || lat > 90 ||
        lng < -180 || lng > 180) {
      console.error('Coordenadas inválidas:', lat, lng);
      return;
    }
    
    try {
      await supabase
        .from('localizacoes_tempo_real')
        .upsert({
          profile_id: user.id,
          pedido_id: pedidoId,
          latitude: lat,
          longitude: lng,
          tipo: tipo,
        }, {
          onConflict: 'profile_id'
        });
    } catch (error) {
      console.error('Erro ao salvar localização:', error);
    }
  };

  const stopGpsTracking = () => {
    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
  };

  // ==========================================
  // MAP HELPER - ABRIR MAPA DO PEDIDO
  // ==========================================

  const openOrderMap = async (orderId: string) => {
    try {
      // Buscar pedido
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        showToast('Pedido não encontrado');
        return;
      }

      // Buscar loja
      const store = stores.find(s => s.id === order.storeId);
      if (!store) {
        showToast('Loja não encontrada');
        return;
      }

      // Validar coordenadas
      if (!store.lat || !store.lng) {
        showToast('Coordenadas da loja não disponíveis');
        return;
      }

      // Selecionar pedido
      setSelectedOrder(order);

      // Configurar mapa
      setMapConfig({
        mode: order.tipo_entrega === 'delivery' ? 'delivery' : 'pickup',
        storeName: store.name,
        storeLat: store.lat,
        storeLng: store.lng,
      });

      // Iniciar GPS tracking se for cliente ou entregador
      if (user?.role === 'CLIENTE') {
        startGpsTracking(orderId, 'cliente');
      } else if (user?.role === 'ENTREGADOR') {
        startGpsTracking(orderId, 'entregador');
      }

      // Navegar para o mapa
      setView('order-tracker');

      // Subscrever localizações em tempo real
      subscribeToOrderLocations(orderId);

    } catch (error) {
      console.error('Erro ao abrir mapa:', error);
      showToast('Erro ao abrir mapa do pedido');
    }
  };

  // ==========================================
  // TEMA E CONFIGURAÇÕES
  // ==========================================

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setDirectionsMode = (mode: boolean) => {
    setIsDirectionsMode(mode);
  };

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const contextValue: AppContextType = {
    // Navigation
    currentView,
    setView,
    goBack,
    viewHistory,
    
    // Selections
    selectedPart,
    selectPart,
    selectedStore,
    selectStore,
    selectedBrand,
    selectBrand,
    selectedChatStore,
    selectChatStore,
    
    // Cart
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    cartTotal,
    
    // User & Auth
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
    
    // Data
    parts,
    stores,
    orders,
    users,
    favorites,
    favoriteProducts,
    
    // Vendor specific
    vendorStore,

    // Selected order
    selectedOrder,
    selectOrder,

    // Real-time GPS
    realTimeLocations,
    subscribeToOrderLocations,
    unsubscribeFromLocations,
    startGpsTracking,
    stopGpsTracking,

    // Map helper
    openOrderMap,

    // Actions
    placeOrder,
    updateUserCar,
    updateStore,
    updateOrderStatus,
    toggleFavoriteStore,
    toggleFavoriteProduct,
    
    // Map & UI
    isDirectionsMode,
    setDirectionsMode,
    mapConfig,
    setMapConfig,
    toastMessage,
    showToast,
    
    // Settings
    theme,
    toggleTheme,
    language,
    setLanguage,
    currency,
    setCurrency,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
