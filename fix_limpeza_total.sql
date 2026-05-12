-- ============================================
-- LIMPEZA E RESYNC COMPLETO
-- ============================================

-- 1. Verificar situação atual
SELECT '=== AUTH.USERS ===' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

SELECT '=== LOJAS ===' as info;
SELECT id, user_id, nome FROM public.lojas;

SELECT '=== USUARIOS ANTES DA LIMPEZA ===' as info;
SELECT id, email, role FROM public.usuarios;

-- 2. Desabilitar temporariamente as constraints
ALTER TABLE public.lojas DROP CONSTRAINT IF EXISTS lojas_user_id_fkey;
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_loja_id_fkey;
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_user_id_fkey;
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_loja_id_fkey;

-- 3. Limpar tabela usuarios
TRUNCATE public.usuarios CASCADE;

-- 4. Resync do zero
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users
  LOOP
    INSERT INTO public.usuarios (id, email, role, nome, telefone, is_online, provincia, cidade)
    VALUES (
      u.id,
      u.email,
      COALESCE((u.raw_user_meta_data->>'role'), 'CLIENTE'),
      COALESCE((u.raw_user_meta_data->>'nome'), split_part(u.email, '@', 1)),
      u.raw_user_meta_data->>'telefone',
      true,
      'Luanda',
      'Luanda'
    );
    RAISE NOTICE 'Sincronizado: %', u.email;
  END LOOP;
END $$;

-- 5. Recriar as constraints
ALTER TABLE public.lojas ADD CONSTRAINT lojas_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_loja_id_fkey 
  FOREIGN KEY (loja_id) REFERENCES public.lojas(id) ON DELETE CASCADE;

-- 6. Verificar resultado final
SELECT '=== RESULTADO FINAL ===' as info;
SELECT 'auth.users: ' || count(*) as total FROM auth.users
UNION ALL
SELECT 'public.usuarios: ' || count(*) FROM public.usuarios
UNION ALL
SELECT 'lojas: ' || count(*) FROM public.lojas;

-- 7. Verificar se estrela@gmail.com está sincronizado
SELECT 
  'ESTRELA.GMAIL.COM STATUS:' as info,
  CASE WHEN EXISTS (SELECT 1 FROM public.usuarios WHERE email = 'estrela@gmail.com') 
       THEN '✅ ENCONTRADO' 
       ELSE '❌ FALTANDO' 
  END as status;

SELECT '✅ LIMPEZA COMPLETA - faça login novamente!' as status;