/**
 * Hook de Tratamento de Erros - Correios de Luanda
 * Data: 2026-04-30
 * 
 *用法:
 * import { useErrorHandler } from '../hooks/useErrorHandler';
 * 
 * const { handleError, isLoading, withLoading } = useErrorHandler();
 */

import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';

interface ErrorContext {
  context: string;
  error: unknown;
  fallbackMessage?: string;
}

interface UseErrorHandlerReturn {
  /** Tratamento padrão de erros com toast */
  handleError: (context: string, error: unknown, fallbackMessage?: string) => void;
  /** Estado de loading global */
  isLoading: boolean;
  /** Wrapped para operações assíncronas com loading automático */
  withLoading: <T>(operation: () => Promise<T>, context: string) => Promise<T>;
  /** Resetar erro */
  clearError: () => void;
  /** Último erro capturado */
  lastError: ErrorContext | null;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<ErrorContext | null>(null);

  /**
   * Extrair mensagem de erro de forma segura
   */
  const extractErrorMessage = (error: unknown): string => {
    if (!error) return 'Erro desconhecido';
    
    // Objeto de erro do Supabase
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      
      // Supabase error format
      if (err.message && typeof err.message === 'string') {
        // Erros comuns do Supabase
        const message = err.message as string;
        if (message.includes('Invalid login credentials')) {
          return 'Email ou senha incorretos';
        }
        if (message.includes('already exists')) {
          return 'Este email já está cadastrado';
        }
        if (message.includes('not found')) {
          return 'Registro não encontrado';
        }
        if (message.includes('duplicate key')) {
          return 'Dados duplicados';
        }
        return message;
      }
      
      // Código de erro
      if (err.code && typeof err.code === 'string') {
        const code = err.code;
        if (code === 'PGRST116') return 'Registro não encontrado';
        if (code === '23505') return 'Dados duplicados';
        if (code === '23503') return 'Referência inválida';
        return `Erro: ${code}`;
      }
    }
    
    // String de erro
    if (typeof error === 'string') {
      return error;
    }
    
    // Fallback
    return 'Ocorreu um erro inesperado';
  };

  /**
   * Reportar erro para analytics (futuro)
   */
  const reportError = (context: string, error: unknown) => {
    // Placeholder para integração futura com analytics
    // reportErrorToSentry(context, error);
    logger.debug('ErrorReport', context, error);
  };

  /**
   * Tratamento padrão de erros
   */
  const handleError = useCallback((
    context: string, 
    error: unknown, 
    fallbackMessage?: string
  ) => {
    const message = fallbackMessage || extractErrorMessage(error);
    
    // Log do erro
    logger.error(context, message, error);
    
    // Reportar para analytics
    reportError(context, error);
    
    // Guardar último erro
    setLastError({ context, error, fallbackMessage: message });
  }, []);

  /**
   * Wrapped para operações assíncronas
   */
  const withLoading = useCallback(<T>(
    operation: () => Promise<T>, 
    context: string
  ): Promise<T> => {
    return (async () => {
      setIsLoading(true);
      try {
        const result = await operation();
        return result;
      } catch (error) {
        handleError(context, error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    })();
  }, [handleError]);

  /**
   * Limpar erro atual
   */
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    handleError,
    isLoading,
    withLoading,
    clearError,
    lastError,
  };
};

export default useErrorHandler;