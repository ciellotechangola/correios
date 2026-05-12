/**
 * Módulo de Autenticação - Correios de Luanda
 * Usa o cliente Supabase centralizado de supabaseClient.ts
 */

import { supabase } from './supabaseClient';
import type { User } from '../types';

// ==========================================
// MAPEAMENTO DE ERROS PROFISSIONAIS
// ==========================================

export const AuthErrorMessages: Record<string, string> = {
  'Invalid login credentials': 'Email ou senha incorretos',
  'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
  'User already registered': 'Este email já está cadastrado',
  'Invalid email': 'Email inválido',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
  'User not found': 'Conta não encontrada',
  'Signup requires a valid password': 'Senha inválida',
  'Signup requires a valid email': 'Email inválido',
  'Failed to fetch': 'Erro de conexão. Verifique sua internet.',
  'network_error': 'Erro de conexão. Verifique sua internet.',
};

/**
 * Obter mensagem de erro amigável
 */
export const getAuthErrorMessage = (error: any): string => {
  if (!error) return 'Erro desconhecido';
  
  const message = error.message || String(error);
  
  // Verificar se temos uma mensagem mapeada
  for (const [key, value] of Object.entries(AuthErrorMessages)) {
    if (message.includes(key)) {
      return value;
    }
  }
  
  // Verificar códigos de erro comuns
  if (error.status === 400) {
    if (message.includes('already')) return 'Este email já está cadastrado';
    if (message.includes('password')) return 'Senha deve ter pelo menos 6 caracteres';
    if (message.includes('invalid')) return 'Dados inválidos';
  }
  
  if (error.status === 422) {
    if (message.includes('already')) return 'Este email já está cadastrado';
  }
  
  // Fallback para mensagem genérica (não mostrar erro se for sucesso)
  console.warn('Auth error não mapeado:', error);
  return message || 'Erro ao processar autenticação';
};

// ==========================================
// FUNÇÕES DE AUTENTICAÇÃO
// ==========================================

/**
 * Login com email e senha - TRATAMENTO PROFISSIONAL
 */
export const signIn = async (email: string, password: string) => {
  try {
    console.log('🔐 signIn: Iniciando login...', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ signIn error:', error);
      return { 
        success: false, 
        error: getAuthErrorMessage(error),
        code: error.code 
      };
    }
    
    console.log('✅ signIn sucesso:', data.user?.id);
    // Login bem-sucedido
    return { success: true, user: data.user, session: data.session };
  } catch (error: any) {
    console.error('❌ signIn catch error:', error);
    return { 
      success: false, 
      error: getAuthErrorMessage(error)
    };
  }
};

/**
 * Registro de novo usuário - TRATAMENTO ROBUSTO
 */
export const signUp = async (
  email: string, 
  password: string, 
  nome: string,
  telefone?: string
): Promise<{ 
  success: boolean; 
  user?: any; 
  needsEmailConfirmation?: boolean;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          telefone,
          role: 'CLIENTE',
        },
      },
    });

    // ERRO: Mostrar mensagem mapeada
    if (error) {
      console.error('SignUp error:', error);
      return { 
        success: false, 
        error: getAuthErrorMessage(error),
        needsEmailConfirmation: false 
      };
    }
    
    // Verificar se há session (signUp com confirmação de email retorna user sem session)
    const needsConfirmation = !data.session && data.user;
    
    if (needsConfirmation) {
      // Email precisa de confirmação
      return { 
        success: true, 
        user: data.user,
        needsEmailConfirmation: true 
      };
    }
    
    // Cadastro direto (sem confirmação de email)
    return { success: true, user: data.user, needsEmailConfirmation: false };
  } catch (error: any) {
    console.error('SignUp error:', error);
    return { 
      success: false, 
      error: getAuthErrorMessage(error) 
    };
  }
};

/**
 * Login automático após cadastro
 */
export const autoLogin = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('AutoLogin error:', error);
      return { success: false, error: getAuthErrorMessage(error) };
    }
    
    return { success: true, user: data.user, session: data.session };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

/**
 * Criar perfil de usuário - COM UPSERT PARA EVITAR DUPLICADOS
 * USA A TABELA CORRETA: profiles
 */
export const createUserProfile = async (
  userId: string,
  email: string,
  nome: string,
  role: string = 'CLIENTE',
  telefone?: string
) => {
  try {
    // Usar upsert para garantir que não duplica - TABELA: profiles
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        nome,
        role,
        status_conta: 'ATIVO',
        telefone: telefone || null,
        provincia: 'Luanda',
        is_online: true,
      }, {
        onConflict: 'id'
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('createUserProfile error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, profile: data };
  } catch (error: any) {
    console.error('createUserProfile error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Logout
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('SignOut error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obter sessão atual
 */
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('GetSession error:', error);
    return null;
  }
};

/**
 * Obter usuário atual do Auth
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('GetUser error:', error);
    return null;
  }
};

/**
 * Buscar perfil completo do usuário (tabela public.profiles)
 * USA A TABELA CORRETA: profiles
 */
export const getUserProfile = async (userId: string) => {
  try {
    // USAR .maybeSingle() para evitar erro quando perfil não existe
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Usar maybeSingle() em vez de single()

    if (error) {
      console.warn('getUserProfile error:', error.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error('GetUserProfile error:', error);
    return null;
  }
};

/**
 * Buscar loja do vendedor
 */
export const getVendorStore = async (userId: string) => {
  try {
    // USAR .limit(1).maybeSingle() para evitar erro quando há múltiplas lojas
    const { data, error } = await supabase
      .from('lojas')
      .select('*')
      .eq('owner_id', userId)
      .limit(1)
      .maybeSingle(); // Usar maybeSingle() em vez de single()

    if (error) {
      console.warn('getVendorStore error:', error.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error('GetVendorStore error:', error);
    return null;
  }
};

/**
 * Buscar veículo do cliente
 */
export const getUserVehicle = async (userId: string) => {
  try {
    // USAR .maybeSingle() para evitar erro quando veículo não existe
    const { data, error } = await supabase
      .from('veiculos')
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle(); // Usar maybeSingle() em vez de single()

    if (error) {
      console.warn('getUserVehicle error:', error.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error('GetUserVehicle error:', error);
    return null;
  }
};

/**
 * Salvar/atualizar veículo do cliente
 */
export const saveUserVehicle = async (userId: string, vehicleData: Record<string, any>) => {
  try {
    // Verificar se já existe um veículo - USAR .maybeSingle() para evitar erro
    const { data: existingVehicle, error: checkError } = await supabase
      .from('veiculos')
      .select('id')
      .eq('profile_id', userId)
      .limit(1)
      .maybeSingle(); // Usar maybeSingle() em vez de single()

    if (checkError) {
      console.warn('Erro ao verificar veículo existente:', checkError.message);
    }

    let result;
    if (existingVehicle) {
      // Atualizar existente
      result = await supabase
        .from('veiculos')
        .update(vehicleData)
        .eq('id', existingVehicle.id)
        .select(); // Remover .single()
    } else {
      // Inserir novo - USAR profile_id (não user_id)
      result = await supabase
        .from('veiculos')
        .insert({
          profile_id: userId,
          ...vehicleData,
        })
        .select(); // Remover .single()
    }

    if (result.error) throw result.error;
    // Usar array access em vez de .data.id
    const resultData = result.data && result.data.length > 0 ? result.data[0] : null;
    return { success: true, data: resultData };
  } catch (error: any) {
    console.error('SaveUserVehicle error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Validar formato do VIN (17 caracteres alfanuméricos)
 */
export const validateVIN = (vin: string): boolean => {
  if (!vin) return true; // VIN é opcional
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(vin.toUpperCase());
};

/**
 * Listener para mudanças de autenticação
 */
export const onAuthStateChanged = (
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

/**
 * Reset de senha
 */
export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Atualizar perfil do usuário
 * USA A TABELA CORRETA: profiles
 */
export const updateUserProfile = async (
  userId: string,
  updates: Record<string, any>
) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Atualizar dados de auth do usuário
 */
export const updateAuthData = async (updates: {
  email?: string;
  password?: string;
  data?: {
    nome?: string;
    avatar_url?: string;
  };
}) => {
  try {
    const { error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ==========================================
// FUNÇÕES DE VERIFICAÇÃO DE PERMISSÕES
// ==========================================

export const isVendor = (role?: string) => role === 'VENDEDOR';
export const isClient = (role?: string) => role === 'CLIENTE';
export const isDelivery = (role?: string) => role === 'ENTREGADOR';
export const isAdmin = (role?: string) => role === 'ADMIN_MASTER';

// ==========================================
// EXPORTAÇÕES
// ==========================================

export { supabase } from './supabaseClient';