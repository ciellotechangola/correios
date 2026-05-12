-- ============================================
-- SCRIPT CORREÇÃO FINAL v3 - CORREIOS DE LUANDA
-- Data: 2026-05-09
-- CORRIGIDO: Removidas tabelas inexistentes
-- Execute NO SUPABASE > SQL EDITOR
-- ============================================

-- ============================================
-- PASSO 1: DESABILITAR RLS APENAS EM TABELAS EXISTENTES
-- ============================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.contactos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotas_historico DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas_veiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_veiculos DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 2: CRIAR FUNÇÃO update_location (CRÍTICA)
-- ============================================

DROP FUNCTION IF EXISTS public.update_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT);

CREATE OR REPLACE FUNCTION public.update_location(
  p_user_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_tipo_localizacao TEXT DEFAULT 'CLIENTE'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar coordenadas na tabela profiles
  UPDATE public.profiles
  SET 
    lat = p_latitude,
    lng = p_longitude,
    ultima_localizacao_at = NOW(),
    is_online = true
  WHERE id = p_user_id;
  
  -- Inserir/atualizar em localizacoes_tempo_real
  INSERT INTO public.localizacoes_tempo_real (
    profile_id, latitude, longitude, tipo, is_online, updated_at
  )
  VALUES (p_user_id, p_latitude, p_longitude, p_tipo_localizacao, true, NOW())
  ON CONFLICT (profile_id) 
  DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    tipo = COALESCE(EXCLUDED.tipo, localizacoes_tempo_real.tipo),
    is_online = true,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN undefined_table THEN
    RETURN FALSE;
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- ============================================
-- PASSO 3: CRIAR FUNÇÃO marcar_offline
-- ============================================

DROP FUNCTION IF EXISTS public.marcar_offline(UUID);

CREATE OR REPLACE FUNCTION public.marcar_offline(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET is_online = false WHERE id = p_user_id;
  UPDATE public.localizacoes_tempo_real SET is_online = false WHERE profile_id = p_user_id;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$;

-- ============================================
-- PASSO 4: CRIAR FUNÇÃO buscar_proximos
-- ============================================

DROP FUNCTION IF EXISTS public.buscar_proximos(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.buscar_proximos(
  p_referencia_lat DOUBLE PRECISION,
  p_referencia_lng DOUBLE PRECISION,
  p_raio_km DOUBLE PRECISION DEFAULT 10,
  p_perfil TEXT DEFAULT NULL,
  p_provincia TEXT DEFAULT NULL
)
RETURNS SETOF localizacoes_tempo_real
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.localizacoes_tempo_real ltr
  WHERE ltr.is_online = true
    AND ltr.latitude IS NOT NULL
    AND ltr.longitude IS NOT NULL
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0, 
          cos(radians(p_referencia_lat)) * cos(radians(ltr.latitude)) *
          cos(radians(ltr.longitude) - radians(p_referencia_lng)) +
          sin(radians(p_referencia_lat)) * sin(radians(ltr.latitude))
        ))
      )
    ) <= p_raio_km
    AND (p_perfil IS NULL OR ltr.tipo = p_perfil)
    AND (p_provincia IS NULL OR ltr.provincia = p_provincia);
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

-- ============================================
-- PASSO 5: CRIAR FUNÇÃO buscar_clientes_para_vendedor
-- ============================================

DROP FUNCTION IF EXISTS public.buscar_clientes_para_vendedor(UUID, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION public.buscar_clientes_para_vendedor(
  p_vendedor_id UUID,
  p_raio_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  profile_id UUID,
  nome TEXT,
  telefone TEXT,
  avatar_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distancia_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja_lat DOUBLE PRECISION;
  v_loja_lng DOUBLE PRECISION;
BEGIN
  SELECT COALESCE(latitude, lat), COALESCE(longitude, lng) INTO v_loja_lat, v_loja_lng
  FROM public.lojas
  WHERE owner_id = p_vendedor_id
  LIMIT 1;
  
  IF v_loja_lat IS NULL THEN
    v_loja_lat := -8.839988;
    v_loja_lng := 13.289437;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    COALESCE(p.nome, split_part(p.email, '@', 1)) as nome,
    p.telefone,
    p.avatar_url,
    ltr.latitude,
    ltr.longitude,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(v_loja_lat)) * cos(radians(ltr.latitude)) *
        cos(radians(ltr.longitude) - radians(v_loja_lng)) +
        sin(radians(v_loja_lat)) * sin(radians(ltr.latitude))
      ))
    ))::DOUBLE PRECISION as distancia_km
  FROM public.profiles p
  INNER JOIN public.localizacoes_tempo_real ltr ON p.id = ltr.profile_id
  WHERE p.role = 'CLIENTE'
    AND p.is_online = true
    AND ltr.latitude IS NOT NULL
    AND ltr.longitude IS NOT NULL
  ORDER BY distancia_km ASC
  LIMIT 50;
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

-- ============================================
-- PASSO 6: CRIAR FUNÇÃO atualizar_status_pedido
-- ============================================

DROP FUNCTION IF EXISTS public.atualizar_status_pedido(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.atualizar_status_pedido(
  p_pedido_id UUID,
  p_novo_status TEXT,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_novo_status NOT IN ('PENDENTE', 'PAGO', 'PREPARANDO', 'PRONTO_PARA_RETIRADA', 'EM_ROTA', 'ENTREGUE', 'CANCELADO') THEN
    RETURN '{"success": false, "error": "Status inválido"}'::json;
  END IF;
  
  UPDATE public.pedidos
  SET status = p_novo_status, updated_at = NOW()
  WHERE id = p_pedido_id;
  
  RETURN json_build_object('success', true, 'pedido_id', p_pedido_id, 'status', p_novo_status);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- PASSO 7: CRIAR FUNÇÕES DE TRACKING
-- ============================================

DROP FUNCTION IF EXISTS public.get_dados_tracking_mapa(UUID);

CREATE OR REPLACE FUNCTION public.get_dados_tracking_mapa(p_pedido_id UUID)
RETURNS TABLE (
  tipo TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  registro_timestamp TIMESTAMPTZ,
  profile_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'ROTA' as tipo,
    rh.latitude,
    rh.longitude,
    rh.recorded_at as registro_timestamp,
    rh.profile_id
  FROM public.rotas_historico rh
  WHERE rh.pedido_id = p_pedido_id;
  
  RETURN QUERY
  SELECT 
    'LOCALIZACAO' as tipo,
    ltr.latitude,
    ltr.longitude,
    ltr.updated_at as registro_timestamp,
    ltr.profile_id
  FROM public.localizacoes_tempo_real ltr
  WHERE ltr.pedido_id = p_pedido_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

DROP FUNCTION IF EXISTS public.get_tracking_pedido(UUID);

CREATE OR REPLACE FUNCTION public.get_tracking_pedido(p_pedido_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido JSON;
BEGIN
  SELECT json_build_object(
    'pedido', (SELECT row_to_json(p.*) FROM public.pedidos p WHERE p.id = p_pedido_id),
    'entrega', (SELECT row_to_json(e.*) FROM public.entregas e WHERE e.pedido_id = p_pedido_id)
  ) INTO v_pedido;
  
  RETURN v_pedido;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '{"error": "erro"}'::json;
END;
$$;

-- ============================================
-- PASSO 8: SINCRONIZAR USUÁRIOS DE auth.users
-- ============================================

DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, created_at, 
           COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1)) as nome,
           COALESCE(raw_user_meta_data->>'telefone', '') as telefone,
           COALESCE(raw_user_meta_data->>'role', 'CLIENTE') as role
    FROM auth.users
  LOOP
    INSERT INTO public.profiles (
      id, email, nome, role, status_conta, is_online, 
      provincia, created_at
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      auth_user.nome,
      auth_user.role,
      'ATIVO',
      true,
      'Luanda',
      auth_user.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
      nome = COALESCE(EXCLUDED.nome, public.profiles.nome),
      role = COALESCE(EXCLUDED.role, public.profiles.role),
      is_online = true;
  END LOOP;
END;
$$;

-- ============================================
-- PASSO 9: CRIAR LOJAS PARA VENDEDORES SEM LOJA
-- ============================================

DO $$
DECLARE
  vendedor RECORD;
  v_loja_id UUID;
BEGIN
  FOR vendedor IN 
    SELECT id, nome FROM public.profiles WHERE role = 'VENDEDOR'
  LOOP
    SELECT id INTO v_loja_id FROM public.lojas WHERE owner_id = vendedor.id LIMIT 1;
    
    IF v_loja_id IS NULL THEN
      INSERT INTO public.lojas (
        owner_id, nome, descricao, telefone, endereco, 
        latitude, longitude, nicho, is_open, provincia, cidade, 
        bairro, lat, lng, created_at
      )
      VALUES (
        vendedor.id,
        COALESCE(vendedor.nome, 'Minha Loja') || ' - Auto Peças',
        'Loja de auto peças e acessórios automotivos',
        '+244 900 000 000',
        'Talatona, Luanda',
        -8.839988, 13.289437,
        'Universal', true,
        'Luanda', 'Luanda', 'Talatona',
        -8.839988, 13.289437,
        NOW()
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- PASSO 10: VERIFICAÇÃO FINAL
-- ============================================

SELECT 'profiles' as tabela, count(*) as total FROM public.profiles
UNION ALL 
SELECT 'lojas', count(*) FROM public.lojas WHERE deleted_at IS NULL
UNION ALL 
SELECT 'produtos', count(*) FROM public.produtos WHERE deleted_at IS NULL;

-- Verificar funções RPC
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'update_location', 'marcar_offline', 'buscar_proximos', 
  'buscar_clientes_para_vendedor', 'atualizar_status_pedido',
  'get_dados_tracking_mapa', 'get_tracking_pedido'
);

-- ============================================
-- FIM DO SCRIPT
-- ============================================