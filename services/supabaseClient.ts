/**
 * Cliente Supabase Centralizado - CORRIGIDO
 * Arquivo único para configuração do Supabase
 * Uso: import { supabase } from '../services/supabaseClient';
 * 
 * Data da correção: 2026-05-09
 * Alterações: Tratamento robusto de erros na inicialização
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

// ============================================
// CONFIGURAÇÃO (variáveis de ambiente)
// ============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ============================================
// CRIAÇÃO DO CLIENTE (NUNCA LANÇA ERRO)
// ============================================

// Criar cliente mesmo se config estiver incompleta - app continua funcionando
const supabaseOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
};

// Só criar cliente se tiver URL e key válidas
let supabase: ReturnType<typeof createClient<Database>>;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, supabaseOptions);
  console.log('✅ Supabase client inicializado');
} else {
  console.warn('⚠️ Configuração Supabase incompleta - usando modo de demonstração');
  supabase = createClient<Database>('https://placeholder.supabase.co', 'placeholder-key', supabaseOptions);
}

// ============================================
// HELPERS DE VERIFICAÇÃO
// ============================================

/**
 * Verificar conexão com Supabase
 */
export const checkSupabaseConnection = async (): Promise<{ connected: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('usuarios')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    return { connected: true, error: null };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
};

/**
 * Verificar sessão ativa
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }
  return data.session;
};

/**
 * Verificar se usuário está autenticado
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getSession();
  return !!session?.user;
};

/**
 * Obter ID do usuário atual
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const session = await getSession();
  return session?.user?.id || null;
};

// ============================================
// EXPORTAÇÕES
// ============================================

export { supabase };