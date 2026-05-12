/**
 * Testes Unitários - Auth Service
 * 
 * Testa as funções do módulo de autenticação
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../services/supabaseClient';
import {
  signIn,
  signUp,
  signOut,
  getCurrentSession,
  getCurrentUser,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  isVendor,
  isClient,
  isDelivery,
  isAdmin,
} from '../../services/auth';

// Mock do Supabase
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(),
          })),
        })),
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(),
        })),
      })),
    })),
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('deve retornar sucesso com credenciais válidas', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123' };
      
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await signIn('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('deve retornar erro com credenciais inválidas', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
      });

      const result = await signIn('wrong@example.com', 'wrongpass');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email ou senha incorretos');
    });

    it('deve tratar erro de rede', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(
        new Error('Failed to fetch')
      );

      const result = await signIn('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro de conexão');
    });
  });

  describe('signUp', () => {
    it('deve criar usuário com sucesso', async () => {
      const mockUser = { id: 'user-123', email: 'new@example.com' };
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      const result = await signUp('new@example.com', 'password123', 'Test User', '923456789');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.needsEmailConfirmation).toBe(false);
    });

    it('deve requerer confirmação de email', async () => {
      const mockUser = { id: 'user-123', email: 'new@example.com' };
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await signUp('new@example.com', 'password123', 'Test User');

      expect(result.success).toBe(true);
      expect(result.needsEmailConfirmation).toBe(true);
    });

    it('deve retornar erro com email inválido', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email', code: 'invalid_email' },
      });

      const result = await signUp('invalid-email', 'password123', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email inválido');
    });
  });

  describe('signOut', () => {
    it('deve fazer logout com sucesso', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('deve retornar erro no logout', async () => {
      vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('Logout failed'));

      const result = await signOut();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Logout failed');
    });
  });

  describe('getCurrentSession', () => {
    it('deve retornar sessão ativa', async () => {
      const mockSession = { access_token: 'token-123', user: { id: 'user-123' } };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await getCurrentSession();

      expect(result).toEqual(mockSession);
    });

    it('deve retornar null sem sessão', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await getCurrentSession();

      expect(result).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    it('deve retornar perfil do usuário', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        nome: 'Test User',
        role: 'CLIENTE',
      };

      vi.mocked(supabase.from('').select('').eq('').maybeSingle).mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await getUserProfile('user-123');

      expect(result).toEqual(mockProfile);
    });

    it('deve retornar null se perfil não existir', async () => {
      vi.mocked(supabase.from('').select('').eq('').maybeSingle).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getUserProfile('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createUserProfile', () => {
    it('deve criar perfil com upsert', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        nome: 'Test User',
        role: 'CLIENTE',
      };

      vi.mocked(supabase.from('').upsert('').select('').maybeSingle).mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await createUserProfile('user-123', 'test@example.com', 'Test User', 'CLIENTE');

      expect(result.success).toBe(true);
      expect(result.profile).toEqual(mockProfile);
    });
  });

  describe('updateUserProfile', () => {
    it('deve atualizar perfil', async () => {
      vi.mocked(supabase.from('').update('').eq('').select()).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await updateUserProfile('user-123', { nome: 'New Name' });

      expect(result.success).toBe(true);
    });
  });

  describe('Permission helpers', () => {
    it('isVendor deve retornar true apenas para VENDEDOR', () => {
      expect(isVendor('VENDEDOR')).toBe(true);
      expect(isVendor('CLIENTE')).toBe(false);
      expect(isVendor(undefined)).toBe(false);
    });

    it('isClient deve retornar true apenas para CLIENTE', () => {
      expect(isClient('CLIENTE')).toBe(true);
      expect(isClient('VENDEDOR')).toBe(false);
    });

    it('isDelivery deve retornar true apenas para ENTREGADOR', () => {
      expect(isDelivery('ENTREGADOR')).toBe(true);
      expect(isDelivery('CLIENTE')).toBe(false);
    });

    it('isAdmin deve retornar true apenas para ADMIN_MASTER', () => {
      expect(isAdmin('ADMIN_MASTER')).toBe(true);
      expect(isAdmin('CLIENTE')).toBe(false);
    });
  });
});
