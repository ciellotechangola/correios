/**
 * Patch de Correções - AppContext.tsx
 * Data: 2026-04-30
 * 
 * Este arquivo contém correções incrementais para o AppContext.tsx
 * Aplica as correções manualmente替换 partes do código.
 * 
 * CORREÇÕES APLICADAS NESTE PATCH:
 * 1. Remoção de console.log desnecessários (mantém apenas logs críticos)
 * 2. Adição de tratamento de erros consistente
 * 3. Uso de valores padrão seguros para evitar nulls
 */

import { logger } from '../utils/logger';
import { mapUser, mapStore, mapPart, mapOrder } from '../utils/mappers';

// ============================================
// CORREÇÃO 1: loadPublicData - Usar logger
// SUBSTITUIR a função loadPublicData por:

const loadPublicData = async () => {
  try {
    // Fetch Stores
    const { data: storesData, error: storesError } = await supabase
      .from('lojas')
      .select('*')
      .order('nome');

    if (!storesError && storesData) {
      logger.success('Data', `Stores loaded: ${storesData.length}`);
      setStores(storesData.map(mapStore));
    } else if (storesError) {
      logger.error('Data', 'Error loading stores:', storesError.message);
    }

    // Fetch Parts
    const { data: partsData, error: partsError } = await supabase
      .from('produtos')
      .select('*')
      .order('nome');

    if (!partsError && partsData) {
      logger.success('Data', `Parts loaded: ${partsData.length}`);
      setParts(partsData.map(mapPart));
    } else if (partsError) {
      logger.error('Data', 'Error loading parts:', partsError.message);
    }

    // Fetch Users
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .order('nome');

    if (!usersError && usersData) {
      setUsers(usersData.map(u => mapUser(u)));
    }
  } catch (error) {
    logger.error('AppContext', 'Error loading public data:', error);
  }
};

// ============================================
// CORREÇÃO 2: loadUserProfile - Usar logger e tratamento de erros
// SUBSTITUIR parte do loadUserProfile:

const loadUserProfile = async (userId: string) => {
  try {
    setIsLoading(true);
    logger.info('Auth', 'Loading user profile...');

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    // Se perfil não existir, criar automaticamente
    if (userError || !userData) {
      logger.warn('Auth', 'User profile not found, creating one...');
      
      // Buscar dados do Auth para usar como base
      const { data: authUser } = await supabase.auth.getUser();
      const email = authUser?.user?.email || '';
      const nome = authUser?.user?.user_metadata?.nome || email.split('@')[0];
      
      // Criar perfil padrão
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
        .single();
      
      if (createError) {
        logger.error('Auth', 'Error creating user profile:', createError);
        setIsLoading(false);
        return;
      }
      
      logger.success('Auth', 'User profile created');
      
      // Fetch user's car (if CLIENTE)
      let car: Car | undefined;
      const { data: carData } = await supabase
        .from('veiculos')
        .select('*')
        .eq('profile_id', userId)
        .single();
      
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

      const mappedUser = mapUser(newProfile, car);
      setUser(mappedUser);
      setIsAuthenticated(true);
      
      // Fetch user's orders
      await loadUserOrders(userId, newProfile.role);
      
      // Fetch user's favorites
      await loadUserFavorites(userId);
      
      // Redirect based on role
      redirectBasedOnRole(newProfile.role);
      
      setIsLoading(false);
      return;
    }

    logger.info('Auth', `User profile loaded: ${userData.role}`);

    // Resto do código permanece igual...
    // Fetch user's car, store, etc.
    // ...

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
    logger.error('AppContext', 'Error loading user profile:', error);
    showToast('Erro ao carregar perfil');
  } finally {
    setIsLoading(false);
  }
};

// ============================================
// CORREÇÃO 3: saveGpsLocation - Validação melhorada
// SUBSTITUIR a função saveGpsLocation:

const saveGpsLocation = async (pedidoId: string, lat: number, lng: number, tipo: string) => {
  if (!user) return;
  
  // Validar coordenadasantes de salvar
  if (typeof lat !== 'number' || typeof lng !== 'number' || 
      isNaN(lat) || isNaN(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180) {
    logger.warn('GPS', 'Invalid coordinates:', { lat, lng });
    return;
  }
  
  try {
    const { error } = await supabase
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
      
    if (error) {
      logger.error('GPS', 'Error saving location:', error);
    }
  } catch (error) {
    logger.error('GPS', 'Exception saving location:', error);
  }
};

// ============================================
// CORREÇÃO 4: placeOrder - Tratamento de erros melhorado
// SUBSTITUIR a função placeOrder:

const placeOrder = async () => {
  if (!user || cart.length === 0) {
    showToast('Carrinho vazio ou usuário não logado');
    return;
  }

  const storeId = cart[0]?.storeId;
  const total = cartTotal;
  const logisticsOption = cart[0]?.logisticsOption;

  try {
    logger.info('Orders', 'Placing order...');

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('pedidos')
      .insert({
        user_id: user.id,
        loja_id: storeId,
        valor_total: total,
        status: 'PENDENTE',
        tipo_entrega: logisticsOption?.type === 'delivery' ? 'delivery' : 'pickup',
        endereco_entrega: logisticsOption?.type === 'delivery' ? 'A definir' : null,
      })
      .select()
      .single();

    if (orderError) {
      logger.error('Orders', 'Error creating order:', orderError);
      showToast('Erro ao criar pedido: ' + orderError.message);
      return;
    }

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

      if (itemsError) {
        logger.error('Orders', 'Error adding items:', itemsError);
      }

      // Create delivery record if needed
      if (logisticsOption?.type === 'delivery') {
        await supabase.from('entregas').insert({
          pedido_id: orderData.id,
          status: 'AGUARDANDO',
        }).catch(err => logger.warn('Orders', 'Delivery creation warning:', err));
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
      logger.success('Orders', 'Order placed successfully');
      showToast('Pedido realizado com sucesso!');
    }
  } catch (error: any) {
    logger.error('Orders', 'Error placing order:', error);
    showToast('Erro ao realizar pedido: ' + (error?.message || 'Erro desconhecido'));
  }
};

// ============================================
// EXPORTAÇÕES
// ============================================

export const patches = {
  loadPublicData,
  loadUserProfile,
  saveGpsLocation,
  placeOrder,
};

export default patches;