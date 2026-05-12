-- ============================================
-- CORREÇÃO COMPLETA DO LOGIN - CORREIOS DE LUANDA
-- Problema: Sistema cria conta mas login não funciona
-- Solução: RLS correto + Trigger de sincronização + Dados de teste
-- ============================================

-- ============================================
-- PASSO 1: DESABILITAR RLS TEMPORARIAMENTE PARA DEBUG
-- ============================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 2: APAGAR TRIGGERS ANTIGOS E RECRIAR
-- ============================================

-- Drop trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Criar função para criar profile automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Verificar se profile já existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (
      id,
      email,
      nome,
      role,
      status_conta,
      provincia,
      is_online,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email::text),
      COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENTE'),
      'ATIVO',
      COALESCE(NEW.raw_user_meta_data->>'provincia', 'Luanda'),
      true,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- PASSO 3: CRIAR USUÁRIOS DE TESTE (para verificação)
-- ============================================

-- Primeiro criar no auth.users (via dashboard do Supabase)
-- Depois executar este script para sincronizar

-- Usuário Cliente de teste
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Verificar se usuário existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'joao@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Inserir/atualizar profile
    INSERT INTO public.profiles (
      id, email, nome, role, status_conta, provincia, is_online, created_at, updated_at
    ) VALUES (
      v_user_id,
      'joao@gmail.com',
      'João Silva',
      'CLIENTE',
      'ATIVO',
      'Luanda',
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      nome = EXCLUDED.nome,
      role = EXCLUDED.role,
      status_conta = EXCLUDED.status_conta,
      is_online = true;
      
    RAISE NOTICE 'Cliente criado/atualizado: joao@gmail.com';
  ELSE
    RAISE NOTICE 'Cliente não encontrado no Auth - criar via signup primeiro';
  END IF;
END $$;

-- ============================================
-- PASSO 4: REABILITAR RLS COM POLÍTICAS CORRETAS
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles -允许 usuário ver/atualizar próprio profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para lojas
DROP POLICY IF EXISTS "Anyone can view stores" ON public.lojas;
DROP POLICY IF EXISTS "Owners can manage stores" ON public.lojas;

CREATE POLICY "Anyone can view stores" ON public.lojas
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage stores" ON public.lojas
  FOR ALL USING (auth.uid() = owner_id);

-- ============================================
-- PASSO 5: VERIFICAR CONEXÃO
-- ============================================

-- Teste: Verificar se há profiles na tabela
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT id, email, nome, role FROM public.profiles LIMIT 10;

-- ============================================
-- INSTRUÇÕES PARA EXECUTAR:
-- 1. Vá ao Supabase Dashboard > SQL Editor
-- 2. Cole este script e execute
-- 3. Depois vá ao app e teste o login com:
--    Email: joao@gmail.com
--    Senha: 123456
-- ============================================

-- ============================================
-- SE PROBLEMA PERSISTIR - Script alternativo
-- ============================================
/*
Se ainda não funcionar, o problema pode ser que:
1. O email não foi confirmado
2. A senha está errada
3. O usuário não existe no auth.users

Para criar usuário de teste via SQL (requer service_role key):
*/

-- Criar usuário diretamente (descomente se necessário)
-- SELECT auth.signup('joao@gmail.com', '123456', '{"nome":"João Silva","role":"CLIENTE"}');