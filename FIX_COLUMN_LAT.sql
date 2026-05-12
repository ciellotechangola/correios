-- ============================================
-- SCRIPT DE CORREÇÃO COMPLETO
-- Execute TODAS as partes abaixo
-- ============================================

-- ============================================
-- PARTE 1: Verificar estrutura da tabela lojas
-- ============================================

-- Execute esta query primeiro para ver as colunas existentes:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lojas';

-- ============================================
-- PARTE 2: Adicionar TODAS as colunas de localização necessárias
-- ============================================

DO $$
BEGIN
    -- Colunas para tabela lojas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lojas' AND column_name = 'latitude') THEN
        ALTER TABLE public.lojas ADD COLUMN latitude numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lojas' AND column_name = 'longitude') THEN
        ALTER TABLE public.lojas ADD COLUMN longitude numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lojas' AND column_name = 'lat') THEN
        ALTER TABLE public.lojas ADD COLUMN lat numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lojas' AND column_name = 'lng') THEN
        ALTER TABLE public.lojas ADD COLUMN lng numeric;
    END IF;
    
    -- Colunas para tabela profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'latitude') THEN
        ALTER TABLE public.profiles ADD COLUMN latitude numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'longitude') THEN
        ALTER TABLE public.profiles ADD COLUMN longitude numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lat') THEN
        ALTER TABLE public.profiles ADD COLUMN lat numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lng') THEN
        ALTER TABLE public.profiles ADD COLUMN lng numeric;
    END IF;
END $$;

-- ============================================
-- PARTE 3: Sincronizar dados (agora com coordenadas padrão)
-- ============================================

-- Para lojas, usar valores padrão se não houver dados
UPDATE public.lojas 
SET 
    lat = COALESCE(lat, -8.839988),
    lng = COALESCE(lng, 13.289437),
    latitude = COALESCE(latitude, lat, -8.839988),
    longitude = COALESCE(longitude, lng, 13.289437);

-- Para profiles
UPDATE public.profiles 
SET 
    lat = COALESCE(lat, latitude),
    lng = COALESCE(lng, longitude);

-- Se latitude ainda for null, copiar de lat
UPDATE public.profiles SET latitude = lat WHERE latitude IS NULL AND lat IS NOT NULL;
UPDATE public.profiles SET longitude = lng WHERE longitude IS NULL AND lng IS NOT NULL;

-- ============================================
-- PARTE 4: Recriar a function criar_pedido_com_localizacao
-- ============================================

CREATE OR REPLACE FUNCTION public.criar_pedido_com_localizacao(
    p_user_id uuid,
    p_loja_id uuid,
    p_valor_total numeric,
    p_tipo_entrega text DEFAULT 'RETIRADA',
    p_endereco_entrega text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cliente_id uuid;
    v_codigo_rastreamento text;
    v_pedido_id uuid;
BEGIN
    SELECT id INTO v_cliente_id 
    FROM public.profiles 
    WHERE id = p_user_id;
    
    IF v_cliente_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cliente nao encontrado');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id = p_loja_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Loja nao encontrada');
    END IF;
    
    v_codigo_rastreamento := 'CL' || upper(substring(md5(random()::text), 1, 8));
    
    INSERT INTO public.pedidos (
        id, cliente_id, loja_id, valor_total, tipo_entrega, 
        endereco_entrega, status, codigo_rastreamento,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_cliente_id, p_loja_id, p_valor_total, p_tipo_entrega,
        p_endereco_entrega, 'PENDENTE', v_codigo_rastreamento,
        NOW(), NOW()
    ) RETURNING id INTO v_pedido_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'pedido_id', v_pedido_id,
        'codigo_rastreamento', v_codigo_rastreamento
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- PARTE 5: Recriar a function update_location
-- ============================================

CREATE OR REPLACE FUNCTION public.update_location(
    p_user_id uuid,
    p_latitude numeric,
    p_longitude numeric,
    p_tipo_localizacao text DEFAULT 'MOBILE'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.localizacoes_tempo_real
    SET latitude = p_latitude, longitude = p_longitude,
        tipo_localizacao = p_tipo_localizacao, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO public.localizacoes_tempo_real (
            id, user_id, latitude, longitude, tipo_localizacao, is_online, updated_at
        ) VALUES (gen_random_uuid(), p_user_id, p_latitude, p_longitude, p_tipo_localizacao, true, NOW());
    END IF;
    
    UPDATE public.profiles
    SET latitude = p_latitude, longitude = p_longitude, updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- ============================================
-- PARTE 6: Recriar buscar_proximos
-- ============================================

CREATE OR REPLACE FUNCTION public.buscar_proximos(
    p_referencia_lat numeric,
    p_referencia_lng numeric,
    p_raio_km numeric DEFAULT 10,
    p_perfil text DEFAULT NULL,
    p_provincia text DEFAULT NULL
)
RETURNS TABLE(
    id uuid, user_id uuid, nome text, latitude numeric, longitude numeric,
    perfil text, is_online boolean, distancia_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id, l.user_id, COALESCE(p.nome, 'Usuario'),
        COALESCE(l.latitude, l.lat) as latitude,
        COALESCE(l.longitude, l.lng) as longitude,
        l.perfil, l.is_online,
        (6371 * acos(
            cos(radians(p_referencia_lat)) * cos(radians(COALESCE(l.latitude, l.lat))) * 
            cos(radians(COALESCE(l.longitude, l.lng)) - radians(p_referencia_lng)) + 
            sin(radians(p_referencia_lat)) * sin(radians(COALESCE(l.latitude, l.lat)))
        ))::numeric(10,2) as distancia_km
    FROM localizacoes_tempo_real l
    LEFT JOIN profiles p ON p.id = l.user_id
    WHERE l.is_online = true
    AND (COALESCE(l.latitude, l.lat) IS NOT NULL)
    AND (6371 * acos(
        cos(radians(p_referencia_lat)) * cos(radians(COALESCE(l.latitude, l.lat))) * 
        cos(radians(COALESCE(l.longitude, l.lng)) - radians(p_referencia_lng)) + 
        sin(radians(p_referencia_lat)) * sin(radians(COALESCE(l.latitude, l.lat)))
    )) <= p_raio_km
    AND (p_perfil IS NULL OR l.perfil = p_perfil)
    ORDER BY distancia_km ASC;
END;
$$;