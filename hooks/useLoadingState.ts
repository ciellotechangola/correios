/**
 * Hook de Loading State - Correios de Luanda
 * Data: 2026-04-30
 * 
 *用法:
 * import { useLoadingState } from '../hooks/useLoadingState';
 * 
 * const { isLoading, startLoading, stopLoading, withLoading } = useLoadingState();
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

interface LoadingStateOptions {
  /** Callback chamado quando loading termina */
  onComplete?: () => void;
  /** Mensagem inicial */
  initialMessage?: string;
}

interface UseLoadingStateReturn {
  /** Estado de loading atual */
  isLoading: boolean;
  /** Mensagem atual */
  message: string | null;
  /** Iniciar loading com mensagem opcional */
  startLoading: (message?: string) => void;
  /** Parar loading */
  stopLoading: (message?: string) => void;
  /** Wrapped para operações com loading automático */
  withLoading: <T>(operation: () => Promise<T>, message?: string) => Promise<T>;
  /** Loading para múltiplas operações paralelas */
  withMultipleLoading: <T>(operations: (() => Promise<T>)[], message?: string) => Promise<T[]>;
}

export const useLoadingState = (options?: LoadingStateOptions): UseLoadingStateReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(options?.initialMessage || null);
  const loadingCountRef = useRef(0);

  /**
   * Iniciar estado de loading
   */
  const startLoading = useCallback((msg?: string) => {
    loadingCountRef.current++;
    setIsLoading(true);
    if (msg) {
      setMessage(msg);
    }
    logger.debug('Loading', 'Started', msg || 'Operation');
  }, []);

  /**
   * Parar estado de loading
   */
  const stopLoading = useCallback((msg?: string) => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    if (loadingCountRef.current === 0) {
      setIsLoading(false);
      setMessage(null);
      options?.onComplete?.();
    }
    logger.debug('Loading', 'Stopped', msg || 'Operation');
  }, [options]);

  /**
   * Wrapped para operações assíncronas
   */
  const withLoading = useCallback(<T>(
    operation: () => Promise<T>, 
    msg?: string
  ): Promise<T> => {
    return (async () => {
      startLoading(msg);
      try {
        const result = await operation();
        stopLoading();
        return result;
      } catch (error) {
        stopLoading();
        throw error;
      }
    })();
  }, [startLoading, stopLoading]);

  /**
   * Loading para múltiplas operações
   */
  const withMultipleLoading = useCallback(<T>(
    operations: (() => Promise<T>)[], 
    msg?: string
  ): Promise<T[]> => {
    return (async () => {
      startLoading(msg || `Carregando ${operations.length} itens...`);
      try {
        const results = await Promise.all(operations.map(op => op()));
        stopLoading();
        return results;
      } catch (error) {
        stopLoading();
        throw error;
      }
    })();
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    message,
    startLoading,
    stopLoading,
    withLoading,
    withMultipleLoading,
  };
};

export default useLoadingState;