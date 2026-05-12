-- ============================================
-- FIX: SYNC com verificação de duplicados
-- ============================================

-- 1. Primeiro, verificar a situação atual
SELECT 'auth.users' as fonte, id::text, email FROM auth.users ORDER BY email
UNION ALL
SELECT 'public.usuarios' as fonte, id::text, email FROM public.usuarios ORDER BY email;

-- 2. Criar função de sync CORRIGIDA
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS void AS $$
DECLARE
  u RECORD;
  count_new INTEGER := 0;
  count_exists INTEGER := 0;
BEGIN
  FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users
  LOOP
    -- Verificar se já existe pelo ID
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = u.id) THEN
      -- Verificar se já existe pelo email (com ID diferente)
      IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE email = u.email) THEN
        -- Inserir novo usuário
        INSERT INTO public.usuarios (id, email, role, nome, telefone, is_online)
        VALUES (
          u.id,
          u.email,
          COALESCE((u.raw_user_meta_data->>'role'), 'CLIENTE'),
          COALESCE((u.raw_user_meta_data->>'nome'), split_part(u.email, '@', 1)),
          u.raw_user_meta_data->>'telefone',
          true
        );
        count_new := count_new + 1;
      ELSE
        -- Email existe com ID diferente - atualizar com novo ID
        UPDATE public.usuarios 
        SET id = u.id, is_online = true, ultima_localizacao_at = NOW()
        WHERE email = u.email;
        count_new := count_new + 1;
      END IF;
    ELSE
      count_exists := count_exists + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Sincronizados: % novos, % já existiam', count_new, count_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Executar o sync
SELECT sync_user_from_auth();

-- 4. Verificar resultado
SELECT '✅ auth.users: ' || count(*)::text as info FROM auth.users
UNION ALL
SELECT '✅ public.usuarios: ' || count(*)::text FROM public.usuarios;