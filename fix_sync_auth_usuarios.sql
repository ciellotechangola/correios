-- ============================================
-- CORREÇÃO DEFINITIVA: SYNC auth.users → public.usuarios
-- ============================================
-- Execute TODO este script no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CRIAR FUNÇÃO DE SYNC (automaticamente cria perfil)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Verificar se o usuário já existe na tabela public.usuarios
  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.id) THEN
    -- Criar perfil na tabela public.usuarios
    INSERT INTO public.usuarios (id, email, role, nome, telefone, is_online)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        (NEW.raw_user_meta_data->>'role'),
        'CLIENTE'
      ),
      COALESCE(
        (NEW.raw_user_meta_data->>'nome'),
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(
        (NEW.raw_user_meta_data->>'telefone'),
        NULL
      ),
      true
    );
    RAISE NOTICE 'Perfil criado para usuário: %', NEW.email;
  ELSE
    -- Atualizar se existir
    UPDATE public.usuarios 
    SET 
      is_online = true,
      ultima_localizacao_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CRIAR TRIGGER NO auth.users
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. SYNC USUÁRIOS JÁ EXISTENTES
-- ============================================

DO $$
DECLARE
  u RECORD;
  count_synced INTEGER := 0;
BEGIN
  -- Para cada usuário no auth.users que não existe em public.usuarios
  FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = u.id) THEN
      INSERT INTO public.usuarios (id, email, role, nome, telefone, is_online)
      VALUES (
        u.id,
        u.email,
        COALESCE((u.raw_user_meta_data->>'role'), 'CLIENTE'),
        COALESCE((u.raw_user_meta_data->>'nome'), split_part(u.email, '@', 1)),
        u.raw_user_meta_data->>'telefone',
        true
      );
      count_synced := count_synced + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Sincronizados % usuários', count_synced;
END $$;

-- ============================================
-- 4. VERIFICAR RESULTADO
-- ============================================

-- Mostrar usuários no auth.users
SELECT 'auth.users:' as fonte, count(*) as total, string_agg(email, ', ') as emails 
FROM auth.users;

-- Mostrar usuários em public.usuarios
SELECT 'public.usuarios:' as fonte, count(*) as total, string_agg(email, ', ') as emails 
FROM public.usuarios;

-- Verificar se háMismatch
SELECT 
  CASE 
    WHEN a.total = u.total THEN '✅ PERFEITO: IDs coincidem'
    ELSE '⚠️ MISMATCH: auth=' || a.total || ' vs usuarios=' || u.total
  END as status
FROM 
  (SELECT count(*) as total FROM auth.users) a,
  (SELECT count(*) as total FROM public.usuarios) u;

-- ============================================
-- 5. TESTE DE LOGIN
-- ============================================

-- Verificar se o usuário estrela@gmail.com existe
SELECT 
  'auth.users' as tabela,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'estrela@gmail.com'

UNION ALL

SELECT 
  'public.usuarios' as tabela,
  id,
  email,
  created_at
FROM public.usuarios 
WHERE email = 'estrela@gmail.com';

SELECT '✅ Script executado! Agora teste login no app.' as status;