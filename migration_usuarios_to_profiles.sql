-- ============================================
-- MIGRAÇÃO: Unificar tabela usuarios -> profiles
-- ============================================
-- Objetivo: Consolidar perfis de usuário em única tabela 'profiles'
-- Data: 2026-05-10
-- ============================================

-- ============================================
-- 1. CRIAR TABELA profiles (se não existir)
-- ============================================

-- Verificar se tabela profiles já existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text NOT NULL UNIQUE,
      role text NOT NULL DEFAULT 'CLIENTE' CHECK (role IN ('CLIENTE', 'VENDEDOR', 'ENTREGADOR', 'ADMIN_MASTER')),
      status_conta text NOT NULL DEFAULT 'ATIVO' CHECK (status_conta IN ('ATIVO', 'SUSPENSO', 'BANIDO')),
      nome text,
      telefone text,
      created_at timestamp with time zone DEFAULT timezone('utc', now()),
      updated_at timestamp with time zone DEFAULT timezone('utc', now()),
      avatar_url text,
      provincia text,
      cidade text,
      bairro text,
      lat double precision,
      lng double precision,
      is_online boolean DEFAULT false,
      ultima_localizacao_at timestamp with time zone,
      deleted_at timestamp with time zone
    );
    
    -- Criar índices
    CREATE INDEX idx_profiles_email ON public.profiles(email);
    CREATE INDEX idx_profiles_role ON public.profiles(role);
    CREATE INDEX idx_profiles_is_online ON public.profiles(is_online) WHERE deleted_at IS NULL;
    CREATE INDEX idx_profiles_created ON public.profiles(created_at DESC);
    
    RAISE NOTICE 'Tabela profiles criada com sucesso';
  ELSE
    RAISE NOTICE 'Tabela profiles já existe';
  END IF;
END $$;

-- ============================================
-- 2. MIGRAR DADOS DE usuarios PARA profiles
-- ============================================

-- Migrar dados existentes (apenas se houver dados na tabela usuarios)
INSERT INTO public.profiles (
  id, email, role, status_conta, nome, telefone, 
  created_at, avatar_url, provincia, cidade, bairro, 
  lat, lng, is_online, ultima_localizacao_at, deleted_at
)
SELECT 
  id, email, role, status_conta, nome, telefone,
  created_at, avatar_url, provincia, cidade, bairro,
  lat, lng, is_online, ultima_localizacao_at, deleted_at
FROM public.usuarios
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = public.usuarios.id
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status_conta = EXCLUDED.status_conta,
  nome = COALESCE(profiles.nome, EXCLUDED.nome),
  telefone = COALESCE(profiles.telefone, EXCLUDED.telefone),
  avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
  provincia = COALESCE(profiles.provincia, EXCLUDED.provincia),
  cidade = COALESCE(profiles.cidade, EXCLUDED.cidade),
  bairro = COALESCE(profiles.bairro, EXCLUDED.bairro),
  lat = COALESCE(profiles.lat, EXCLUDED.lat),
  lng = COALESCE(profiles.lng, EXCLUDED.lng),
  is_online = EXCLUDED.is_online,
  ultima_localizacao_at = COALESCE(profiles.ultima_localizacao_at, EXCLUDED.ultima_localizacao_at),
  updated_at = timezone('utc', now());

-- ============================================
-- 3. ATUALIZAR TRIGGER DE SYNC COM AUTH.USERS
-- ============================================

-- Drop trigger existente se houver
DROP TRIGGER IF EXISTS sync_profiles_insert ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Criar função para criar profile automaticamente quando usuário é criado no auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    nome,
    telefone,
    avatar_url,
    provincia,
    cidade,
    is_online,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENTE'),
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provincia',
    NEW.raw_user_meta_data->>'cidade',
    true,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER sync_profiles_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. ATUALIZAR FUNÇÕES RPC PARA USAR profiles
-- ============================================

-- Atualizar função update_location
CREATE OR REPLACE FUNCTION public.update_location(
  p_user_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_tipo_localizacao text DEFAULT 'MOBILE'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar/inserir em localizacoes_tempo_real
  INSERT INTO public.localizacoes_tempo_real (user_id, latitude, longitude, tipo_localizacao, is_online, updated_at)
  VALUES (p_user_id, p_latitude, p_longitude, p_tipo_localizacao, true, timezone('utc', now()))
  ON CONFLICT (user_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    tipo_localizacao = EXCLUDED.tipo_localizacao,
    updated_at = EXCLUDED.updated_at,
    is_online = true;
  
  -- Atualizar lat/lng na tabela profiles (não usuarios)
  UPDATE public.profiles
  SET lat = p_latitude, 
      lng = p_longitude, 
      is_online = true, 
      ultima_localizacao_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- Atualizar função buscar_proximos
CREATE OR REPLACE FUNCTION public.buscar_proximos(
  p_referencia_lat double precision,
  p_referencia_lng double precision,
  p_raio_km double precision DEFAULT 10,
  p_perfil text DEFAULT NULL,
  p_provincia text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  nome text,
  distancia_km double precision,
  is_online boolean,
  perfil text,
  latitude double precision,
  longitude double precision,
  provincia text,
  cidade text,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    COALESCE(p.nome, split_part(p.email, '@', 1)) as nome,
    public.calcular_distancia(p_referencia_lat, p_referencia_lng, COALESCE(p.lat, 0), COALESCE(p.lng, 0)) as distancia_km,
    p.is_online,
    p.role as perfil,
    COALESCE(p.lat, 0) as latitude,
    COALESCE(p.lng, 0) as longitude,
    p.provincia,
    p.cidade,
    p.ultima_localizacao_at as updated_at
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND p.is_online = true
    AND p.role = COALESCE(p_perfil, p.role)
    AND (p_provincia IS NULL OR p.provincia = p_provincia)
    AND public.calcular_distancia(p_referencia_lat, p_referencia_lng, COALESCE(p.lat, 0), COALESCE(p.lng, 0)) <= p_raio_km
  ORDER BY public.calcular_distancia(p_referencia_lat, p_referencia_lng, COALESCE(p.lat, 0), COALESCE(p.lng, 0));
END;
$$;

-- Atualizar função marcar_offline
CREATE OR REPLACE FUNCTION public.marcar_offline(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles SET is_online = false, updated_at = timezone('utc', now()) WHERE id = p_user_id;
  UPDATE public.localizacoes_tempo_real SET is_online = false WHERE user_id = p_user_id;
  RETURN true;
END;
$$;

-- ============================================
-- 5. ATUALIZAR CHAVES ESTRANGEIRAS
-- ============================================

-- Atualizar referências nas tabelas que usam usuarios
-- Nota: Mantemos compatibilidade retroativa criando VIEW

-- Criar VIEW 'usuarios' para compatibilidade com código legado
CREATE OR REPLACE VIEW public.usuarios AS
SELECT 
  id, email, role, status_conta, nome, telefone,
  created_at, updated_at, avatar_url, provincia, cidade, bairro,
  lat, lng, is_online, ultima_localizacao_at, deleted_at
FROM public.profiles;

-- ============================================
-- 6. CONFIGURAR RLS (Row Level Security)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop políticas existentes se houver
DROP POLICY IF EXISTS "public_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "owner_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "owner_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;

-- Política: Leitura pública de perfis básicos
CREATE POLICY "public_read_profiles" ON public.profiles
  FOR SELECT
  USING (
    deleted_at IS NULL 
    AND status_conta = 'ATIVO'
  );

-- Política: Usuário pode ler seu próprio perfil completo
CREATE POLICY "owner_read_profiles" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Usuário pode atualizar seu próprio perfil
CREATE POLICY "owner_update_profiles" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Política: Admin pode fazer tudo
CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'ADMIN_MASTER'
    )
  );

-- Política: Insert apenas pelo trigger (não permitir insert direto)
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 7. TRIGGER PARA AUDIT LOG EM profiles
-- ============================================

DROP TRIGGER IF EXISTS trigger_audit_profiles ON public.profiles;

CREATE TRIGGER trigger_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================
-- 8. TRIGGER PARA ATUALIZAR updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 9. RESUMO DA MIGRAÇÃO
-- ============================================

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.profiles;
  RAISE NOTICE '✅ Migração concluída! Total de perfis: %', v_count;
  RAISE NOTICE '📝 A VIEW "usuarios" foi criada para compatibilidade com código legado';
  RAISE NOTICE '🔒 RLS configurado na tabela profiles';
  RAISE NOTICE '⚡ Triggers de sync e audit configurados';
END $$;
