-- ============================================
-- FIX: RLS POLICIES PARA SIGNUP
-- ============================================
-- Execute este script no Supabase SQL Editor
-- Resolve: "Erro de permissão. Execute o script fix_rls_recursion.sql"
-- ============================================

-- ============================================
-- 1. ADICIONAR POLÍTICA INSERT PARA USUARIOS
-- ============================================

-- Primeiro verificar se já existe
DO $$
BEGIN
  -- Remover policies duplicadas se existirem
  DROP POLICY IF EXISTS insert_usuarios ON public.usuarios;
  DROP POLICY IF EXISTS signup_usuarios ON public.usuarios;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policies não existiam, continuando...';
END $$;

-- Criar política INSERT para signup (novos usuários)
CREATE POLICY "signup_insert_usuarios" ON public.usuarios
  FOR INSERT
  WITH CHECK (true);  -- Qualquer pessoa pode criar (trigger no auth.users cria o usuário primeiro)

-- ============================================
-- 2. POLÍTICAS PARA LOJAS (CRUD completo)
-- ============================================

-- Verificar e adicionar políticas completas para lojas
DROP POLICY IF EXISTS insert_lojas ON public.lojas;
CREATE POLICY "insert_lojas" ON public.lojas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. POLÍTICAS PARA PRODUTOS
-- ============================================

DROP POLICY IF EXISTS insert_produtos ON public.produtos;
CREATE POLICY "insert_produtos" ON public.produtos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND user_id = auth.uid())
  );

-- ============================================
-- 4. VERIFICAR CONFIGURAÇÃO
-- ============================================

-- Mostrar todas as políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('usuarios', 'lojas', 'produtos')
ORDER BY tablename, policyname;

-- ============================================
-- 5. SE AINDA DER ERRO, DESABILITAR RLS TEMPORARIAMENTE
-- ============================================

-- Se os inserts continuarem falhando, execute:
-- ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.lojas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;

-- Para reabilitar depois:
-- ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

SELECT '✅ Script executado com sucesso! Tente fazer signup novamente.' as status;