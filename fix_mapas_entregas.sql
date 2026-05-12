-- ==========================================
-- CORREÇÃO MAPAS E ENTREGAS EM TEMPO REAL
-- ==========================================
-- Problemas corrigidos:
-- 1. Erro "Cannot coerce result to single JSON" - queries retornando múltiplos resultados
-- 2. Fluxo entrega incompleto - adicionar status e tracking
-- 3. Entregador sem tracking GPS - atualizar localizacoes_tempo_real
-- 4. Mapa não atualiza em tempo real - melhorar realtime subscriptions
-- 5. Sistema só funciona cliente→loja - implementar loja→cliente

-- ==========================================
-- 1. CORRIGIR TABELA entregas (adicionar campos faltantes)
-- ==========================================

-- Adicionar coluna updated_at se não existir
ALTER TABLE public.entregas 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc', now());

-- Adicionar coluna aceite_em para tracking de quando entregador aceitou
ALTER TABLE public.entregas 
ADD COLUMN IF NOT EXISTS aceite_em timestamp with time zone;

-- Adicionar coluna concluida_em para tracking de conclusão
ALTER TABLE public.entregas 
ADD COLUMN IF NOT EXISTS concluida_em timestamp with time zone;

-- Criar índice para buscas por status
CREATE INDEX IF NOT EXISTS idx_entregas_status_updated 
ON public.entregas(status, updated_at DESC);

-- ==========================================
-- 2. CORRIGIR TABELA localizacoes_tempo_real
-- ==========================================

-- Garantir que tabela tenha todos os campos necessários
ALTER TABLE public.localizacoes_tempo_real 
ADD COLUMN IF NOT EXISTS velocidade numeric DEFAULT 0;

ALTER TABLE public.localizacoes_tempo_real 
ADD COLUMN IF NOT EXISTS precisao numeric DEFAULT 10;

-- Criar índice composto para queries de tracking por pedido
CREATE INDEX IF NOT EXISTS idx_localizacoes_pedido_online 
ON public.localizacoes_tempo_real(pedido_id, is_online DESC, updated_at DESC);

-- ==========================================
-- 3. FUNÇÃO: Atualizar localização com histórico
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_location_with_history(
  p_user_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_tipo text DEFAULT 'CLIENTE',
  p_pedido_id uuid DEFAULT NULL,
  p_velocidade numeric DEFAULT 0,
  p_precisao numeric DEFAULT 10
) RETURNS boolean AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Validar coordenadas
  IF p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180 THEN
    RETURN false;
  END IF;

  -- Upsert na tabela localizacoes_tempo_real
  INSERT INTO public.localizacoes_tempo_real (
    profile_id,
    latitude,
    longitude,
    tipo,
    pedido_id,
    velocidade,
    precisao,
    is_online,
    updated_at
  ) VALUES (
    p_user_id,
    p_latitude,
    p_longitude,
    upper(p_tipo),
    p_pedido_id,
    p_velocidade,
    p_precisao,
    true,
    timezone('utc', now())
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    tipo = EXCLUDED.tipo,
    pedido_id = COALESCE(EXCLUDED.pedido_id, localizacoes_tempo_real.pedido_id),
    velocidade = EXCLUDED.velocidade,
    precisao = EXCLUDED.precisao,
    is_online = true,
    updated_at = timezone('utc', now());

  -- Também atualizar profiles
  UPDATE public.profiles SET
    lat = p_latitude,
    lng = p_longitude,
    ultima_localizacao_at = timezone('utc', now()),
    is_online = true
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. FUNÇÃO: Aceitar entrega (entregador)
-- ==========================================
CREATE OR REPLACE FUNCTION public.aceitar_entrega(
  p_entrega_id uuid,
  p_entregador_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_entrega record;
  v_result jsonb;
BEGIN
  -- Buscar entrega
  SELECT * INTO v_entrega
  FROM public.entregas
  WHERE id = p_entrega_id
    AND status = 'AGUARDANDO';

  IF v_entrega IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Entrega não disponível ou já aceita'
    );
  END IF;

  -- Atualizar entrega
  UPDATE public.entregas SET
    entregador_id = p_entregador_id,
    status = 'A_CAMINHO',
    aceite_em = timezone('utc', now()),
    updated_at = timezone('utc', now())
  WHERE id = p_entrega_id
  RETURNING * INTO v_entrega;

  -- Atualizar pedido
  UPDATE public.pedidos SET
    status = 'EM_ROTA',
    entregador_id = p_entregador_id,
    updated_at = timezone('utc', now())
  WHERE id = v_entrega.pedido_id;

  -- Registrar localização inicial do entregador
  UPDATE public.localizacoes_tempo_real SET
    pedido_id = v_entrega.pedido_id,
    is_online = true,
    updated_at = timezone('utc', now())
  WHERE profile_id = p_entregador_id;

  RETURN jsonb_build_object(
    'success', true,
    'entrega', row_to_json(v_entrega)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. FUNÇÃO: Completar entrega
-- ==========================================
CREATE OR REPLACE FUNCTION public.completar_entrega(
  p_entrega_id uuid,
  p_entregador_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_entrega record;
BEGIN
  -- Buscar entrega
  SELECT * INTO v_entrega
  FROM public.entregas
  WHERE id = p_entrega_id
    AND entregador_id = p_entregador_id
    AND status = 'A_CAMINHO';

  IF v_entrega IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Entrega não encontrada ou não pertence a este entregador'
    );
  END IF;

  -- Atualizar entrega
  UPDATE public.entregas SET
    status = 'ENTREGUE',
    concluida_em = timezone('utc', now()),
    updated_at = timezone('utc', now())
  WHERE id = p_entrega_id
  RETURNING * INTO v_entrega;

  -- Atualizar pedido
  UPDATE public.pedidos SET
    status = 'ENTREGUE',
    updated_at = timezone('utc', now())
  WHERE id = v_entrega.pedido_id;

  -- Marcar entregador como offline do pedido
  UPDATE public.localizacoes_tempo_real SET
    pedido_id = NULL,
    updated_at = timezone('utc', now())
  WHERE profile_id = p_entregador_id;

  RETURN jsonb_build_object(
    'success', true,
    'entrega', row_to_json(v_entrega)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. FUNÇÃO: Buscar tracking completo do pedido
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_tracking_pedido_completo(
  p_pedido_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_pedido record;
  v_entrega record;
  v_loja record;
  v_cliente record;
  v_entregador record;
  v_result jsonb;
BEGIN
  -- Buscar pedido
  SELECT * INTO v_pedido
  FROM public.pedidos
  WHERE id = p_pedido_id;

  IF v_pedido IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;

  -- Buscar entrega
  SELECT * INTO v_entrega
  FROM public.entregas
  WHERE pedido_id = p_pedido_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Buscar loja
  SELECT * INTO v_loja
  FROM public.lojas
  WHERE id = v_pedido.loja_id;

  -- Buscar cliente
  SELECT id, nome, telefone, avatar_url, lat, lng INTO v_cliente
  FROM public.profiles
  WHERE id = v_pedido.cliente_id;

  -- Buscar entregador (se existir)
  IF v_entrega.entregador_id IS NOT NULL THEN
    SELECT id, nome, telefone, avatar_url, lat, lng INTO v_entregador
    FROM public.profiles
    WHERE id = v_entrega.entregador_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'pedido', jsonb_build_object(
      'id', v_pedido.id,
      'status', v_pedido.status,
      'tipo_entrega', v_pedido.tipo_entrega,
      'created_at', v_pedido.created_at
    ),
    'loja', CASE WHEN v_loja IS NOT NULL THEN jsonb_build_object(
      'id', v_loja.id,
      'nome', v_loja.nome,
      'lat', v_loja.latitude,
      'lng', v_loja.longitude,
      'endereco', v_loja.endereco
    ) ELSE NULL END,
    'cliente', CASE WHEN v_cliente IS NOT NULL THEN jsonb_build_object(
      'id', v_cliente.id,
      'nome', v_cliente.nome,
      'telefone', v_cliente.telefone,
      'avatar_url', v_cliente.avatar_url,
      'lat', v_cliente.lat,
      'lng', v_cliente.lng
    ) ELSE NULL END,
    'entregador', CASE WHEN v_entregador IS NOT NULL THEN jsonb_build_object(
      'id', v_entregador.id,
      'nome', v_entregador.nome,
      'telefone', v_entregador.telefone,
      'avatar_url', v_entregador.avatar_url,
      'lat', v_entregador.lat,
      'lng', v_entregador.lng
    ) ELSE NULL END,
    'entrega', CASE WHEN v_entrega IS NOT NULL THEN jsonb_build_object(
      'id', v_entrega.id,
      'status', v_entrega.status,
      'entregador_id', v_entrega.entregador_id,
      'aceite_em', v_entrega.aceite_em,
      'concluida_em', v_entrega.concluida_em
    ) ELSE NULL END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 7. FUNÇÃO: Buscar entregas disponíveis para entregador
-- ==========================================
CREATE OR REPLACE FUNCTION public.buscar_entregas_disponiveis(
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_raio_km numeric DEFAULT 50
) RETURNS TABLE (
  entrega_id uuid,
  pedido_id uuid,
  loja_nome text,
  loja_lat double precision,
  loja_lng double precision,
  cliente_bairro text,
  valor_total numeric,
  distancia numeric,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as entrega_id,
    e.pedido_id,
    l.nome as loja_nome,
    l.latitude as loja_lat,
    l.longitude as loja_lng,
    c.bairro as cliente_bairro,
    p.valor_total,
    CASE 
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL THEN
        6371 * acos(cos(radians(p_lat)) * cos(radians(l.latitude)) * cos(radians(l.longitude) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(l.latitude)))
      ELSE NULL
    END as distancia,
    e.created_at
  FROM public.entregas e
  JOIN public.pedidos p ON p.id = e.pedido_id
  JOIN public.lojas l ON l.id = p.loja_id
  JOIN public.profiles c ON c.id = p.cliente_id
  WHERE e.status = 'AGUARDANDO'
    AND e.entregador_id IS NULL
    AND (
      p_lat IS NULL OR p_lng IS NULL OR
      (l.latitude IS NOT NULL AND l.longitude IS NOT NULL AND
        6371 * acos(cos(radians(p_lat)) * cos(radians(l.latitude)) * cos(radians(l.longitude) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(l.latitude))) <= p_raio_km)
    )
  ORDER BY e.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 8. GRANT DE PERMISSÕES
-- ==========================================
GRANT EXECUTE ON FUNCTION public.update_location_with_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_entrega TO authenticated;
GRANT EXECUTE ON FUNCTION public.completar_entrega TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tracking_pedido_completo TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_entregas_disponiveis TO authenticated;

-- ==========================================
-- 9. POLÍTICAS RLS PARA localizacoes_tempo_real
-- ==========================================
DROP POLICY IF EXISTS "public_read_localizacoes" ON public.localizacoes_tempo_real;
CREATE POLICY "public_read_localizacoes" ON public.localizacoes_tempo_real
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "user_update_own_location" ON public.localizacoes_tempo_real;
CREATE POLICY "user_update_own_location" ON public.localizacoes_tempo_real
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ==========================================
-- 10. POLÍTICAS RLS PARA entregas
-- ==========================================
DROP POLICY IF EXISTS "read_entregas" ON public.entregas;
CREATE POLICY "read_entregas" ON public.entregas
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT cliente_id FROM public.pedidos WHERE id = pedido_id
    ) OR
    auth.uid() = entregador_id OR
    auth.uid() IN (
      SELECT owner_id FROM public.lojas WHERE id IN (
        SELECT loja_id FROM public.pedidos WHERE id = pedido_id
      )
    )
  );

DROP POLICY IF EXISTS "update_entregas" ON public.entregas;
CREATE POLICY "update_entregas" ON public.entregas
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = entregador_id)
  WITH CHECK (auth.uid() = entregador_id);

NOTIFY pgrst, 'reload schema';
