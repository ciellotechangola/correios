/**
 * Testes Unitários - Database Service
 * 
 * Testa as funções de banco de dados e operações CRUD
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../services/supabaseClient';
import {
  fetchProdutos,
  fetchLojas,
  createPedido,
  updatePedidoStatus,
  fetchPedidosByUser,
  searchProdutos,
} from '../../services/database';

// Mock do Supabase
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(),
          })),
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        ilike: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
}));

describe('Database Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchProdutos', () => {
    it('deve buscar produtos por loja', async () => {
      const mockProdutos = [
        { id: 'prod-1', nome: 'Peça 1', preco: 100 },
        { id: 'prod-2', nome: 'Peça 2', preco: 200 },
      ];

      vi.mocked(supabase.from('').select('').eq('').order).mockResolvedValue({
        data: mockProdutos,
        error: null,
      });

      const result = await fetchProdutos('loja-123');

      expect(result).toEqual(mockProdutos);
      expect(supabase.from).toHaveBeenCalledWith('produtos');
    });

    it('deve retornar array vazio em caso de erro', async () => {
      vi.mocked(supabase.from('').select('').eq('').order).mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await fetchProdutos('loja-123');

      expect(result).toEqual([]);
    });
  });

  describe('fetchLojas', () => {
    it('deve buscar todas as lojas ativas', async () => {
      const mockLojas = [
        { id: 'loja-1', nome: 'Loja A', is_open: true },
        { id: 'loja-2', nome: 'Loja B', is_open: true },
      ];

      vi.mocked(supabase.from('').select('').eq('').order).mockResolvedValue({
        data: mockLojas,
        error: null,
      });

      const result = await fetchLojas();

      expect(result).toEqual(mockLojas);
    });

    it('deve filtrar por província', async () => {
      vi.mocked(supabase.from('').select('').eq('').order).mockResolvedValue({
        data: [{ id: 'loja-1', nome: 'Loja Luanda', provincia: 'Luanda' }],
        error: null,
      });

      const result = await fetchLojas('Luanda');

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('createPedido', () => {
    it('deve criar pedido com sucesso', async () => {
      const mockPedido = {
        id: 'pedido-123',
        user_id: 'user-123',
        loja_id: 'loja-123',
        valor_total: 500,
        status: 'PENDENTE',
      };

      vi.mocked(supabase.from('').insert('').select('').single).mockResolvedValue({
        data: mockPedido,
        error: null,
      });

      const result = await createPedido({
        userId: 'user-123',
        lojaId: 'loja-123',
        itens: [{ produtoId: 'prod-1', quantidade: 2, preco: 250 }],
        tipoEntrega: 'ENTREGA',
      });

      expect(result.success).toBe(true);
      expect(result.pedido).toEqual(mockPedido);
    });

    it('deve retornar erro ao criar pedido', async () => {
      vi.mocked(supabase.from('').insert('').select('').single).mockResolvedValue({
        data: null,
        error: new Error('Insufficient stock'),
      });

      const result = await createPedido({
        userId: 'user-123',
        lojaId: 'loja-123',
        itens: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
    });
  });

  describe('updatePedidoStatus', () => {
    it('deve atualizar status do pedido', async () => {
      const mockPedido = {
        id: 'pedido-123',
        status: 'EM_ROTA',
      };

      vi.mocked(supabase.from('').update('').eq('').select('').single).mockResolvedValue({
        data: mockPedido,
        error: null,
      });

      const result = await updatePedidoStatus('pedido-123', 'EM_ROTA', 'entregador-123');

      expect(result.success).toBe(true);
      expect(result.pedido?.status).toBe('EM_ROTA');
    });

    it('deve retornar erro se pedido não existir', async () => {
      vi.mocked(supabase.from('').update('').eq('').select('').single).mockResolvedValue({
        data: null,
        error: new Error('Pedido not found'),
      });

      const result = await updatePedidoStatus('non-existent', 'ENTREGUE');

      expect(result.success).toBe(false);
    });
  });

  describe('fetchPedidosByUser', () => {
    it('deve buscar pedidos do usuário', async () => {
      const mockPedidos = [
        { id: 'pedido-1', status: 'PENDENTE', valor_total: 100 },
        { id: 'pedido-2', status: 'ENTREGUE', valor_total: 200 },
      ];

      vi.mocked(supabase.from('').select('').eq('').order).mockResolvedValue({
        data: mockPedidos,
        error: null,
      });

      const result = await fetchPedidosByUser('user-123');

      expect(result).toEqual(mockPedidos);
    });

    it('deve retornar array vazio se sem pedidos', async () => {
      vi.mocked(supabase.from('').select('').eq('').order).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await fetchPedidosByUser('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('searchProdutos', () => {
    it('deve buscar produtos por termo', async () => {
      const mockProdutos = [
        { id: 'prod-1', nome: 'Filtro de Óleo', preco: 50 },
        { id: 'prod-2', nome: 'Filtro de Ar', preco: 30 },
      ];

      vi.mocked(supabase.from('').select('').ilike('').order).mockResolvedValue({
        data: mockProdutos,
        error: null,
      });

      const result = await searchProdutos('filtro');

      expect(result).toEqual(mockProdutos);
      expect(supabase.from('').select('').ilike).toHaveBeenCalledWith('nome', expect.stringContaining('filtro'));
    });

    it('deve buscar por categoria', async () => {
      vi.mocked(supabase.from('').select('').eq('').order).mockResolvedValue({
        data: [{ id: 'prod-1', categoria: 'Motor', nome: 'Peça X' }],
        error: null,
      });

      const result = await searchProdutos('', 'Motor');

      expect(result.length).toBeGreaterThan(0);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      vi.mocked(supabase.from('').select('').ilike('').order).mockResolvedValue({
        data: null,
        error: new Error('Search failed'),
      });

      const result = await searchProdutos('termo');

      expect(result).toEqual([]);
    });
  });
});
