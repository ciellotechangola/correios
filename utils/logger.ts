/**
 * Sistema de Logging Centralizado - Correios de Luanda
 * Data: 2026-04-30
 * 
 *用法:
 * import { logger } from '../utils/logger';
 * logger.info('Auth', 'Login successful');
 * logger.error('App', 'Load failed', error);
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log informativo (apenas em desenvolvimento)
   */
  info: (context: string, ...args: unknown[]) => {
    if (isDev) {
      console.info(`[${context}]`, ...args);
    }
  },

  /**
   * Log de sucesso (apenas em desenvolvimento)
   */
  success: (context: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`%c[${context}] ✅`, 'color: #22c55e; font-weight: bold', ...args);
    }
  },

  /**
   * Log de erro (SEMPRE mostra, mesmo em produção)
   */
  error: (context: string, ...args: unknown[]) => {
    console.error(`[${context}] ❌`, ...args);
  },

  /**
   * Log de warning (apenas em desenvolvimento)
   */
  warn: (context: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(`[${context}] ⚠️`, ...args);
    }
  },

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug: (context: string, ...args: unknown[]) => {
    if (isDev) {
      console.debug(`[${context}] 🔍`, ...args);
    }
  },

  /**
   * Group logs (apenas em desenvolvimento)
   */
  group: (context: string, callback: () => void) => {
    if (isDev) {
      console.group(`[${context}]`);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  },

  /**
   * Table logs (apenas em desenvolvimento)
   */
  table: (context: string, data: unknown) => {
    if (isDev) {
      console.log(`[${context}]`);
      console.table(data);
    }
  },
};

export default logger;