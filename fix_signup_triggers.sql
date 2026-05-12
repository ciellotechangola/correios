-- ============================================================
-- TRIGGERS: Auto-criar profile e loja no signup
-- Executar no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. CRIAR TRIGGER PARA AUTO-CRIAR PROFILE
-- ============================================================

-- Função que cria perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir na tabela profiles
  INSERT INTO public.profiles (id, email, nome, telefone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'telefone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENTE')::text
  );

  -- Se for VENDEDOR, criar loja automaticamente
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENTE')::text = 'VENDEDOR' THEN
    INSERT INTO public.lojas (owner_id, nome, descricao, telefone, nicho)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nome_loja', NEW.raw_user_meta_data->>'name', 'Minha Loja'),
      'Loja criada automaticamente',
      NEW.raw_user_meta_data->>'telefone',
      'Universal'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar novo trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. TESTAR: Inserir usuário manualmente para teste
-- ============================================================

-- Para testar, você pode inserir um usuário fake em auth.users
-- (isso é apenas para teste, não use em produção)

/*
-- Exemplo de teste (NÃO executar em produção):
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
VALUES (
  gen_random_uuid(),
  'teste@vendedor.com',
  '{
    "nome": "João Vendedor",
    "nome_loja": "Loja do João",
    "telefone": "+244900000001",
    "role": "VENDEDOR"
  }'::jsonb,
  now()
);
*/

-- ============================================================
-- 3. CORRIGIR USUÁRIOS JÁ CADASTRADOS
-- ============================================================

-- Criar profiles para usuários que não têm
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, email, raw_user_meta_data->>'nome',
       COALESCE(raw_user_meta_data->>'role', 'CLIENTE')::text
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.users.id);

-- Criar lojas para vendedores que não têm
INSERT INTO public.lojas (owner_id, nome, descricao, telefone, nicho)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'nome_loja', 'Minha Loja'),
  'Loja criada automaticamente',
  u.raw_user_meta_data->>'telefone',
  'Universal'
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' = 'VENDEDOR'
AND NOT EXISTS (SELECT 1 FROM public.lojas WHERE owner_id = u.id);

-- ============================================================
-- 4. VERIFICAR
-- ============================================================

-- Ver usuários sem perfil
SELECT u.email, u.raw_user_meta_data->>'role' as role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id);

-- Ver vendedores sem loja
SELECT p.email, p.nome
FROM public.profiles p
WHERE p.role = 'VENDEDOR'
AND NOT EXISTS (SELECT 1 FROM public.lojas WHERE owner_id = p.id);
