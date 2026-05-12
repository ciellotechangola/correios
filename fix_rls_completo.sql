-- ============================================
-- FIX COMPLETO RLS - CORREIOS DE LUANDA
-- ============================================
-- Execute TODO este script no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DESABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.localizacoes_tempo_real DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas_localizacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. VERIFICAR TABELAS
-- ============================================

SELECT 
  'usuarios' as tabela, count(*) as total FROM public.usuarios
UNION ALL SELECT 'lojas', count(*) FROM public.lojas
UNION ALL SELECT 'produtos', count(*) FROM public.produtos;

-- ============================================
-- 3. MOSTRAR USUÁRIOS NO AUTH
-- ============================================

SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- ============================================
-- 4. VERIFICAR SE HÁ DUPLICADOS
-- ============================================

SELECT email, count(*) as total FROM public.usuarios GROUP BY email HAVING count(*) > 1;

SELECT '✅ RLS desabilitado - tente login/cadastro novamente!' as status;