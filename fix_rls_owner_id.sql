-- ============================================================
-- CORREÇÃO RLS: user_id → owner_id
-- Executar no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- LOJAS: Corrigir política owner_crud_lojas
-- ============================================================

-- Verificar políticas existentes
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'lojas';

-- Dropar políticas antigas se existirem
DROP POLICY IF EXISTS "owner_crud_lojas" ON public.lojas;
DROP POLICY IF EXISTS "public_read_lojas" ON public.lojas;
DROP POLICY IF EXISTS "admin_all_lojas" ON public.lojas;

-- Criar políticas corretas com owner_id
-- Qualquer pessoa pode ver lojas ativas
CREATE POLICY "public_read_lojas" ON public.lojas
  FOR SELECT USING (deleted_at IS NULL);

-- Donos de loja podem gerenciar suas lojas (corrigido para owner_id)
CREATE POLICY "owner_crud_lojas" ON public.lojas
  FOR ALL USING (auth.uid() = owner_id);

-- Admins podem gerenciar todas as lojas
CREATE POLICY "admin_all_lojas" ON public.lojas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN_MASTER')
  );

-- ============================================================
-- PRODUTOS: Corrigir políticas para usar owner_id
-- ============================================================

DROP POLICY IF EXISTS "owner_crud_produtos" ON public.produtos;
DROP POLICY IF EXISTS "public_read_produtos" ON public.produtos;

-- Qualquer pessoa pode ver produtos ativos
CREATE POLICY "public_read_produtos" ON public.produtos
  FOR SELECT USING (deleted_at IS NULL);

-- Donos de loja podem gerenciar seus produtos (corrigido para owner_id)
CREATE POLICY "owner_crud_produtos" ON public.produtos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.lojas WHERE id = produtos.loja_id AND owner_id = auth.uid())
  );

-- ============================================================
-- PEDIDOS: Corrigir políticas para usar owner_id
-- ============================================================

DROP POLICY IF EXISTS "owner_crud_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "public_read_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "owner_read_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "owner_insert_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "loja_update_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "cliente_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "loja_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "read_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "insert_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "update_pedidos" ON public.pedidos;

-- Clientes e lojas podem ver pedidos (corrigido para owner_id)
CREATE POLICY "owner_read_pedidos" ON public.pedidos
  FOR SELECT USING (
    auth.uid() = cliente_id OR
    EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND owner_id = auth.uid())
  );

-- Clientes podem criar pedidos
CREATE POLICY "owner_insert_pedidos" ON public.pedidos
  FOR INSERT WITH CHECK (auth.uid() = cliente_id);

-- Lojas podem atualizar status dos pedidos (corrigido para owner_id)
CREATE POLICY "loja_update_pedidos" ON public.pedidos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND owner_id = auth.uid())
  );

-- ============================================================
-- AVALIACOES: Corrigir políticas
-- ============================================================

DROP POLICY IF EXISTS "owner_crud_avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "public_read_avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "user_avaliacoes" ON public.avaliacoes;

CREATE POLICY "owner_crud_avaliacoes" ON public.avaliacoes
  FOR ALL USING (auth.uid() = profile_id);

-- ============================================================
-- FAVORITOS: Corrigir políticas
-- ============================================================

DROP POLICY IF EXISTS "owner_crud_favoritos" ON public.favoritos;
DROP POLICY IF EXISTS "user_favoritos" ON public.favoritos;

CREATE POLICY "owner_crud_favoritos" ON public.favoritos
  FOR ALL USING (auth.uid() = profile_id);

-- ============================================================
-- FUNCIONARIOS: Corrigir políticas
-- ============================================================

DROP POLICY IF EXISTS "owner_crud_funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "loja_funcionarios" ON public.funcionarios;

CREATE POLICY "owner_crud_funcionarios" ON public.funcionarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND owner_id = auth.uid())
  );

-- ============================================================
-- MENSAGENS: Corrigir políticas
-- ============================================================

DROP POLICY IF EXISTS "owner_crud_mensagens" ON public.mensagens;
DROP POLICY IF EXISTS "read_mensagens" ON public.mensagens;
DROP POLICY IF EXISTS "insert_mensagens" ON public.mensagens;

CREATE POLICY "owner_crud_mensagens" ON public.mensagens
  FOR ALL USING (
    auth.uid() = remetente_id OR
    auth.uid() = destinatario_id OR
    EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND owner_id = auth.uid())
  );

-- ============================================================
-- VERIFICAR
-- ============================================================

-- Listar todas as políticas da tabela lojas
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'lojas';
