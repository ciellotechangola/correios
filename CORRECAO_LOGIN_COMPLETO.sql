-- ================================================
-- SCRIPT COMPLETO DE CORREÇÃO DO BANCO - CORREIOS
-- Data: 2026-05-09
-- Problema: Login não funciona
-- ================================================

-- ============================================
-- PARTE 1: SINCRONIZAÇÃO auth.users -> profiles
-- ============================================

-- Primeiro, verificar e criar a extensão UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela profiles (se não existir)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text,
  telefone text,
  avatar_url text,
  role text NOT NULL DEFAULT 'CLIENTE'::text CHECK (role = ANY (ARRAY['CLIENTE'::text, 'VENDEDOR'::text, 'ENTREGADOR'::text, 'ADMIN_MASTER'::text])),
  status_conta text NOT NULL DEFAULT 'ATIVO'::text CHECK (status_conta = ANY (ARRAY['ATIVO'::text, 'SUSPENSO'::text, 'BANIDO'::text])),
  provincia text,
  cidade text,
  bairro text,
  lat double precision,
  lng double precision,
  is_online boolean DEFAULT false,
  ultima_localizacao_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  location USER-DEFINED,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Criar trigger para criar profile automaticamente ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  nome_usuario text;
BEGIN
  -- Obter nome dos metadados ou usar parte do email
  nome_usuario := COALESCE(
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Inserir na tabela profiles
  INSERT INTO public.profiles (id, email, nome, role, status_conta, provincia, cidade, is_online, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    nome_usuario,
    COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENTE'),
    'ATIVO',
    COALESCE(NEW.raw_user_meta_data->>'provincia', 'Luanda'),
    COALESCE(NEW.raw_user_meta_data->>'cidade', 'Luanda'),
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = COALESCE(EXCLUDED.nome, profiles.nome),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PARTE 2: POLÍTICAS RLS
-- ================================================

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Criar políticas para profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can do everything with profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'ADMIN_MASTER'
    )
  );

-- ============================================
-- PARTE 3: ATUALIZAR REGISTROS EXISTENTES
-- ================================================

-- Sincronizar usuários existentes do auth.users para profiles
INSERT INTO public.profiles (id, email, nome, role, status_conta, is_online, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'nome',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'role', 'CLIENTE'),
  'ATIVO',
  true,
  au.created_at,
  now()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- ============================================
-- PARTE 4: CORRIGIR TABELAS RELACIONADAS
-- ================================================

-- Verificar e criar индекс para performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status_conta);

-- ============================================
-- PARTE 5: LOG DE CORREÇÃO
-- ================================================

DO $$
DECLARE
  total_users integer;
  synced_profiles integer;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO synced_profiles FROM public.profiles;
  
  RAISE NOTICE '===== CORREÇÃO COMPLETA =====';
  RAISE NOTICE 'Total de usuários no Auth: %', total_users;
  RAISE NOTICE 'Total de profiles sincronizados: %', synced_profiles;
  RAISE NOTICE 'Trigger criado: on_auth_user_created';
  RAISE NOTICE 'RLS habilitado: public.profiles';
  RAISE NOTICE '===========================';
END $$;

-- ============================================
-- INSTRUÇÕES PARA EXECUTAR
-- ================================================
-- 1. Execute este script no Supabase SQL Editor
-- 2. O trigger vai criar profiles automaticamente para novos usuários
-- 3. Usuários existentes serão sincronizados automaticamente
-- 4. Teste o login novamente